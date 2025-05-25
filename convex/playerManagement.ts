import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ===== SCORING SYSTEM FUNCTIONS =====

/**
 * Calculate points for a team's performance at an event
 * Based on Phase 4 requirements:
 * - 12 base points for participating
 * - +2 for qual win, -1 for qual loss (normalized to 10 matches)
 * - +1 for making playoffs
 * - +0.3333 for playoff win, -0.25 for playoff loss
 */
export const calculateEventPoints = (
  qualWins: number,
  qualLosses: number,
  qualTies: number,
  totalQualMatches: number,
  playoffWins: number,
  playoffLosses: number,
  madePlayoffs: boolean
) => {
  // Base points for participating in the event
  const basePoints = 12;
  
  // Calculate qualification points (normalized to 10 matches)
  let qualPoints = 0;
  if (totalQualMatches > 0) {
    const rawQualPoints = (qualWins * 2) + (qualLosses * -1); // Ties are 0 points
    qualPoints = (rawQualPoints * 10) / totalQualMatches; // Normalize to 10 matches
  }
  
  // Calculate playoff points
  let playoffPoints = 0;
  if (madePlayoffs) {
    playoffPoints += 1; // 1 point for making playoffs
  }
  playoffPoints += (playoffWins * 0.3333) + (playoffLosses * -0.25);
  
  const totalPoints = basePoints + qualPoints + playoffPoints;
  
  return {
    basePoints,
    qualPoints: Math.round(qualPoints * 100) / 100, // Round to 2 decimal places
    playoffPoints: Math.round(playoffPoints * 100) / 100,
    totalPoints: Math.round(totalPoints * 100) / 100,
  };
};

// ===== EVENT MANAGEMENT =====

// Add or update an event
export const upsertEvent = mutation({
  args: {
    eventKey: v.string(),
    name: v.string(),
    eventCode: v.string(),
    eventType: v.number(),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    stateProv: v.optional(v.string()),
    country: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    year: v.number(),
    week: v.optional(v.number()),
    address: v.optional(v.string()),
    timezone: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Check if event already exists
    const existingEvent = await ctx.db
      .query("events")
      .withIndex("by_event_key", q => q.eq("eventKey", args.eventKey))
      .first();
    
    if (existingEvent) {
      // Update existing event
      await ctx.db.patch(existingEvent._id, {
        ...args,
        updatedAt: now,
      });
      return existingEvent._id;
    } else {
      // Create new event
      const eventId = await ctx.db.insert("events", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
      return eventId;
    }
  },
});

// Get events by year
export const getEventsByYear = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_year", q => q.eq("year", args.year))
      .collect();
  },
});

// ===== TEAM PERFORMANCE MANAGEMENT =====

// Record team performance at an event
export const recordTeamEventPerformance = mutation({
  args: {
    teamId: v.string(),
    eventKey: v.string(),
    year: v.number(),
    week: v.optional(v.number()),
    qualWins: v.number(),
    qualLosses: v.number(),
    qualTies: v.number(),
    totalQualMatches: v.number(),
    playoffWins: v.number(),
    playoffLosses: v.number(),
    madePlayoffs: v.boolean(),
    rank: v.optional(v.number()),
    rankingScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Calculate points using our scoring system
    const points = calculateEventPoints(
      args.qualWins,
      args.qualLosses,
      args.qualTies,
      args.totalQualMatches,
      args.playoffWins,
      args.playoffLosses,
      args.madePlayoffs
    );
    
    // Check if performance record already exists
    const existingPerformance = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_team_event", q => 
        q.eq("teamId", args.teamId).eq("eventKey", args.eventKey)
      )
      .first();
    
    const performanceData = {
      teamId: args.teamId,
      eventKey: args.eventKey,
      year: args.year,
      week: args.week,
      qualWins: args.qualWins,
      qualLosses: args.qualLosses,
      qualTies: args.qualTies,
      totalQualMatches: args.totalQualMatches,
      playoffWins: args.playoffWins,
      playoffLosses: args.playoffLosses,
      madePlayoffs: args.madePlayoffs,
      rank: args.rank,
      rankingScore: args.rankingScore,
      basePoints: points.basePoints,
      qualPoints: points.qualPoints,
      playoffPoints: points.playoffPoints,
      totalPoints: points.totalPoints,
    };
    
    if (existingPerformance) {
      // Update existing performance
      await ctx.db.patch(existingPerformance._id, {
        ...performanceData,
        updatedAt: now,
      });
      return existingPerformance._id;
    } else {
      // Create new performance record
      const performanceId = await ctx.db.insert("teamEventPerformances", {
        ...performanceData,
        createdAt: now,
        updatedAt: now,
      });
      return performanceId;
    }
  },
});

// Get team performance for a specific year
export const getTeamPerformanceByYear = query({
  args: { 
    teamId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_team_year", q => 
        q.eq("teamId", args.teamId).eq("year", args.year)
      )
      .collect();
  },
});

// Get top performing teams for a given year/week
export const getTopTeamsByWeek = query({
  args: { 
    year: v.number(),
    week: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let performances;
    if (args.week) {
      performances = await ctx.db
        .query("teamEventPerformances")
        .withIndex("by_year_week", q => 
          q.eq("year", args.year).eq("week", args.week)
        )
        .collect();
    } else {
      performances = await ctx.db
        .query("teamEventPerformances")
        .filter(q => q.eq(q.field("year"), args.year))
        .collect();
    }
    
    // Group by team and sum points
    const teamTotals = new Map<string, { teamId: string; totalPoints: number; eventCount: number }>();
    
    for (const performance of performances) {
      const existing = teamTotals.get(performance.teamId);
      if (existing) {
        existing.totalPoints += performance.totalPoints;
        existing.eventCount += 1;
      } else {
        teamTotals.set(performance.teamId, {
          teamId: performance.teamId,
          totalPoints: performance.totalPoints,
          eventCount: 1,
        });
      }
    }
    
    // Convert to array and sort by total points
    const sortedTeams = Array.from(teamTotals.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
    
    // Enrich with team data
    const enrichedTeams = [];
    for (const teamData of sortedTeams) {
      const team = await ctx.db
        .query("teams")
        .filter(q => q.eq(q.field("teamId"), teamData.teamId))
        .first();
      
      if (team) {
        enrichedTeams.push({
          ...teamData,
          team: {
            _id: team._id,
            teamId: team.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
          },
          averagePoints: Math.round((teamData.totalPoints / teamData.eventCount) * 100) / 100,
        });
      }
    }
    
    return enrichedTeams;
  },
});

// ===== WEEKLY SCORING =====

// Calculate and store weekly team scores
export const calculateWeeklyScores = mutation({
  args: {
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Get all team performances for this week
    const weekPerformances = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .collect();
    
    // Group by team
    const teamWeeklyData = new Map<string, {
      teamId: string;
      totalPoints: number;
      eventKeys: string[];
      eventsCount: number;
    }>();
    
    for (const performance of weekPerformances) {
      const existing = teamWeeklyData.get(performance.teamId);
      if (existing) {
        existing.totalPoints += performance.totalPoints;
        existing.eventKeys.push(performance.eventKey);
        existing.eventsCount += 1;
      } else {
        teamWeeklyData.set(performance.teamId, {
          teamId: performance.teamId,
          totalPoints: performance.totalPoints,
          eventKeys: [performance.eventKey],
          eventsCount: 1,
        });
      }
    }
    
    // Store weekly scores for each team
    const results = [];
    for (const [teamId, weekData] of teamWeeklyData) {
      // Calculate season total (sum of all weeks up to this point)
      const previousWeeks = await ctx.db
        .query("weeklyTeamScores")
        .withIndex("by_team_year", q => 
          q.eq("teamId", teamId).eq("year", args.year)
        )
        .filter(q => q.lt(q.field("week"), args.week))
        .collect();
      
      const seasonPoints = previousWeeks.reduce((sum, week) => sum + week.weeklyPoints, 0) + weekData.totalPoints;
      
      // Check if weekly score already exists
      const existingWeeklyScore = await ctx.db
        .query("weeklyTeamScores")
        .withIndex("by_team_year_week", q => 
          q.eq("teamId", teamId).eq("year", args.year).eq("week", args.week)
        )
        .first();
      
      const weeklyScoreData = {
        teamId,
        year: args.year,
        week: args.week,
        eventsCount: weekData.eventsCount,
        eventKeys: weekData.eventKeys,
        weeklyPoints: Math.round(weekData.totalPoints * 100) / 100,
        seasonPoints: Math.round(seasonPoints * 100) / 100,
      };
      
      if (existingWeeklyScore) {
        await ctx.db.patch(existingWeeklyScore._id, {
          ...weeklyScoreData,
          updatedAt: now,
        });
        results.push(existingWeeklyScore._id);
      } else {
        const weeklyScoreId = await ctx.db.insert("weeklyTeamScores", {
          ...weeklyScoreData,
          createdAt: now,
          updatedAt: now,
        });
        results.push(weeklyScoreId);
      }
    }
    
    return results;
  },
});

// Get weekly scores for all teams in a given year
export const getWeeklyScores = query({
  args: {
    year: v.number(),
    week: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.week !== undefined) {
      const week = args.week; // Store in variable to satisfy TypeScript
      return await ctx.db
        .query("weeklyTeamScores")
        .withIndex("by_year_week", q => 
          q.eq("year", args.year).eq("week", week)
        )
        .collect();
    } else {
      return await ctx.db
        .query("weeklyTeamScores")
        .filter(q => q.eq(q.field("year"), args.year))
        .collect();
    }
  },
});

// ===== ROSTER MANAGEMENT =====

// Add team to user's roster (from draft)
export const addTeamToRoster = mutation({
  args: {
    userId: v.string(),
    draftRoomId: v.string(),
    teamId: v.string(),
    acquisitionType: v.string(),
    isStarting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    const rosterId = await ctx.db.insert("playerRosters", {
      userId: args.userId,
      draftRoomId: args.draftRoomId,
      teamId: args.teamId,
      isStarting: args.isStarting || false,
      acquisitionType: args.acquisitionType,
      acquisitionDate: now,
      totalPointsScored: 0,
      weeksStarted: 0,
      createdAt: now,
      updatedAt: now,
    });
    
    return rosterId;
  },
});

// Get user's roster for a draft room
export const getUserRoster = query({
  args: {
    userId: v.string(),
    draftRoomId: v.string(),
  },
  handler: async (ctx, args) => {
    const rosterEntries = await ctx.db
      .query("playerRosters")
      .withIndex("by_user_draft", q => 
        q.eq("userId", args.userId).eq("draftRoomId", args.draftRoomId)
      )
      .collect();
    
    // Enrich with team data
    const enrichedRoster = [];
    for (const entry of rosterEntries) {
      const team = await ctx.db
        .query("teams")
        .filter(q => q.eq(q.field("teamId"), entry.teamId))
        .first();
      
      if (team) {
        enrichedRoster.push({
          ...entry,
          team: {
            _id: team._id,
            teamId: team.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
          },
        });
      }
    }
    
    return enrichedRoster;
  },
});

// Update starting lineup
export const updateStartingLineup = mutation({
  args: {
    userId: v.string(),
    draftRoomId: v.string(),
    startingTeamIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Get all roster entries for this user in this draft
    const rosterEntries = await ctx.db
      .query("playerRosters")
      .withIndex("by_user_draft", q => 
        q.eq("userId", args.userId).eq("draftRoomId", args.draftRoomId)
      )
      .collect();
    
    // Update starting status for all teams
    for (const entry of rosterEntries) {
      const isStarting = args.startingTeamIds.includes(entry.teamId);
      await ctx.db.patch(entry._id, {
        isStarting,
        updatedAt: now,
      });
    }
    
    return true;
  },
}); 