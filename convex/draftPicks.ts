import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Make a draft pick
export const makePick = mutation({
  args: {
    roomId: v.id("draftRooms"),
    userId: v.string(),
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the draft room
    const draftRoom = await ctx.db.get(args.roomId);
    if (!draftRoom) {
      throw new Error("Draft room not found");
    }

    // Check if room is active
    if (draftRoom.status !== "ACTIVE") {
      throw new Error("Draft room must be active to make picks");
    }

    // Get the participant
    const participant = await ctx.db.query("draftParticipants")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.roomId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!participant) {
      throw new Error("You are not a participant in this draft");
    }

    // Get all picks for this room to determine current pick number
    const picks = await ctx.db.query("draftPicks")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();

    const currentPickNumber = picks.length + 1;
    
    // Check if it's this participant's turn (you would implement the pick order logic here)
    // This is a simplified version - you'd need to implement the snake draft logic
    const participants = await ctx.db.query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();
    
    const totalParticipants = participants.length;
    const roundNumber = Math.floor((currentPickNumber - 1) / totalParticipants) + 1;
    
    let participantIndex;
    if (draftRoom.snakeFormat && roundNumber % 2 === 0) {
      // Even rounds go in reverse order in snake draft
      participantIndex = totalParticipants - 1 - ((currentPickNumber - 1) % totalParticipants);
    } else {
      // Odd rounds go in regular order
      participantIndex = (currentPickNumber - 1) % totalParticipants;
    }
    
    const currentTurnParticipant = participants.sort((a, b) => a.pickOrder - b.pickOrder)[participantIndex];
    
    if (participant._id !== currentTurnParticipant._id) {
      throw new Error("It's not your turn to pick");
    }
    
    // Check if the team has already been picked
    const teamAlreadyPicked = picks.some(pick => pick.teamId === args.teamId);
    if (teamAlreadyPicked) {
      throw new Error("This team has already been drafted");
    }
    
    // Make the pick
    const now = new Date().toISOString();
    const pickId = await ctx.db.insert("draftPicks", {
      draftRoomId: args.roomId,
      participantId: participant._id,
      teamId: args.teamId,
      pickNumber: currentPickNumber,
      roundNumber,
      pickedAt: now,
    });
    
    // Check if the draft is complete
    if (currentPickNumber === totalParticipants * draftRoom.maxTeams) {
      // Update room status to COMPLETED
      await ctx.db.patch(args.roomId, {
        status: "COMPLETED",
        endTime: now,
        updatedAt: now,
      });
    }
    
    return { pickId, currentPickNumber, roundNumber };
  },
});

// Get draft room state including picks, participants, and other info
export const getDraftState = query({
  args: {
    roomId: v.id("draftRooms"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the draft room
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Draft room not found");
    }
    
    // Get all participants
    const participants = await ctx.db.query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();
    
    // Get all picks
    const picks = await ctx.db.query("draftPicks")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();
    
    // Get all teams that haven't been picked yet
    const pickedTeamIds = picks.map(pick => pick.teamId);
    const allTeams = await ctx.db.query("teams").collect();
    const availableTeams = allTeams.filter(team => !pickedTeamIds.includes(team.teamId));
    
    // Determine current drafter
    const totalParticipants = participants.length;
    const currentPickNumber = picks.length + 1;
    const roundNumber = Math.floor((currentPickNumber - 1) / totalParticipants) + 1;
    
    let participantIndex;
    if (room.snakeFormat && roundNumber % 2 === 0) {
      // Even rounds go in reverse order in snake draft
      participantIndex = totalParticipants - 1 - ((currentPickNumber - 1) % totalParticipants);
    } else {
      // Odd rounds go in regular order
      participantIndex = (currentPickNumber - 1) % totalParticipants;
    }
    
    const sortedParticipants = participants.sort((a, b) => a.pickOrder - b.pickOrder);
    const currentDrafter = totalParticipants > 0 ? sortedParticipants[participantIndex] : null;
    
    // Check if it's the current user's turn
    const isMyTurn = currentDrafter?.userId === args.userId;
    
    // Calculate time remaining (if you have a timer feature)
    let timeRemaining = 0;
    if (room.status === "ACTIVE" && currentDrafter) {
      const currentTime = new Date();
      const lastPickTime = picks.length > 0 
        ? new Date(picks[picks.length - 1].pickedAt) 
        : new Date(room.startTime || room.createdAt);
      
      const elapsedSeconds = Math.floor((currentTime.getTime() - lastPickTime.getTime()) / 1000);
      timeRemaining = Math.max(0, room.pickTimeSeconds - elapsedSeconds);
    }
    
    // Enrich participants with user data
    const enrichedParticipants = [];
    for (const participant of participants) {
      const user = await ctx.db.query("users")
        .filter(q => q.eq(q.field("_id"), participant.userId))
        .first();
      
      enrichedParticipants.push({
        ...participant,
        user: {
          name: user?.name,
          email: user?.email,
        },
      });
    }
    
    // Enrich picks with team and participant data
    const enrichedPicks = [];
    for (const pick of picks) {
      const team = await ctx.db.get(pick.teamId as Id<"teams">);
      const participant = await ctx.db.get(pick.participantId as Id<"draftParticipants">);
      const user = participant ? await ctx.db.query("users")
        .filter(q => q.eq(q.field("_id"), participant.userId))
        .first() : null;
      
      enrichedPicks.push({
        ...pick,
        team: {
          id: team?._id,
          name: team?.name,
          number: team?.teamNumber,
        },
        participant: {
          id: participant?._id,
          user: {
            name: user?.name,
            email: user?.email,
          },
        },
      });
    }
    
    return {
      room,
      participants: enrichedParticipants,
      picks: enrichedPicks,
      availableTeams,
      currentDrafter: currentDrafter ? {
        id: currentDrafter._id,
        user: {
          name: await ctx.db.query("users")
            .filter(q => q.eq(q.field("_id"), currentDrafter.userId))
            .first()
            .then(user => user?.name),
          email: await ctx.db.query("users")
            .filter(q => q.eq(q.field("_id"), currentDrafter.userId))
            .first()
            .then(user => user?.email),
        },
      } : null,
      isMyTurn,
      currentPickNumber,
      currentRound: roundNumber,
      timeRemaining,
    };
  },
}); 