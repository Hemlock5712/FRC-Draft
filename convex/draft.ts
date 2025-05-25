import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get draft room with real-time updates
export const getDraftState = query({
  args: { roomId: v.id("draftRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Draft room not found");
    }

    // Get participants with user details
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .collect();

    const participantsWithUsers = await Promise.all(
      participants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId as Id<"users">);
        return {
          ...participant,
          user: user ? { name: user.name, email: user.email } : { name: null, email: null }
        };
      })
    );

    // Get picks with team and participant details
    const picks = await ctx.db
      .query("draftPicks")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.roomId))
      .order("asc")
      .collect();

    const picksWithDetails = await Promise.all(
      picks.map(async (pick) => {
        // Use teamId to find the team instead of trying to use it as a document ID
        const team = await ctx.db.query("teams")
          .withIndex("by_teamId")
          .filter(q => q.eq(q.field("teamId"), pick.teamId))
          .first();
        const participant = participantsWithUsers.find(p => p._id === pick.participantId);
        return {
          ...pick,
          team: team ? { _id: team._id, name: team.name, teamNumber: team.teamNumber } : null,
          participant: participant ? { 
            _id: participant._id, 
            user: participant.user 
          } : null
        };
      })
    );

    // Get available teams (teams not yet picked) - LIMIT to prevent array size errors
    const pickedTeamIds = picks.map(pick => pick.teamId);
    
    // Only return first 500 available teams to stay under Convex's 8192 limit
    // The draft UI should implement search/pagination for team selection
    const MAX_AVAILABLE_TEAMS = 500;
    const allTeams = await ctx.db.query("teams")
      .withIndex("by_teamNumber") 
      .order("asc")
      .take(MAX_AVAILABLE_TEAMS * 2); // Take more than needed to account for picked teams
    
    const availableTeams = allTeams
      .filter(team => !pickedTeamIds.includes(team.teamId))
      .slice(0, MAX_AVAILABLE_TEAMS); // Ensure we don't exceed the limit

    // Determine current drafter and turn info
    const totalPicks = picks.length;
    const totalParticipants = participants.length;
    const currentPickNumber = totalPicks + 1;
    const currentRound = Math.floor(totalPicks / totalParticipants) + 1;
    
    // Snake draft logic - safely access room properties
    let currentDrafterIndex;
    const snakeFormat = (room as any).snakeFormat || false;
    if (snakeFormat) {
      const isEvenRound = currentRound % 2 === 0;
      if (isEvenRound) {
        currentDrafterIndex = (totalParticipants - 1) - (totalPicks % totalParticipants);
      } else {
        currentDrafterIndex = totalPicks % totalParticipants;
      }
    } else {
      currentDrafterIndex = totalPicks % totalParticipants;
    }

    const currentDrafter = participantsWithUsers[currentDrafterIndex] || null;

    // Calculate time remaining (simplified - you might want to store pick start times)
    const pickTimeSeconds = (room as any).pickTimeSeconds || 0;
    const timeRemaining = pickTimeSeconds;

    return {
      room,
      participants: participantsWithUsers,
      picks: picksWithDetails,
      availableTeams,
      currentDrafter,
      isMyTurn: false, // This will be calculated on the client side
      currentPickNumber,
      currentRound,
      timeRemaining,
    };
  },
});

// Get all draft rooms where a user is a participant
export const getUserDraftRooms = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all participant records and filter for this user
    const allParticipations = await ctx.db
      .query("draftParticipants")
      .collect();

    const userParticipations = allParticipations.filter(p => p.userId === args.userId);

    // Get the draft rooms for these participations
    const draftRooms = await Promise.all(
      userParticipations.map(async (participation) => {
        const room = await ctx.db.get(participation.draftRoomId as Id<"draftRooms">);
        if (!room) return null;

        return {
          ...room,
          teamsToStart: room.teamsToStart || 5, // Use room value or default
        };
      })
    );

    // Filter out null rooms and return
    return draftRooms.filter(room => room !== null);
  },
}); 