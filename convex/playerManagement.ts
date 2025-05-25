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
        .withIndex("by_teamId", q => q.eq("teamId", teamData.teamId))
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
      } else {
        console.warn(`Team not found for teamId: ${teamData.teamId}`);
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
        .withIndex("by_teamId", q => q.eq("teamId", entry.teamId))
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
      } else {
        console.error(`Team not found for teamId: ${entry.teamId} in roster entry ${entry._id}`);
        // Still add the entry but with null team data for debugging
        enrichedRoster.push({
          ...entry,
          team: null,
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

// ===== PHASE 5: LEAGUE MANAGEMENT & SCORING =====

// Calculate weekly fantasy scores for all users in a league
export const calculateLeagueWeeklyScores = mutation({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Get all participants in this league
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    const results = [];
    
    for (const participant of participants) {
      // Get user's starting lineup for this week
      const startingTeams = await ctx.db
        .query("playerRosters")
        .withIndex("by_user_draft", q => 
          q.eq("userId", participant.userId).eq("draftRoomId", args.draftRoomId)
        )
        .filter(q => q.eq(q.field("isStarting"), true))
        .collect();
      
      let weeklyPoints = 0;
      const teamScores: Array<{teamId: string; points: number}> = [];
      
      // Calculate points for each starting team
      for (const rosterEntry of startingTeams) {
        const weeklyScore = await ctx.db
          .query("weeklyTeamScores")
          .withIndex("by_team_year_week", q => 
            q.eq("teamId", rosterEntry.teamId).eq("year", args.year).eq("week", args.week)
          )
          .first();
        
        if (weeklyScore) {
          weeklyPoints += weeklyScore.weeklyPoints;
          teamScores.push({
            teamId: rosterEntry.teamId,
            points: weeklyScore.weeklyPoints,
          });
        }
      }
      
      // Check if league score already exists for this user/week
      const existingScore = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_user_week", q => 
          q.eq("draftRoomId", args.draftRoomId)
           .eq("userId", participant.userId)
           .eq("year", args.year)
           .eq("week", args.week)
        )
        .first();
      
      const scoreData = {
        draftRoomId: args.draftRoomId,
        userId: participant.userId,
        year: args.year,
        week: args.week,
        weeklyPoints: Math.round(weeklyPoints * 100) / 100,
        startingTeamCount: startingTeams.length,
        teamScores,
      };
      
      if (existingScore) {
        await ctx.db.patch(existingScore._id, {
          ...scoreData,
          updatedAt: now,
        });
        results.push(existingScore._id);
      } else {
        const scoreId = await ctx.db.insert("leagueWeeklyScores", {
          ...scoreData,
          createdAt: now,
          updatedAt: now,
        });
        results.push(scoreId);
      }
    }
    
    return results;
  },
});

// Get league standings for a specific week or season
export const getLeagueStandings = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let weeklyScores;
    
    if (args.week !== undefined) {
      // Get scores for specific week
      const week = args.week; // Store in variable to satisfy TypeScript
      weeklyScores = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_year_week", q => 
          q.eq("draftRoomId", args.draftRoomId)
           .eq("year", args.year)
           .eq("week", week)
        )
        .collect();
    } else {
      // Get all scores for the season
      weeklyScores = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_year", q => 
          q.eq("draftRoomId", args.draftRoomId).eq("year", args.year)
        )
        .collect();
    }
    
    // Group by user and calculate totals
    const userTotals = new Map<string, {
      userId: string;
      totalPoints: number;
      weekCount: number;
      averagePoints: number;
      bestWeek: number;
      worstWeek: number;
    }>();
    
    for (const score of weeklyScores) {
      const existing = userTotals.get(score.userId);
      if (existing) {
        existing.totalPoints += score.weeklyPoints;
        existing.weekCount += 1;
        existing.bestWeek = Math.max(existing.bestWeek, score.weeklyPoints);
        existing.worstWeek = Math.min(existing.worstWeek, score.weeklyPoints);
      } else {
        userTotals.set(score.userId, {
          userId: score.userId,
          totalPoints: score.weeklyPoints,
          weekCount: 1,
          averagePoints: 0, // Will calculate below
          bestWeek: score.weeklyPoints,
          worstWeek: score.weeklyPoints,
        });
      }
    }
    
    // Calculate averages and sort by total points
    const standings = Array.from(userTotals.values())
      .map(user => ({
        ...user,
        averagePoints: Math.round((user.totalPoints / user.weekCount) * 100) / 100,
        totalPoints: Math.round(user.totalPoints * 100) / 100,
        bestWeek: Math.round(user.bestWeek * 100) / 100,
        worstWeek: Math.round(user.worstWeek * 100) / 100,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Enrich with user data
    const enrichedStandings = [];
    for (let i = 0; i < standings.length; i++) {
      const standing = standings[i];
      const user = await ctx.db.get(standing.userId as Id<"users">);
      
      enrichedStandings.push({
        rank: i + 1,
        ...standing,
        user: user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
        } : null,
      });
    }
    
    return enrichedStandings;
  },
});

// Get detailed league analytics
export const getLeagueAnalytics = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all weekly scores for the league
    const allScores = await ctx.db
      .query("leagueWeeklyScores")
      .withIndex("by_league_year", q => 
        q.eq("draftRoomId", args.draftRoomId).eq("year", args.year)
      )
      .collect();
    
    if (allScores.length === 0) {
      return {
        totalParticipants: 0,
        totalWeeks: 0,
        averageWeeklyScore: 0,
        highestWeeklyScore: 0,
        lowestWeeklyScore: 0,
        scoreDistribution: [],
        weeklyAverages: [],
      };
    }
    
    // Calculate basic statistics
    const totalParticipants = new Set(allScores.map(s => s.userId)).size;
    const totalWeeks = new Set(allScores.map(s => s.week)).size;
    const allPoints = allScores.map(s => s.weeklyPoints);
    const averageWeeklyScore = allPoints.reduce((sum, p) => sum + p, 0) / allPoints.length;
    const highestWeeklyScore = Math.max(...allPoints);
    const lowestWeeklyScore = Math.min(...allPoints);
    
    // Score distribution (histogram)
    const scoreRanges = [
      { min: 0, max: 50, count: 0 },
      { min: 50, max: 100, count: 0 },
      { min: 100, max: 150, count: 0 },
      { min: 150, max: 200, count: 0 },
      { min: 200, max: 250, count: 0 },
      { min: 250, max: Infinity, count: 0 },
    ];
    
    for (const points of allPoints) {
      for (const range of scoreRanges) {
        if (points >= range.min && points < range.max) {
          range.count++;
          break;
        }
      }
    }
    
    // Weekly averages
    const weeklyData = new Map<number, number[]>();
    for (const score of allScores) {
      if (!weeklyData.has(score.week)) {
        weeklyData.set(score.week, []);
      }
      weeklyData.get(score.week)!.push(score.weeklyPoints);
    }
    
    const weeklyAverages = Array.from(weeklyData.entries())
      .map(([week, scores]) => ({
        week,
        averageScore: Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100,
        participantCount: scores.length,
        highScore: Math.max(...scores),
        lowScore: Math.min(...scores),
      }))
      .sort((a, b) => a.week - b.week);
    
    return {
      totalParticipants,
      totalWeeks,
      averageWeeklyScore: Math.round(averageWeeklyScore * 100) / 100,
      highestWeeklyScore: Math.round(highestWeeklyScore * 100) / 100,
      lowestWeeklyScore: Math.round(lowestWeeklyScore * 100) / 100,
      scoreDistribution: scoreRanges,
      weeklyAverages,
    };
  },
});

// Get user's performance history in a league
export const getUserLeagueHistory = query({
  args: {
    userId: v.string(),
    draftRoomId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const userScores = await ctx.db
      .query("leagueWeeklyScores")
      .withIndex("by_league_user_year", q => 
        q.eq("draftRoomId", args.draftRoomId)
         .eq("userId", args.userId)
         .eq("year", args.year)
      )
      .collect();
    
    // Sort by week
    const sortedScores = userScores.sort((a, b) => a.week - b.week);
    
    // Calculate running totals and trends
    let runningTotal = 0;
    const enrichedHistory = sortedScores.map((score, index) => {
      runningTotal += score.weeklyPoints;
      
      return {
        ...score,
        runningTotal: Math.round(runningTotal * 100) / 100,
        weekRank: 0, // Will be calculated separately if needed
        trend: index > 0 ? 
          (score.weeklyPoints > sortedScores[index - 1].weeklyPoints ? 'up' : 
           score.weeklyPoints < sortedScores[index - 1].weeklyPoints ? 'down' : 'same') : 'same',
      };
    });
    
    return enrichedHistory;
  },
});

// Get team performance projections
export const getTeamProjections = query({
  args: {
    teamId: v.string(),
    year: v.number(),
    weeksToProject: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const weeksToProject = args.weeksToProject || 4;
    
    // Get team's historical performance for this year
    const performances = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_team_year", q => 
        q.eq("teamId", args.teamId).eq("year", args.year)
      )
      .collect();
    
    if (performances.length === 0) {
      return {
        teamId: args.teamId,
        projectedWeeklyAverage: 0,
        confidence: 0,
        trend: 'unknown',
        projectedPoints: [],
      };
    }
    
    // Calculate averages and trends
    const totalPoints = performances.reduce((sum, p) => sum + p.totalPoints, 0);
    const averagePoints = totalPoints / performances.length;
    
    // Simple trend calculation (last 3 events vs first 3 events)
    const recentPerformances = performances.slice(-3);
    const earlyPerformances = performances.slice(0, 3);
    
    const recentAvg = recentPerformances.reduce((sum, p) => sum + p.totalPoints, 0) / recentPerformances.length;
    const earlyAvg = earlyPerformances.reduce((sum, p) => sum + p.totalPoints, 0) / earlyPerformances.length;
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > earlyAvg * 1.1) trend = 'improving';
    else if (recentAvg < earlyAvg * 0.9) trend = 'declining';
    
    // Confidence based on number of events and consistency
    const variance = performances.reduce((sum, p) => sum + Math.pow(p.totalPoints - averagePoints, 2), 0) / performances.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / averagePoints;
    
    // Lower coefficient of variation = higher confidence
    const confidence = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));
    
    // Project future weeks with some randomness based on historical variance
    const projectedPoints = [];
    for (let i = 1; i <= weeksToProject; i++) {
      // Base projection on average with trend adjustment
      let baseProjection = averagePoints;
      if (trend === 'improving') baseProjection *= 1.05;
      else if (trend === 'declining') baseProjection *= 0.95;
      
      projectedPoints.push({
        week: i,
        projectedPoints: Math.round(baseProjection * 100) / 100,
        confidenceRange: {
          low: Math.round((baseProjection - standardDeviation) * 100) / 100,
          high: Math.round((baseProjection + standardDeviation) * 100) / 100,
        },
      });
    }
    
    return {
      teamId: args.teamId,
      projectedWeeklyAverage: Math.round(averagePoints * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      trend,
      projectedPoints,
      historicalAverage: Math.round(averagePoints * 100) / 100,
      eventCount: performances.length,
    };
  },
}); 