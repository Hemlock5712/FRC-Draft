import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Create a new draft room
export const createDraftRoom = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    maxTeams: v.number(),
    pickTimeSeconds: v.number(),
    snakeFormat: v.boolean(),
    privacy: v.union(v.literal("PUBLIC"), v.literal("PRIVATE")),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.name) {
      throw new Error("Room name is required");
    }

    if (args.maxTeams < 2 || args.maxTeams > 32) {
      throw new Error("Maximum teams must be between 2 and 32");
    }

    if (args.pickTimeSeconds < 30 || args.pickTimeSeconds > 300) {
      throw new Error("Pick time must be between 30 and 300 seconds");
    }

    // Create the draft room
    const now = new Date().toISOString();
    const draftRoomId = await ctx.db.insert("draftRooms", {
      name: args.name,
      description: args.description,
      maxTeams: args.maxTeams,
      pickTimeSeconds: args.pickTimeSeconds,
      snakeFormat: args.snakeFormat,
      privacy: args.privacy || "PUBLIC", // Default to PUBLIC if not specified
      createdBy: args.userId,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
      nextPickOrder: 2, // Initialize to 2 since creator will be 1
    });

    // Add creator as first participant
    await ctx.db.insert("draftParticipants", {
      userId: args.userId,
      draftRoomId: draftRoomId,
      pickOrder: 1, // Creator is always first
      isReady: true, // Creator is automatically ready
      createdAt: now,
      updatedAt: now,
    });

    return draftRoomId;
  },
});

// List all draft rooms the user is part of
export const listUserDraftRooms = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get rooms where user is creator
    const createdRooms = await ctx.db.query("draftRooms")
      .filter(q => q.eq(q.field("createdBy"), args.userId))
      .collect();
    
    // Get rooms where user is a participant
    const participations = await ctx.db.query("draftParticipants")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();
    
    const participatedRoomIds = participations.map(p => p.draftRoomId);
    
    // Get the full details of participated rooms
    const participatedRooms = [];
    for (const roomId of participatedRoomIds) {
      const room = await ctx.db.get(roomId as Id<"draftRooms">);
      if (room) participatedRooms.push(room);
    }
    
    // Combine both sets of rooms, filtering out duplicates
    const allRoomIds = new Set();
    const activeRooms = [];
    
    for (const room of [...createdRooms, ...participatedRooms]) {
      if (!allRoomIds.has(room._id)) {
        allRoomIds.add(room._id);
        
        // Get participants for this room
        const participants = await ctx.db.query("draftParticipants")
          .withIndex("by_draft_room", q => q.eq("draftRoomId", room._id))
          .collect();
        
        // Get picks for this room
        const picks = await ctx.db.query("draftPicks")
          .withIndex("by_draft_room", q => q.eq("draftRoomId", room._id))
          .collect();
        
        // Get creator info
        const creator = await ctx.db.query("users")
          .filter(q => q.eq(q.field("_id"), room.createdBy))
          .first();
        
        activeRooms.push({
          ...room,
          id: room._id, // Add id property for frontend compatibility
          DraftParticipant: participants,
          _count: {
            DraftPick: picks.length,
            DraftParticipant: participants.length
          },
          creator: creator || { name: "Unknown", email: "unknown" }
        });
      }
    }
    
    return { activeRooms };
  },
});

// List public draft rooms that user can join
export const listPublicDraftRooms = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Find all public, pending draft rooms
    const publicRooms = await ctx.db.query("draftRooms")
      .filter(q => 
        q.and(
          q.eq(q.field("privacy"), "PUBLIC"),
          q.eq(q.field("status"), "PENDING")
        )
      )
      .collect();
    
    // Get rooms where user is already a participant
    const participations = await ctx.db.query("draftParticipants")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();
    
    const participatedRoomIds = new Set(participations.map(p => p.draftRoomId));
    
    // Filter out rooms where user is already a participant
    const availableRooms = [];
    for (const room of publicRooms) {
      if (!participatedRoomIds.has(room._id)) {
        // Get participants count for this room
        const participants = await ctx.db.query("draftParticipants")
          .withIndex("by_draft_room", q => q.eq("draftRoomId", room._id))
          .collect();
        
        // Get creator info
        const creator = await ctx.db.query("users")
          .filter(q => q.eq(q.field("_id"), room.createdBy))
          .first();
        
        availableRooms.push({
          ...room,
          id: room._id, // Add id property for frontend compatibility
          participantCount: participants.length,
          hasSpace: participants.length < room.maxTeams,
          creator: creator || { name: "Unknown", email: "unknown" }
        });
      }
    }
    
    return { publicRooms: availableRooms };
  },
});

// Join a draft room
export const joinDraftRoom = mutation({
  args: {
    roomId: v.id("draftRooms"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the draft room with a write lock
    const draftRoom = await ctx.db.get(args.roomId);
    if (!draftRoom) {
      throw new Error("Draft room not found");
    }

    // Check if room is joinable
    if (draftRoom.status !== "PENDING") {
      throw new Error("Can only join draft rooms that are pending");
    }

    // Check privacy settings
    if (draftRoom.privacy === "PRIVATE" && draftRoom.createdBy !== args.userId) {
      throw new Error("This is a private draft room. You need an invite to join.");
    }

    // Get all participants
    const participants = await ctx.db.query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();

    // Check if user is already a participant
    const existingParticipant = participants.find(p => p.userId === args.userId);
    if (existingParticipant) {
      throw new Error("Already a participant in this draft");
    }

    // Check if room is full
    if (participants.length >= draftRoom.maxTeams) {
      throw new Error("Draft room is full");
    }

    const now = new Date().toISOString();

    // Atomically get the next pick order and increment it
    let pickOrder: number;
    
    if (draftRoom.nextPickOrder !== undefined) {
      // Use the stored nextPickOrder if available
      pickOrder = draftRoom.nextPickOrder;
      await ctx.db.patch(args.roomId, {
        nextPickOrder: pickOrder + 1,
        updatedAt: now,
      });
    } else {
      // Fall back to legacy behavior if nextPickOrder isn't set
      pickOrder = participants.length + 1;
      await ctx.db.patch(args.roomId, {
        nextPickOrder: pickOrder + 1,
        updatedAt: now,
      });
    }
    
    // Check if this pick order is already taken in this room
    const existingParticipantWithOrder = await ctx.db.query("draftParticipants")
      .withIndex("by_draft_room_pick_order")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.roomId),
          q.eq(q.field("pickOrder"), pickOrder)
        )
      )
      .first();
    
    if (existingParticipantWithOrder) {
      throw new Error(`Pick order ${pickOrder} is already taken in this room`);
    }

    // Add user as participant with the atomic pick order
    const participantId = await ctx.db.insert("draftParticipants", {
      userId: args.userId,
      draftRoomId: args.roomId,
      pickOrder: pickOrder,
      isReady: false,
      createdAt: now,
      updatedAt: now,
    });

    // Get user info
    const user = await ctx.db.query("users")
      .filter(q => q.eq(q.field("_id"), args.userId))
      .first();

    return {
      message: "Successfully joined draft room",
      participant: {
        id: participantId,
        userId: args.userId,
        pickOrder: pickOrder,
        isReady: false,
        user: {
          name: user?.name,
          email: user?.email,
        },
      },
    };
  },
});

// Start a draft room (transition from PENDING to ACTIVE)
export const startDraft = mutation({
  args: {
    roomId: v.id("draftRooms"),
    userId: v.string(), // To verify ownership
  },
  handler: async (ctx, args) => {
    // Get the draft room
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Draft room not found");
    }

    // Verify the user is the creator of the room
    if (room.createdBy !== args.userId) {
      throw new Error("Only the creator can start the draft");
    }

    // Check if room is in PENDING state
    if (room.status !== "PENDING") {
      throw new Error("Draft can only be started from PENDING state");
    }

    // Get participants to check if there are enough
    const participants = await ctx.db.query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();

    if (participants.length < 2) {
      throw new Error("At least 2 participants are required to start a draft");
    }

    // Update room status to ACTIVE
    const now = new Date().toISOString();
    await ctx.db.patch(args.roomId, {
      status: "ACTIVE",
      startTime: now,
      updatedAt: now,
    });

    return { message: "Draft started successfully" };
  },
});

// Delete a draft room
export const deleteDraftRoom = mutation({
  args: {
    roomId: v.id("draftRooms"),
    userId: v.string(), // To verify ownership
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Draft room not found");
    }

    if (room.createdBy !== args.userId) {
      throw new Error("Only the creator can delete the draft room");
    }

    // Delete associated picks
    const picks = await ctx.db.query("draftPicks")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();
    for (const pick of picks) {
      await ctx.db.delete(pick._id);
    }

    // Delete associated participants
    const participants = await ctx.db.query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();
    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Delete the draft room
    await ctx.db.delete(args.roomId);

    return { message: "Draft room deleted successfully" };
  },
}); 