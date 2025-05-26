import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createSeasonScheduleInternal } from "./playerManagement";

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
    
    // Verify that the team exists
    const team = await ctx.db.query("teams")
      .withIndex("by_teamId")
      .filter(q => q.eq(q.field("teamId"), args.teamId))
      .first();
    
    if (!team) {
      throw new Error("Team not found");
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
    
    // Add team to user's roster (Phase 4 integration)
    await ctx.db.insert("playerRosters", {
      userId: args.userId,
      draftRoomId: args.roomId,
      teamId: args.teamId,
      isStarting: false, // Will be set later by user
      acquisitionType: "draft",
      acquisitionDate: now,
      totalPointsScored: 0,
      weeksStarted: 0,
      createdAt: now,
      updatedAt: now,
    });
    
    // Check if the draft is complete
    if (currentPickNumber === totalParticipants * draftRoom.maxTeams) {
      // Update room status to COMPLETED
      await ctx.db.patch(args.roomId, {
        status: "COMPLETED",
        endTime: now,
        updatedAt: now,
      });
      
      // Automatically create head-to-head schedule for the completed draft
      try {
        const currentYear = new Date().getFullYear();
        // Call the createSeasonSchedule function directly from playerManagement
        await createSeasonScheduleInternal(ctx, {
          draftRoomId: args.roomId,
          year: currentYear,
          totalWeeks: 8,
        });
      } catch (error) {
        console.error("Failed to create automatic schedule:", error);
        // Don't throw error here - draft completion should still succeed
      }
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
    
    // Get all participants with a reasonable limit
    const MAX_PARTICIPANTS = 100; // Reasonable limit for participants
    const participants = await ctx.db.query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .take(MAX_PARTICIPANTS);
    
    // Get all picks with a reasonable limit  
    const MAX_PICKS = 1000; // Reasonable limit for picks history
    const picks = await ctx.db.query("draftPicks")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .take(MAX_PICKS);
    
    // Get available teams that haven't been picked yet - LIMIT to prevent array size errors
    const pickedTeamIds = new Set(picks.map(pick => pick.teamId));
    
    // Only return first 500 available teams to stay under Convex's 8192 limit
    const MAX_AVAILABLE_TEAMS = 500;
    const allTeams = await ctx.db.query("teams")
      .withIndex("by_teamNumber")
      .order("asc")
      .take(MAX_AVAILABLE_TEAMS * 2); // Take more than needed to account for picked teams
    
    // Ensure we're sending back complete team info
    const availableTeams = allTeams
      .filter(team => !pickedTeamIds.has(team.teamId))
      .slice(0, MAX_AVAILABLE_TEAMS) // Ensure we don't exceed the limit
      .map(team => ({
        _id: team._id,
        teamId: team.teamId,
        name: team.name,
        teamNumber: team.teamNumber,
      }));
    
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
    const MAX_ENRICHED_PARTICIPANTS = 50; // Safety limit
    const participantsToEnrich = participants.slice(0, MAX_ENRICHED_PARTICIPANTS);
    
    for (const participant of participantsToEnrich) {
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
    const MAX_ENRICHED_PICKS = 200; // Safety limit for picks
    const picksToEnrich = picks.slice(0, MAX_ENRICHED_PICKS);
    
    for (const pick of picksToEnrich) {
      // Get team data
      const team = await ctx.db.query("teams")
        .withIndex("by_teamId")
        .filter(q => q.eq(q.field("teamId"), pick.teamId))
        .first();
      
      // Get participant data
      const participant = await ctx.db.get(pick.participantId as Id<"draftParticipants">);
      const user = participant ? await ctx.db.query("users")
        .filter(q => q.eq(q.field("_id"), participant.userId))
        .first() : null;
      
      // Ensure we're sending back the complete team info
      enrichedPicks.push({
        ...pick,
        team: team ? {
          _id: team._id, 
          teamId: team.teamId,
          name: team.name,
          teamNumber: team.teamNumber,
        } : null,
        participant: {
          _id: participant?._id,
          user: {
            name: user?.name,
            email: user?.email,
          },
        },
      });
    }
    
    // Get current drafter user info
    let currentDrafterUser = null;
    if (currentDrafter) {
      currentDrafterUser = await ctx.db.query("users")
        .filter(q => q.eq(q.field("_id"), currentDrafter.userId))
        .first();
    }
    
    return {
      room,
      participants: enrichedParticipants,
      picks: enrichedPicks,
      availableTeams: [], // Return empty array to prevent size error - use getAvailableTeams query instead
      currentDrafter: currentDrafter ? {
        id: currentDrafter._id,
        user: {
          name: currentDrafterUser?.name,
          email: currentDrafterUser?.email,
        },
      } : null,
      isMyTurn,
      currentPickNumber,
      currentRound: roundNumber,
      timeRemaining,
    };
  },
});

// Get draft picks for a specific room (for pick history)
export const getDraftPicks = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    // Convert string roomId to Id<"draftRooms">
    const roomIdAsId = args.roomId as Id<"draftRooms">;
    
    // Get the draft room to verify it exists
    const room = await ctx.db.get(roomIdAsId);
    if (!room) {
      throw new Error("Draft room not found");
    }
    
    // Get all picks for this room
    const picks = await ctx.db.query("draftPicks")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", roomIdAsId))
      .collect();
    
    // Enrich picks with team and participant data
    const enrichedPicks = [];
    for (const pick of picks) {
      // Get team data
      const team = await ctx.db.query("teams")
        .withIndex("by_teamId")
        .filter(q => q.eq(q.field("teamId"), pick.teamId))
        .first();
      
      // Get participant data
      const participant = await ctx.db.get(pick.participantId as Id<"draftParticipants">);
      const user = participant ? await ctx.db.query("users")
        .filter(q => q.eq(q.field("_id"), participant.userId))
        .first() : null;
      
      enrichedPicks.push({
        ...pick,
        team: team ? {
          _id: team._id, 
          teamId: team.teamId,
          name: team.name,
          teamNumber: team.teamNumber,
        } : null,
        participant: {
          _id: participant?._id,
          user: {
            name: user?.name,
            email: user?.email,
          },
        },
      });
    }
    
    // Sort picks by pick number
    return enrichedPicks.sort((a, b) => a.pickNumber - b.pickNumber);
  },
});

// Get available teams for draft selection (with pagination/limits)
export const getAvailableTeams = query({
  args: {
    roomId: v.id("draftRooms"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100; // Default to 100 teams
    const offset = args.offset || 0;
    
    // Get all picks to determine what teams are already taken
    const picks = await ctx.db.query("draftPicks")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();
    
    const pickedTeamIds = new Set(picks.map(pick => pick.teamId));
    
    let availableTeams = [];
    let total = 0;
    
    if (args.search) {
      // For search, get all teams to ensure complete search coverage
      const searchLower = args.search.toLowerCase();
      const searchNumber = args.search;
      
      // Get all teams for complete search coverage
      const allTeams = await ctx.db.query("teams")
        .withIndex("by_teamNumber")
        .order("asc")
        .collect(); // Get all teams for search
      
      const filteredTeams = allTeams
        .filter(team => !pickedTeamIds.has(team.teamId))
        .filter(team => 
          team.name.toLowerCase().includes(searchLower) ||
          team.teamNumber.toString().includes(searchNumber)
        );
      
      total = filteredTeams.length;
      availableTeams = filteredTeams.slice(offset, offset + limit);
    } else {
      // For non-search queries, we can be much more efficient
      // Get all teams for complete coverage
      const teamBatch = await ctx.db.query("teams")
        .withIndex("by_teamNumber")
        .order("asc")
        .collect(); // Get all teams
      
      const availableTeamsBatch = teamBatch.filter((team: any) => !pickedTeamIds.has(team.teamId));
      
      total = availableTeamsBatch.length;
      availableTeams = availableTeamsBatch.slice(offset, offset + limit);
    }
    
    return {
      teams: availableTeams.map(team => ({
        _id: team._id,
        teamId: team.teamId,
        name: team.name,
        teamNumber: team.teamNumber,
      })),
      total: total,
      hasMore: total > offset + limit
    };
  },
}); 