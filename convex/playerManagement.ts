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

// ===== PHASE 6: ADVANCED FEATURES & INTEGRATIONS =====

// Get user's draft rooms for trading interface
export const getUserDraftRoomsForTrading = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all draft rooms where user is a participant
    const participations = await ctx.db
      .query("draftParticipants")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();
    
    const draftRooms = [];
    for (const participation of participations) {
      const draftRoom = await ctx.db.get(participation.draftRoomId as Id<"draftRooms">);
      if (draftRoom && draftRoom.status === "COMPLETED") {
        draftRooms.push({
          _id: draftRoom._id,
          name: draftRoom.name,
          status: draftRoom.status,
        });
      }
    }
    
    return draftRooms;
  },
});

// Get participants in a draft room for trading
export const getDraftRoomParticipants = query({
  args: {
    draftRoomId: v.string(),
    excludeUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    const enrichedParticipants = [];
    for (const participant of participants) {
      if (args.excludeUserId && participant.userId === args.excludeUserId) {
        continue; // Skip the current user
      }
      
      const user = await ctx.db.get(participant.userId as Id<"users">);
      if (user) {
        enrichedParticipants.push({
          userId: participant.userId,
          name: user.name || user.email || 'Unknown User',
          email: user.email,
        });
      }
    }
    
    return enrichedParticipants;
  },
});

// Get user's teams in a specific draft room for trading
export const getUserTeamsForTrading = query({
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
    
    const teams = [];
    for (const entry of rosterEntries) {
      const team = await ctx.db
        .query("teams")
        .withIndex("by_teamId", q => q.eq("teamId", entry.teamId))
        .first();
      
      if (team) {
        teams.push({
          teamId: entry.teamId,
          teamNumber: team.teamNumber,
          name: team.name,
          isStarting: entry.isStarting,
        });
      }
    }
    
    return teams.sort((a, b) => a.teamNumber - b.teamNumber);
  },
});

// Real-time data sync from The Blue Alliance
export const syncTBAData = mutation({
  args: {
    year: v.number(),
    eventKey: v.optional(v.string()),
    forceSync: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Check if sync is already in progress
    const existingSync = await ctx.db
      .query("syncStates")
      .filter(q => q.eq(q.field("type"), `tba_sync_${args.year}`))
      .first();
    
    if (existingSync?.syncInProgress && !args.forceSync) {
      throw new Error("Sync already in progress for this year");
    }
    
    // Create or update sync state
    const syncStateData = {
      type: `tba_sync_${args.year}`,
      lastSyncTime: now,
      syncInProgress: true,
      updatedAt: now,
    };
    
    if (existingSync) {
      await ctx.db.patch(existingSync._id, syncStateData);
    } else {
      await ctx.db.insert("syncStates", {
        ...syncStateData,
        createdAt: now,
      });
    }
    
    // Note: In a real implementation, this would trigger external API calls
    // For now, we'll just mark the sync as complete
    // TODO: Implement actual TBA API integration
    
    return { message: `TBA sync initiated for year ${args.year}`, syncId: existingSync?._id };
  },
});

// Trading system - initiate a trade between users
export const initiateTrade = mutation({
  args: {
    fromUserId: v.string(),
    toUserId: v.string(),
    draftRoomId: v.string(),
    offeredTeamIds: v.array(v.string()),
    requestedTeamIds: v.array(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Validate that both users are in the same draft room
    const fromParticipant = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .filter(q => q.eq(q.field("userId"), args.fromUserId))
      .first();
    
    const toParticipant = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .filter(q => q.eq(q.field("userId"), args.toUserId))
      .first();
    
    if (!fromParticipant || !toParticipant) {
      throw new Error("Both users must be participants in the same draft room");
    }
    
    // Validate that the offering user owns the offered teams
    for (const teamId of args.offeredTeamIds) {
      const roster = await ctx.db
        .query("playerRosters")
        .withIndex("by_user_draft", q => 
          q.eq("userId", args.fromUserId).eq("draftRoomId", args.draftRoomId)
        )
        .filter(q => q.eq(q.field("teamId"), teamId))
        .first();
      
      if (!roster) {
        throw new Error(`User does not own team ${teamId}`);
      }
    }
    
    // Validate that the target user owns the requested teams
    for (const teamId of args.requestedTeamIds) {
      const roster = await ctx.db
        .query("playerRosters")
        .withIndex("by_user_draft", q => 
          q.eq("userId", args.toUserId).eq("draftRoomId", args.draftRoomId)
        )
        .filter(q => q.eq(q.field("teamId"), teamId))
        .first();
      
      if (!roster) {
        throw new Error(`Target user does not own team ${teamId}`);
      }
    }
    
    // Create trade proposal
    const tradeId = await ctx.db.insert("tradeProposals", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      draftRoomId: args.draftRoomId,
      offeredTeamIds: args.offeredTeamIds,
      requestedTeamIds: args.requestedTeamIds,
      message: args.message,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });
    
    return tradeId;
  },
});

// Accept or reject a trade proposal
export const respondToTrade = mutation({
  args: {
    tradeId: v.id("tradeProposals"),
    userId: v.string(),
    action: v.union(v.literal("ACCEPT"), v.literal("REJECT")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) {
      throw new Error("Trade proposal not found");
    }
    
    if (trade.toUserId !== args.userId) {
      throw new Error("Only the recipient can respond to this trade");
    }
    
    if (trade.status !== "PENDING") {
      throw new Error("Trade proposal is no longer pending");
    }
    
    if (args.action === "REJECT") {
      await ctx.db.patch(args.tradeId, {
        status: "REJECTED",
        updatedAt: now,
      });
      return { success: true, message: "Trade rejected" };
    }
    
    // Accept trade - swap team ownership
    for (const teamId of trade.offeredTeamIds) {
      const roster = await ctx.db
        .query("playerRosters")
        .withIndex("by_user_draft", q => 
          q.eq("userId", trade.fromUserId).eq("draftRoomId", trade.draftRoomId)
        )
        .filter(q => q.eq(q.field("teamId"), teamId))
        .first();
      
      if (roster) {
        await ctx.db.patch(roster._id, {
          userId: trade.toUserId,
          acquisitionType: "trade",
          acquisitionDate: now,
          updatedAt: now,
        });
      }
    }
    
    for (const teamId of trade.requestedTeamIds) {
      const roster = await ctx.db
        .query("playerRosters")
        .withIndex("by_user_draft", q => 
          q.eq("userId", trade.toUserId).eq("draftRoomId", trade.draftRoomId)
        )
        .filter(q => q.eq(q.field("teamId"), teamId))
        .first();
      
      if (roster) {
        await ctx.db.patch(roster._id, {
          userId: trade.fromUserId,
          acquisitionType: "trade",
          acquisitionDate: now,
          updatedAt: now,
        });
      }
    }
    
    await ctx.db.patch(args.tradeId, {
      status: "ACCEPTED",
      updatedAt: now,
    });
    
    return { success: true, message: "Trade completed successfully" };
  },
});

// Waiver wire system - add team to waiver wire
export const addToWaiverWire = mutation({
  args: {
    userId: v.string(),
    draftRoomId: v.string(),
    teamId: v.string(),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Check if team is already on waiver wire
    const existingWaiver = await ctx.db
      .query("waiverClaims")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .filter(q => 
        q.and(
          q.eq(q.field("teamId"), args.teamId),
          q.eq(q.field("status"), "PENDING")
        )
      )
      .first();
    
    if (existingWaiver) {
      throw new Error("Team is already on waiver wire");
    }
    
    // Get user's current waiver priority
    const userPriority = args.priority || await getUserWaiverPriority(ctx, args.userId, args.draftRoomId);
    
    const waiverClaimId = await ctx.db.insert("waiverClaims", {
      userId: args.userId,
      draftRoomId: args.draftRoomId,
      teamId: args.teamId,
      priority: userPriority,
      status: "PENDING",
      claimType: "ADD",
      createdAt: now,
      updatedAt: now,
    });
    
    return waiverClaimId;
  },
});

// Process waiver wire claims (typically run on a schedule)
export const processWaiverClaims = mutation({
  args: {
    draftRoomId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Get all pending waiver claims for this draft room, ordered by priority
    const pendingClaims = await ctx.db
      .query("waiverClaims")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .filter(q => q.eq(q.field("status"), "PENDING"))
      .collect();
    
    // Sort by priority (lower number = higher priority)
    const sortedClaims = pendingClaims.sort((a, b) => a.priority - b.priority);
    
    const processedClaims = [];
    
    for (const claim of sortedClaims) {
      try {
        if (claim.claimType === "ADD") {
          // Check if team is still available (not on anyone's roster)
          const existingRoster = await ctx.db
            .query("playerRosters")
            .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
            .filter(q => q.eq(q.field("teamId"), claim.teamId))
            .first();
          
          if (!existingRoster) {
            // Add team to user's roster
            await ctx.db.insert("playerRosters", {
              userId: claim.userId,
              draftRoomId: claim.draftRoomId,
              teamId: claim.teamId,
              isStarting: false,
              acquisitionType: "waiver",
              acquisitionDate: now,
              totalPointsScored: 0,
              weeksStarted: 0,
              createdAt: now,
              updatedAt: now,
            });
            
            await ctx.db.patch(claim._id, {
              status: "APPROVED",
              updatedAt: now,
            });
            
            processedClaims.push({ claimId: claim._id, status: "APPROVED" });
          } else {
            await ctx.db.patch(claim._id, {
              status: "REJECTED",
              updatedAt: now,
            });
            
            processedClaims.push({ claimId: claim._id, status: "REJECTED" });
          }
        }
      } catch (error) {
        await ctx.db.patch(claim._id, {
          status: "ERROR",
          updatedAt: now,
        });
        
        processedClaims.push({ claimId: claim._id, status: "ERROR" });
      }
    }
    
    return processedClaims;
  },
});

// Helper function to get user's waiver priority
async function getUserWaiverPriority(ctx: any, userId: string, draftRoomId: string): Promise<number> {
  // Get user's current standings (lower rank = higher waiver priority)
  const standings = await ctx.db
    .query("leagueWeeklyScores")
    .withIndex("by_league_year", (q: any) => q.eq("draftRoomId", draftRoomId).eq("year", 2024))
    .collect();
  
  // Group by user and calculate totals
  const userTotals = new Map<string, number>();
  for (const score of standings) {
    const existing = userTotals.get(score.userId) || 0;
    userTotals.set(score.userId, existing + score.weeklyPoints);
  }
  
  // Sort by total points (ascending for waiver priority)
  const sortedUsers = Array.from(userTotals.entries())
    .sort((a, b) => a[1] - b[1]);
  
  const userIndex = sortedUsers.findIndex(([id]) => id === userId);
  return userIndex >= 0 ? userIndex + 1 : 999; // Default to low priority if not found
}

// Notification system - create notification
export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    priority: v.optional(v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"))),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      data: args.data,
      priority: args.priority || "MEDIUM",
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });
    
    return notificationId;
  },
});

// Get user notifications
export const getUserNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", q => q.eq("userId", args.userId));
    
    if (args.unreadOnly) {
      query = query.filter(q => q.eq(q.field("isRead"), false));
    }
    
    const notifications = await query
      .order("desc")
      .take(limit);
    
    return notifications;
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification || notification.userId !== args.userId) {
      throw new Error("Notification not found or access denied");
    }
    
    await ctx.db.patch(args.notificationId, {
      isRead: true,
      updatedAt: new Date().toISOString(),
    });
    
    return true;
  },
});

// Advanced analytics - get league insights
export const getLeagueInsights = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all league data
    const weeklyScores = await ctx.db
      .query("leagueWeeklyScores")
      .withIndex("by_league_year", q => 
        q.eq("draftRoomId", args.draftRoomId).eq("year", args.year)
      )
      .collect();
    
    const trades = await ctx.db
      .query("tradeProposals")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.draftRoomId),
          q.eq(q.field("status"), "ACCEPTED")
        )
      )
      .collect();
    
    const waiverClaims = await ctx.db
      .query("waiverClaims")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .filter(q => q.eq(q.field("status"), "APPROVED"))
      .collect();
    
    // Calculate insights
    const totalTrades = trades.length;
    const totalWaiverClaims = waiverClaims.length;
    const activeUsers = new Set(weeklyScores.map(s => s.userId)).size;
    
    // Most active trader
    const tradeActivity = new Map<string, number>();
    for (const trade of trades) {
      tradeActivity.set(trade.fromUserId, (tradeActivity.get(trade.fromUserId) || 0) + 1);
      tradeActivity.set(trade.toUserId, (tradeActivity.get(trade.toUserId) || 0) + 1);
    }
    
    const mostActiveTrader = Array.from(tradeActivity.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    // League activity score (trades + waiver claims per user)
    const activityScore = (totalTrades + totalWaiverClaims) / Math.max(activeUsers, 1);
    
    return {
      totalTrades,
      totalWaiverClaims,
      activeUsers,
      mostActiveTrader: mostActiveTrader ? {
        userId: mostActiveTrader[0],
        tradeCount: mostActiveTrader[1],
      } : null,
      activityScore: Math.round(activityScore * 100) / 100,
      engagementLevel: activityScore > 2 ? "HIGH" : activityScore > 1 ? "MEDIUM" : "LOW",
    };
  },
});

// Mobile API - get dashboard summary for mobile apps
export const getMobileDashboard = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user's active leagues
    const userParticipations = await ctx.db
      .query("draftParticipants")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();
    
    const activeLeagues = [];
    for (const participation of userParticipations) {
      const draftRoom = await ctx.db.get(participation.draftRoomId as Id<"draftRooms">);
      if (draftRoom) {
        activeLeagues.push({
          id: draftRoom._id,
          name: draftRoom.name,
          status: draftRoom.status,
        });
      }
    }
    
    // Get recent notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.eq(q.field("isRead"), false))
      .order("desc")
      .take(5);
    
    // Get pending trades
    const pendingTrades = await ctx.db
      .query("tradeProposals")
      .filter(q => 
        q.and(
          q.eq(q.field("toUserId"), args.userId),
          q.eq(q.field("status"), "PENDING")
        )
      )
      .collect();
    
    return {
      activeLeagues,
      unreadNotifications: notifications.length,
      pendingTrades: pendingTrades.length,
      recentActivity: {
        notifications: notifications.slice(0, 3),
        trades: pendingTrades.slice(0, 2),
      },
    };
  },
});

// Get incoming trade proposals for a user
export const getIncomingTrades = query({
  args: {
    userId: v.string(),
    draftRoomId: v.string(),
  },
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query("tradeProposals")
      .filter(q => 
        q.and(
          q.eq(q.field("toUserId"), args.userId),
          q.eq(q.field("draftRoomId"), args.draftRoomId)
        )
      )
      .order("desc")
      .collect();
    
    // Enrich with user and team data
    const enrichedTrades = [];
    for (const trade of trades) {
      const fromUser = await ctx.db.get(trade.fromUserId as Id<"users">);
      const toUser = await ctx.db.get(trade.toUserId as Id<"users">);
      
      // Get team details for offered teams
      const offeredTeams = [];
      for (const teamId of trade.offeredTeamIds) {
        const team = await ctx.db
          .query("teams")
          .withIndex("by_teamId", q => q.eq("teamId", teamId))
          .first();
        if (team) {
          offeredTeams.push({
            teamId: team.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
          });
        }
      }
      
      // Get team details for requested teams
      const requestedTeams = [];
      for (const teamId of trade.requestedTeamIds) {
        const team = await ctx.db
          .query("teams")
          .withIndex("by_teamId", q => q.eq("teamId", teamId))
          .first();
        if (team) {
          requestedTeams.push({
            teamId: team.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
          });
        }
      }
      
      enrichedTrades.push({
        ...trade,
        fromUser: fromUser ? {
          _id: fromUser._id,
          name: fromUser.name,
          email: fromUser.email,
        } : null,
        toUser: toUser ? {
          _id: toUser._id,
          name: toUser.name,
          email: toUser.email,
        } : null,
        offeredTeams,
        requestedTeams,
      });
    }
    
    return enrichedTrades;
  },
});

// Get outgoing trade proposals for a user
export const getOutgoingTrades = query({
  args: {
    userId: v.string(),
    draftRoomId: v.string(),
  },
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query("tradeProposals")
      .filter(q => 
        q.and(
          q.eq(q.field("fromUserId"), args.userId),
          q.eq(q.field("draftRoomId"), args.draftRoomId)
        )
      )
      .order("desc")
      .collect();
    
    // Enrich with user and team data
    const enrichedTrades = [];
    for (const trade of trades) {
      const fromUser = await ctx.db.get(trade.fromUserId as Id<"users">);
      const toUser = await ctx.db.get(trade.toUserId as Id<"users">);
      
      // Get team details for offered teams
      const offeredTeams = [];
      for (const teamId of trade.offeredTeamIds) {
        const team = await ctx.db
          .query("teams")
          .withIndex("by_teamId", q => q.eq("teamId", teamId))
          .first();
        if (team) {
          offeredTeams.push({
            teamId: team.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
          });
        }
      }
      
      // Get team details for requested teams
      const requestedTeams = [];
      for (const teamId of trade.requestedTeamIds) {
        const team = await ctx.db
          .query("teams")
          .withIndex("by_teamId", q => q.eq("teamId", teamId))
          .first();
        if (team) {
          requestedTeams.push({
            teamId: team.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
          });
        }
      }
      
      enrichedTrades.push({
        ...trade,
        fromUser: fromUser ? {
          _id: fromUser._id,
          name: fromUser.name,
          email: fromUser.email,
        } : null,
        toUser: toUser ? {
          _id: toUser._id,
          name: toUser.name,
          email: toUser.email,
        } : null,
        offeredTeams,
        requestedTeams,
      });
    }
    
    return enrichedTrades;
  },
}); 