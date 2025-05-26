import { mutation, query, internalMutation } from "./_generated/server";
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
export const calculateWeeklyScores = internalMutation({
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

// ===== PHASE 6: HEAD-TO-HEAD MATCHUPS =====

// Create season schedule after draft completion
export const createSeasonSchedule = mutation({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    totalWeeks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const totalWeeks = args.totalWeeks || 8; // Default 8-week season
    
    // Get all participants in the league
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    if (participants.length < 2) {
      throw new Error("Need at least 2 participants to create a schedule");
    }
    
    // Check if schedule already exists
    const existingSchedule = await ctx.db
      .query("headToHeadMatchups")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.draftRoomId),
          q.eq(q.field("year"), args.year)
        )
      )
      .first();
    
    if (existingSchedule) {
      throw new Error("Schedule already exists for this league and year");
    }
    
    const userIds = participants.map(p => p.userId);
    const matchups = [];
    
    // Generate round-robin style schedule
    for (let week = 1; week <= totalWeeks; week++) {
      const weekMatchups = generateWeekMatchups(userIds, week);
      
      for (const matchup of weekMatchups) {
        matchups.push({
          draftRoomId: args.draftRoomId,
          year: args.year,
          week,
          user1Id: matchup.user1,
          user2Id: matchup.user2,
          status: "SCHEDULED" as const,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    
    // Insert all matchups
    const matchupIds = [];
    for (const matchup of matchups) {
      const id = await ctx.db.insert("headToHeadMatchups", matchup);
      matchupIds.push(id);
    }
    
    return { 
      message: `Created ${matchups.length} matchups for ${totalWeeks} weeks`,
      matchupIds 
    };
  },
});

// Internal function for creating season schedule (used by draft completion)
export const createSeasonScheduleInternal = async (ctx: any, args: {
  draftRoomId: string;
  year: number;
  totalWeeks?: number;
}) => {
  const now = new Date().toISOString();
  const totalWeeks = args.totalWeeks || 8; // Default 8-week season
  
  // Get all participants in the league
  const participants = await ctx.db
    .query("draftParticipants")
    .withIndex("by_draft_room", (q: any) => q.eq("draftRoomId", args.draftRoomId))
    .collect();
  
  if (participants.length < 2) {
    return { message: "Need at least 2 participants to create a schedule", matchupIds: [] };
  }
  
  // Check if schedule already exists
  const existingSchedule = await ctx.db
    .query("headToHeadMatchups")
    .filter((q: any) => 
      q.and(
        q.eq(q.field("draftRoomId"), args.draftRoomId),
        q.eq(q.field("year"), args.year)
      )
    )
    .first();
  
  if (existingSchedule) {
    return { message: "Schedule already exists for this league and year", matchupIds: [] };
  }
  
  const userIds = participants.map((p: any) => p.userId);
  const matchups = [];
  
  // Generate round-robin style schedule
  for (let week = 1; week <= totalWeeks; week++) {
    const weekMatchups = generateWeekMatchups(userIds, week);
    
    for (const matchup of weekMatchups) {
      matchups.push({
        draftRoomId: args.draftRoomId,
        year: args.year,
        week,
        user1Id: matchup.user1,
        user2Id: matchup.user2,
        status: "SCHEDULED" as const,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  
  // Insert all matchups
  const matchupIds = [];
  for (const matchup of matchups) {
    const id = await ctx.db.insert("headToHeadMatchups", matchup);
    matchupIds.push(id);
  }
  
  return { 
    message: `Created ${matchups.length} matchups for ${totalWeeks} weeks`,
    matchupIds 
  };
};

// Helper function to generate weekly matchups
function generateWeekMatchups(userIds: string[], week: number): Array<{user1: string, user2: string}> {
  const matchups = [];
  const users = [...userIds];
  
  // If odd number of users, add a "bye" placeholder
  if (users.length % 2 === 1) {
    users.push("BYE");
  }
  
  const numUsers = users.length;
  const numRounds = numUsers - 1;
  const matchupsPerRound = numUsers / 2;
  
  // Use round-robin algorithm with rotation
  const roundIndex = (week - 1) % numRounds;
  
  // Fixed first user, rotate others
  const rotatedUsers = [users[0]];
  for (let i = 1; i < numUsers; i++) {
    const rotatedIndex = ((i - 1 + roundIndex) % (numUsers - 1)) + 1;
    rotatedUsers.push(users[rotatedIndex]);
  }
  
  // Pair users
  for (let i = 0; i < matchupsPerRound; i++) {
    const user1 = rotatedUsers[i];
    const user2 = rotatedUsers[numUsers - 1 - i];
    
    // Skip if either user is "BYE"
    if (user1 !== "BYE" && user2 !== "BYE") {
      matchups.push({ user1, user2 });
    }
  }
  
  return matchups;
}

// Get matchups for a specific week
export const getWeeklyMatchups = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const matchups = await ctx.db
      .query("headToHeadMatchups")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.draftRoomId),
          q.eq(q.field("year"), args.year),
          q.eq(q.field("week"), args.week)
        )
      )
      .collect();
    
    // Enrich with user data and scores
    const enrichedMatchups = [];
    for (const matchup of matchups) {
      const user1 = await ctx.db.get(matchup.user1Id as Id<"users">);
      const user2 = await ctx.db.get(matchup.user2Id as Id<"users">);
      
      // Get weekly scores for both users
      const user1Score = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_user_week", q => 
          q.eq("draftRoomId", args.draftRoomId)
           .eq("userId", matchup.user1Id)
           .eq("year", args.year)
           .eq("week", args.week)
        )
        .first();
      
      const user2Score = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_user_week", q => 
          q.eq("draftRoomId", args.draftRoomId)
           .eq("userId", matchup.user2Id)
           .eq("year", args.year)
           .eq("week", args.week)
        )
        .first();
      
      enrichedMatchups.push({
        ...matchup,
        user1: user1 ? {
          _id: user1._id,
          name: user1.name,
          email: user1.email,
        } : null,
        user2: user2 ? {
          _id: user2._id,
          name: user2.name,
          email: user2.email,
        } : null,
        user1Score: user1Score?.weeklyPoints || 0,
        user2Score: user2Score?.weeklyPoints || 0,
      });
    }
    
    return enrichedMatchups;
  },
});

// Process weekly matchup results
export const processWeeklyMatchups = mutation({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Get all matchups for this week
    const matchups = await ctx.db
      .query("headToHeadMatchups")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.draftRoomId),
          q.eq(q.field("year"), args.year),
          q.eq(q.field("week"), args.week)
        )
      )
      .collect();
    
    const results = [];
    
    for (const matchup of matchups) {
      // Get weekly scores for both users
      const user1Score = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_user_week", q => 
          q.eq("draftRoomId", args.draftRoomId)
           .eq("userId", matchup.user1Id)
           .eq("year", args.year)
           .eq("week", args.week)
        )
        .first();
      
      const user2Score = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_user_week", q => 
          q.eq("draftRoomId", args.draftRoomId)
           .eq("userId", matchup.user2Id)
           .eq("year", args.year)
           .eq("week", args.week)
        )
        .first();
      
      if (!user1Score || !user2Score) {
        // Skip if scores aren't available yet
        continue;
      }
      
      // Determine winner
      let winnerId: string | null = null;
      let status: "COMPLETED" | "TIE" = "COMPLETED";
      
      if (user1Score.weeklyPoints > user2Score.weeklyPoints) {
        winnerId = matchup.user1Id;
      } else if (user2Score.weeklyPoints > user1Score.weeklyPoints) {
        winnerId = matchup.user2Id;
      } else {
        status = "TIE";
      }
      
      // Update matchup with results
      await ctx.db.patch(matchup._id, {
        status,
        winnerId: winnerId || undefined,
        user1Score: user1Score.weeklyPoints,
        user2Score: user2Score.weeklyPoints,
        completedAt: now,
        updatedAt: now,
      });
      
      results.push({
        matchupId: matchup._id,
        status,
        winnerId,
        user1Score: user1Score.weeklyPoints,
        user2Score: user2Score.weeklyPoints,
      });
    }
    
    return results;
  },
});

// Get head-to-head record between two users
export const getHeadToHeadRecord = query({
  args: {
    draftRoomId: v.string(),
    user1Id: v.string(),
    user2Id: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all matchups between these two users
    const matchups = await ctx.db
      .query("headToHeadMatchups")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.draftRoomId),
          q.eq(q.field("year"), args.year),
          q.or(
            q.and(
              q.eq(q.field("user1Id"), args.user1Id),
              q.eq(q.field("user2Id"), args.user2Id)
            ),
            q.and(
              q.eq(q.field("user1Id"), args.user2Id),
              q.eq(q.field("user2Id"), args.user1Id)
            )
          )
        )
      )
      .collect();
    
    let user1Wins = 0;
    let user2Wins = 0;
    let ties = 0;
    let totalPointsUser1 = 0;
    let totalPointsUser2 = 0;
    
    const gameHistory = [];
    
    for (const matchup of matchups) {
      if (matchup.status === "COMPLETED" || matchup.status === "TIE") {
        const isUser1First = matchup.user1Id === args.user1Id;
        const user1Points = isUser1First ? (matchup.user1Score || 0) : (matchup.user2Score || 0);
        const user2Points = isUser1First ? (matchup.user2Score || 0) : (matchup.user1Score || 0);
        
        totalPointsUser1 += user1Points;
        totalPointsUser2 += user2Points;
        
        if (matchup.status === "TIE") {
          ties++;
        } else if (matchup.winnerId === args.user1Id) {
          user1Wins++;
        } else if (matchup.winnerId === args.user2Id) {
          user2Wins++;
        }
        
        gameHistory.push({
          week: matchup.week,
          user1Points,
          user2Points,
          winner: matchup.winnerId,
          status: matchup.status,
          completedAt: matchup.completedAt,
        });
      }
    }
    
    // Sort by week
    gameHistory.sort((a, b) => a.week - b.week);
    
    return {
      user1Wins,
      user2Wins,
      ties,
      totalGames: user1Wins + user2Wins + ties,
      totalPointsUser1: Math.round(totalPointsUser1 * 100) / 100,
      totalPointsUser2: Math.round(totalPointsUser2 * 100) / 100,
      averagePointsUser1: gameHistory.length > 0 ? Math.round((totalPointsUser1 / gameHistory.length) * 100) / 100 : 0,
      averagePointsUser2: gameHistory.length > 0 ? Math.round((totalPointsUser2 / gameHistory.length) * 100) / 100 : 0,
      gameHistory,
    };
  },
});

// Get overall head-to-head standings
export const getHeadToHeadStandings = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all completed matchups
    const matchups = await ctx.db
      .query("headToHeadMatchups")
      .filter(q => 
        q.and(
          q.eq(q.field("draftRoomId"), args.draftRoomId),
          q.eq(q.field("year"), args.year),
          q.or(
            q.eq(q.field("status"), "COMPLETED"),
            q.eq(q.field("status"), "TIE")
          )
        )
      )
      .collect();
    
    // Calculate records for each user
    const userRecords = new Map<string, {
      userId: string;
      wins: number;
      losses: number;
      ties: number;
      pointsFor: number;
      pointsAgainst: number;
    }>();
    
    for (const matchup of matchups) {
      // Initialize records if not exists
      if (!userRecords.has(matchup.user1Id)) {
        userRecords.set(matchup.user1Id, {
          userId: matchup.user1Id,
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        });
      }
      if (!userRecords.has(matchup.user2Id)) {
        userRecords.set(matchup.user2Id, {
          userId: matchup.user2Id,
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        });
      }
      
      const user1Record = userRecords.get(matchup.user1Id)!;
      const user2Record = userRecords.get(matchup.user2Id)!;
      
      const user1Score = matchup.user1Score || 0;
      const user2Score = matchup.user2Score || 0;
      
      user1Record.pointsFor += user1Score;
      user1Record.pointsAgainst += user2Score;
      user2Record.pointsFor += user2Score;
      user2Record.pointsAgainst += user1Score;
      
      if (matchup.status === "TIE") {
        user1Record.ties++;
        user2Record.ties++;
      } else if (matchup.winnerId === matchup.user1Id) {
        user1Record.wins++;
        user2Record.losses++;
      } else if (matchup.winnerId === matchup.user2Id) {
        user2Record.wins++;
        user1Record.losses++;
      }
    }
    
    // Convert to array and calculate additional stats
    const standings = Array.from(userRecords.values()).map(record => ({
      ...record,
      totalGames: record.wins + record.losses + record.ties,
      winPercentage: record.wins + record.losses > 0 ? 
        Math.round((record.wins / (record.wins + record.losses + record.ties * 0.5)) * 1000) / 10 : 0,
      pointDifferential: Math.round((record.pointsFor - record.pointsAgainst) * 100) / 100,
      averagePointsFor: record.wins + record.losses + record.ties > 0 ? 
        Math.round((record.pointsFor / (record.wins + record.losses + record.ties)) * 100) / 100 : 0,
      averagePointsAgainst: record.wins + record.losses + record.ties > 0 ? 
        Math.round((record.pointsAgainst / (record.wins + record.losses + record.ties)) * 100) / 100 : 0,
    }));
    
    // Sort by win percentage, then by point differential
    standings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.pointDifferential - a.pointDifferential;
    });
    
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

// Get all participants for head-to-head dropdown
export const getLeagueParticipants = query({
  args: {
    draftRoomId: v.string(),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    const enrichedParticipants = [];
    for (const participant of participants) {
      const user = await ctx.db.get(participant.userId as Id<"users">);
      if (user) {
        enrichedParticipants.push({
          userId: participant.userId,
          name: user.name || user.email || 'Unknown User',
          email: user.email,
        });
      }
    }
    
    return enrichedParticipants.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// ===== TESTING & DATA GENERATION =====

// Generate sample team performance data for testing
export const generateSampleTeamPerformances = mutation({
  args: {
    year: v.number(),
    week: v.number(),
    teamCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const teamCount = args.teamCount || 50; // Default to 50 teams
    
    const results = [];
    
    // Generate performance data for random teams
    for (let i = 0; i < teamCount; i++) {
      const teamNumber = 100 + Math.floor(Math.random() * 8000); // Random team numbers
      const teamId = `frc${teamNumber}`;
      const eventKey = `2024week${args.week}_event${Math.floor(i / 10) + 1}`;
      
      // Generate realistic performance based on team number (lower = historically better)
      const teamStrength = teamNumber <= 1000 ? 0.8 : teamNumber <= 3000 ? 0.6 : teamNumber <= 6000 ? 0.4 : 0.3;
      const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2 multiplier
      const performance = teamStrength * randomFactor;
      
      // Generate qualification record (10-12 matches typical)
      const totalQualMatches = 10 + Math.floor(Math.random() * 3);
      const winRate = Math.min(0.9, Math.max(0.1, performance));
      const qualWins = Math.floor(totalQualMatches * winRate);
      const qualLosses = totalQualMatches - qualWins;
      const qualTies = 0; // Rare in modern FRC
      
      // Playoff performance (top 8 teams make playoffs)
      const madePlayoffs = performance > 0.5 && Math.random() > 0.3;
      let playoffWins = 0;
      let playoffLosses = 0;
      
      if (madePlayoffs) {
        // Simulate playoff bracket
        const playoffPerformance = performance * (Math.random() * 0.4 + 0.8);
        if (playoffPerformance > 0.8) {
          playoffWins = 4; // Won event
          playoffLosses = 0;
        } else if (playoffPerformance > 0.7) {
          playoffWins = 3; // Lost in finals
          playoffLosses = 1;
        } else if (playoffPerformance > 0.6) {
          playoffWins = 2; // Lost in semifinals
          playoffLosses = 1;
        } else {
          playoffWins = 1; // Lost in quarterfinals
          playoffLosses = 1;
        }
      }
      
      // Ranking (1-60 typical for regionals)
      const rank = Math.floor((1 - performance) * 60) + 1;
      const rankingScore = Math.floor(performance * 100 + Math.random() * 20);
      
      // Calculate points using our scoring system
      const points = calculateEventPoints(
        qualWins,
        qualLosses,
        qualTies,
        totalQualMatches,
        playoffWins,
        playoffLosses,
        madePlayoffs
      );
      
      // Check if performance already exists
      const existingPerformance = await ctx.db
        .query("teamEventPerformances")
        .withIndex("by_team_event", q => 
          q.eq("teamId", teamId).eq("eventKey", eventKey)
        )
        .first();
      
          if (!existingPerformance) {
      // Ensure team exists in database
      await ensureTeamExists(ctx, teamId, teamNumber);
      
      const performanceId = await ctx.db.insert("teamEventPerformances", {
        teamId,
        eventKey,
        year: args.year,
        week: args.week,
        qualWins,
        qualLosses,
        qualTies,
        totalQualMatches,
        playoffWins,
        playoffLosses,
        madePlayoffs,
        rank,
        rankingScore,
        basePoints: points.basePoints,
        qualPoints: points.qualPoints,
        playoffPoints: points.playoffPoints,
        totalPoints: points.totalPoints,
        createdAt: now,
        updatedAt: now,
      });
      results.push(performanceId);
    }
    }
    
    return {
      message: `Generated ${results.length} team performances for ${args.year} Week ${args.week}`,
      performanceIds: results,
    };
  },
});

// Generate sample data for multiple weeks
export const generateSampleSeasonData = mutation({
  args: {
    year: v.number(),
    weeks: v.array(v.number()),
    teamsPerWeek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const teamsPerWeek = args.teamsPerWeek || 50;
    const results = [];
    
    for (const week of args.weeks) {
      // Generate team performances
      const performanceResult = await generateSampleTeamPerformancesInternal(ctx, {
        year: args.year,
        week,
        teamCount: teamsPerWeek,
      });
      
      // Calculate weekly scores
      const weeklyScoreResult = await calculateWeeklyScoresInternal(ctx, {
        year: args.year,
        week,
      });
      
      results.push({
        week,
        performances: performanceResult.performanceIds.length,
        weeklyScores: weeklyScoreResult.length,
      });
    }
    
    return {
      message: `Generated sample data for ${args.weeks.length} weeks`,
      results,
    };
  },
});

// Helper function to generate team performances internally
const generateSampleTeamPerformancesInternal = async (ctx: any, args: { year: number; week: number; teamCount: number }) => {
  const now = new Date().toISOString();
  const results = [];
  
  // Generate performance data for random teams
  for (let i = 0; i < args.teamCount; i++) {
    const teamNumber = 100 + Math.floor(Math.random() * 8000); // Random team numbers
    const teamId = `frc${teamNumber}`;
    const eventKey = `2024week${args.week}_event${Math.floor(i / 10) + 1}`;
    
    // Generate realistic performance based on team number (lower = historically better)
    const teamStrength = teamNumber <= 1000 ? 0.8 : teamNumber <= 3000 ? 0.6 : teamNumber <= 6000 ? 0.4 : 0.3;
    const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2 multiplier
    const performance = teamStrength * randomFactor;
    
    // Generate qualification record (10-12 matches typical)
    const totalQualMatches = 10 + Math.floor(Math.random() * 3);
    const winRate = Math.min(0.9, Math.max(0.1, performance));
    const qualWins = Math.floor(totalQualMatches * winRate);
    const qualLosses = totalQualMatches - qualWins;
    const qualTies = 0; // Rare in modern FRC
    
    // Playoff performance (top 8 teams make playoffs)
    const madePlayoffs = performance > 0.5 && Math.random() > 0.3;
    let playoffWins = 0;
    let playoffLosses = 0;
    
    if (madePlayoffs) {
      // Simulate playoff bracket
      const playoffPerformance = performance * (Math.random() * 0.4 + 0.8);
      if (playoffPerformance > 0.8) {
        playoffWins = 4; // Won event
        playoffLosses = 0;
      } else if (playoffPerformance > 0.7) {
        playoffWins = 3; // Lost in finals
        playoffLosses = 1;
      } else if (playoffPerformance > 0.6) {
        playoffWins = 2; // Lost in semifinals
        playoffLosses = 1;
      } else {
        playoffWins = 1; // Lost in quarterfinals
        playoffLosses = 1;
      }
    }
    
    // Ranking (1-60 typical for regionals)
    const rank = Math.floor((1 - performance) * 60) + 1;
    const rankingScore = Math.floor(performance * 100 + Math.random() * 20);
    
    // Calculate points using our scoring system
    const points = calculateEventPoints(
      qualWins,
      qualLosses,
      qualTies,
      totalQualMatches,
      playoffWins,
      playoffLosses,
      madePlayoffs
    );
    
    // Check if performance already exists
    const existingPerformance = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_team_event", (q: any) => 
        q.eq("teamId", teamId).eq("eventKey", eventKey)
      )
      .first();
    
    if (!existingPerformance) {
      // Ensure team exists in database
      await ensureTeamExists(ctx, teamId, teamNumber);
      
      const performanceId = await ctx.db.insert("teamEventPerformances", {
        teamId,
        eventKey,
        year: args.year,
        week: args.week,
        qualWins,
        qualLosses,
        qualTies,
        totalQualMatches,
        playoffWins,
        playoffLosses,
        madePlayoffs,
        rank,
        rankingScore,
        basePoints: points.basePoints,
        qualPoints: points.qualPoints,
        playoffPoints: points.playoffPoints,
        totalPoints: points.totalPoints,
        createdAt: now,
        updatedAt: now,
      });
      results.push(performanceId);
    }
  }
  
  return {
    message: `Generated ${results.length} team performances for ${args.year} Week ${args.week}`,
    performanceIds: results,
  };
};

// Helper function to call calculateWeeklyScores internally
const calculateWeeklyScoresInternal = async (ctx: any, args: { year: number; week: number }) => {
  const now = new Date().toISOString();
  
  // Get all team performances for this week
  const weekPerformances = await ctx.db
    .query("teamEventPerformances")
    .withIndex("by_year_week", (q: any) => 
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
      .withIndex("by_team_year", (q: any) => 
        q.eq("teamId", teamId).eq("year", args.year)
      )
      .filter((q: any) => q.lt(q.field("week"), args.week))
      .collect();
    
    const seasonPoints = previousWeeks.reduce((sum: number, week: any) => sum + week.weeklyPoints, 0) + weekData.totalPoints;
    
    // Check if weekly score already exists
    const existingWeeklyScore = await ctx.db
      .query("weeklyTeamScores")
      .withIndex("by_team_year_week", (q: any) => 
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
};

// ===== PHASE 6: ADVANCED FEATURES & INTEGRATIONS =====

// Get detailed league weekly scores with team breakdowns
export const getLeagueWeeklyScoresDetailed = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const weeklyScores = await ctx.db
      .query("leagueWeeklyScores")
      .withIndex("by_league_year_week", q => 
        q.eq("draftRoomId", args.draftRoomId)
         .eq("year", args.year)
         .eq("week", args.week)
      )
      .collect();
    
    // Enrich with user data and team details
    const enrichedScores = [];
    for (const score of weeklyScores) {
      const user = await ctx.db.get(score.userId as Id<"users">);
      
      // Get team details for each team score
      const teamDetails = [];
      for (const teamScore of score.teamScores || []) {
        const team = await ctx.db
          .query("teams")
          .withIndex("by_teamId", q => q.eq("teamId", teamScore.teamId))
          .first();
        
        if (team) {
          teamDetails.push({
            teamId: teamScore.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
            points: teamScore.points,
          });
        }
      }
      
      enrichedScores.push({
        ...score,
        user: user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
        } : null,
        teamDetails: teamDetails.sort((a, b) => a.teamNumber - b.teamNumber),
      });
    }
    
    return enrichedScores.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
  },
});

// Get detailed roster information with team scores for admin
export const getDetailedRosterWithScores = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all participants in the league
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    const detailedRosters = [];
    
    for (const participant of participants) {
      const user = await ctx.db.get(participant.userId as Id<"users">);
      
      // Get user's roster
      const rosterEntries = await ctx.db
        .query("playerRosters")
        .withIndex("by_user_draft", q => 
          q.eq("userId", participant.userId).eq("draftRoomId", args.draftRoomId)
        )
        .collect();
      
      const teams = [];
      let totalStartingPoints = 0;
      let startingTeamCount = 0;
      
      for (const entry of rosterEntries) {
        const team = await ctx.db
          .query("teams")
          .withIndex("by_teamId", q => q.eq("teamId", entry.teamId))
          .first();
        
        // Get weekly score for this team
        const weeklyScore = await ctx.db
          .query("weeklyTeamScores")
          .withIndex("by_team_year_week", q => 
            q.eq("teamId", entry.teamId).eq("year", args.year).eq("week", args.week)
          )
          .first();
        
        const teamPoints = weeklyScore?.weeklyPoints || 0;
        
        if (entry.isStarting) {
          totalStartingPoints += teamPoints;
          startingTeamCount++;
        }
        
        if (team) {
          teams.push({
            teamId: entry.teamId,
            teamNumber: team.teamNumber,
            name: team.name,
            isStarting: entry.isStarting,
            weeklyPoints: teamPoints,
            acquisitionType: entry.acquisitionType,
          });
        }
      }
      
      // Sort teams by team number
      teams.sort((a, b) => a.teamNumber - b.teamNumber);
      
      detailedRosters.push({
        userId: participant.userId,
        user: user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
        } : null,
        teams,
        totalStartingPoints: Math.round(totalStartingPoints * 100) / 100,
        startingTeamCount,
      });
    }
    
    // Sort by total starting points (highest first)
    return detailedRosters.sort((a, b) => b.totalStartingPoints - a.totalStartingPoints);
  },
});

// Helper function to ensure team exists in database
const ensureTeamExists = async (ctx: any, teamId: string, teamNumber: number) => {
  const existingTeam = await ctx.db
    .query("teams")
    .withIndex("by_teamId", (q: any) => q.eq("teamId", teamId))
    .first();
  
  if (!existingTeam) {
    const now = new Date().toISOString();
    await ctx.db.insert("teams", {
      teamId,
      teamNumber,
      name: `Team ${teamNumber}`, // Default name
      createdAt: now,
      updatedAt: now,
    });
  }
};

// Calculate team performance from TBA match data
function calculateTeamPerformanceFromTBA(
  teamKey: string,
  matches: any[],
  eventKey: string
): {
  qualWins: number;
  qualLosses: number;
  qualTies: number;
  totalQualMatches: number;
  playoffWins: number;
  playoffLosses: number;
  madePlayoffs: boolean;
  basePoints: number;
  qualPoints: number;
  playoffPoints: number;
  totalPoints: number;
  rank: number;
  rankingScore: number;
} {
  console.log(`Calculating performance for ${teamKey} with ${matches.length} total matches`);
  
  // Debug: Check first few matches to see their structure
  if (matches.length > 0) {
    const firstMatch = matches[0];
    console.log(`First match structure:`, {
      key: firstMatch.key,
      comp_level: firstMatch.comp_level,
      red_team_keys: firstMatch.alliances?.red?.team_keys,
      blue_team_keys: firstMatch.alliances?.blue?.team_keys,
      red_score: firstMatch.alliances?.red?.score,
      blue_score: firstMatch.alliances?.blue?.score,
    });
  }
  
  const teamMatches = matches.filter(match => 
    match.alliances?.red?.team_keys?.includes(teamKey) || 
    match.alliances?.blue?.team_keys?.includes(teamKey)
  );
  
  console.log(`Found ${teamMatches.length} matches for team ${teamKey}`);

  let qualWins = 0;
  let qualLosses = 0;
  let qualTies = 0;
  let playoffWins = 0;
  let playoffLosses = 0;
  let madePlayoffs = false;

  for (const match of teamMatches) {
    const isRed = match.alliances?.red?.team_keys?.includes(teamKey) || false;
    const isBlue = match.alliances?.blue?.team_keys?.includes(teamKey) || false;
    
    if (!isRed && !isBlue) continue;

    const redScore = match.alliances?.red?.score || 0;
    const blueScore = match.alliances?.blue?.score || 0;
    
    let won = false;
    let tied = false;
    
    if (redScore === blueScore) {
      tied = true;
    } else {
      won = isRed ? redScore > blueScore : blueScore > redScore;
    }

    // Check if it's a qualification match
    if (match.comp_level === 'qm') {
      if (tied) {
        qualTies++;
      } else if (won) {
        qualWins++;
      } else {
        qualLosses++;
      }
    } else {
      // Playoff match
      madePlayoffs = true;
      if (won) {
        playoffWins++;
      } else {
        playoffLosses++;
      }
    }
  }

  const totalQualMatches = qualWins + qualLosses + qualTies;

  // Calculate points using existing logic
  const points = calculateEventPoints(
    qualWins,
    qualLosses,
    qualTies,
    totalQualMatches,
    playoffWins,
    playoffLosses,
    madePlayoffs
  );

  // Estimate rank and ranking score (we don't have this from basic match data)
  const winRate = totalQualMatches > 0 ? (qualWins + qualTies * 0.5) / totalQualMatches : 0;
  const estimatedRank = Math.max(1, Math.floor((1 - winRate) * 50) + 1); // Estimate based on win rate
  const estimatedRankingScore = Math.floor(winRate * 100 + Math.random() * 20); // Rough estimate

  return {
    qualWins,
    qualLosses,
    qualTies,
    totalQualMatches,
    playoffWins,
    playoffLosses,
    madePlayoffs,
    basePoints: points.basePoints,
    qualPoints: points.qualPoints,
    playoffPoints: points.playoffPoints,
    totalPoints: points.totalPoints,
    rank: estimatedRank,
    rankingScore: estimatedRankingScore,
  };
}

// Internal mutation to process event data from TBA
export const processEventDataFromTBA = internalMutation({
  args: {
    eventKey: v.string(),
    year: v.number(),
    week: v.number(),
    teams: v.array(v.object({
      key: v.string(),
      team_number: v.number(),
      nickname: v.string(),
      name: v.string(),
      city: v.string(),
      state_prov: v.string(),
      country: v.string(),
    })),
    matches: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    let teamsProcessed = 0;
    let performancesCreated = 0;

    console.log(`Processing event ${args.eventKey}: ${args.teams.length} teams, ${args.matches.length} matches`);

    // Process each team
    for (const team of args.teams) {
      // Ensure team exists in database
      await ensureTeamExists(ctx, team.key, team.team_number);

      // Calculate performance from real match data
      const performance = calculateTeamPerformanceFromTBA(
        team.key,
        args.matches,
        args.eventKey
      );

      console.log(`Team ${team.key}: ${performance.totalQualMatches} qual matches, ${performance.qualWins}W-${performance.qualLosses}L, ${performance.totalPoints} points`);

      // Only create performance record if team actually played matches (qual or playoff)
      if (performance.totalQualMatches > 0 || (performance.playoffWins + performance.playoffLosses) > 0) {
        // Check if performance already exists
        const existingPerformance = await ctx.db
          .query("teamEventPerformances")
          .withIndex("by_team_event", q => 
            q.eq("teamId", team.key).eq("eventKey", args.eventKey)
          )
          .first();

        if (!existingPerformance) {
          await ctx.db.insert("teamEventPerformances", {
            teamId: team.key,
            eventKey: args.eventKey,
            year: args.year,
            week: args.week,
            qualWins: performance.qualWins,
            qualLosses: performance.qualLosses,
            qualTies: performance.qualTies,
            totalQualMatches: performance.totalQualMatches,
            playoffWins: performance.playoffWins,
            playoffLosses: performance.playoffLosses,
            madePlayoffs: performance.madePlayoffs,
            rank: performance.rank,
            rankingScore: performance.rankingScore,
            basePoints: performance.basePoints,
            qualPoints: performance.qualPoints,
            playoffPoints: performance.playoffPoints,
            totalPoints: performance.totalPoints,
            createdAt: now,
            updatedAt: now,
          });
          performancesCreated++;
          console.log(`Created performance record for ${team.key}`);
        } else {
          console.log(`Performance record already exists for ${team.key}`);
        }

        teamsProcessed++;
      } else {
        console.log(`Team ${team.key} did not play any matches`);
      }
    }

    console.log(`Event ${args.eventKey} processing complete: ${teamsProcessed} teams processed, ${performancesCreated} performances created`);

    return {
      teamsProcessed,
      performancesCreated,
    };
  },
});

// Populate user rosters with generated teams for testing
export const populateTestRosters = mutation({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Get all participants in the league
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    if (participants.length === 0) {
      throw new Error("No participants found in this draft room");
    }
    
    // Get teams that have performance data across multiple weeks (more realistic)
    const allWeekPerformances = await ctx.db
      .query("teamEventPerformances")
      .filter(q => q.eq(q.field("year"), args.year))
      .collect();
    
    if (allWeekPerformances.length === 0) {
      throw new Error("No team performance data found for this year. Generate team data first.");
    }
    
    // Get teams with their week participation
    const teamWeekMap = new Map<string, Set<number>>();
    for (const perf of allWeekPerformances) {
      if (!teamWeekMap.has(perf.teamId)) {
        teamWeekMap.set(perf.teamId, new Set());
      }
      teamWeekMap.get(perf.teamId)!.add(perf.week || 1);
    }
    
    // Prioritize teams that compete in multiple weeks (more valuable for fantasy)
    const teamsByValue = Array.from(teamWeekMap.entries())
      .map(([teamId, weeks]) => ({
        teamId,
        weekCount: weeks.size,
        weeks: Array.from(weeks),
      }))
      .sort((a, b) => b.weekCount - a.weekCount); // Teams with more weeks first
    
    if (teamsByValue.length < participants.length * 5) {
      throw new Error(`Not enough teams available. Need at least 5 teams per participant. Found ${teamsByValue.length} teams.`);
    }
    
    const results = [];
    let teamIndex = 0;
    
    for (const participant of participants) {
      // Check if user already has teams
      const existingRoster = await ctx.db
        .query("playerRosters")
        .withIndex("by_user_draft", q => 
          q.eq("userId", participant.userId).eq("draftRoomId", args.draftRoomId)
        )
        .first();
      
      if (existingRoster) {
        continue; // Skip if user already has teams
      }
      
      // Assign 8 teams to each user (5 starting, 3 bench)
      // Give each user a mix of high-value (multi-week) and single-week teams
      for (let i = 0; i < 8; i++) {
        if (teamIndex >= teamsByValue.length) {
          teamIndex = 0; // Wrap around if we run out of teams
        }
        
        const teamData = teamsByValue[teamIndex];
        const isStarting = i < 5; // First 5 teams are starting
        
        const rosterId = await ctx.db.insert("playerRosters", {
          userId: participant.userId,
          draftRoomId: args.draftRoomId,
          teamId: teamData.teamId,
          isStarting,
          acquisitionType: "draft",
          acquisitionDate: now,
          totalPointsScored: 0,
          weeksStarted: 0,
          createdAt: now,
          updatedAt: now,
        });
        
        results.push(rosterId);
        teamIndex++;
      }
    }
    
    return {
      message: `Populated rosters for ${participants.length} users with ${results.length} total team assignments from ${teamsByValue.length} available teams`,
      rosterIds: results,
      teamsAvailable: teamsByValue.length,
      averageWeeksPerTeam: Math.round((teamsByValue.reduce((sum, t) => sum + t.weekCount, 0) / teamsByValue.length) * 10) / 10,
    };
  },
});

// Get team performance data for debugging
export const getTeamPerformanceData = query({
  args: {
    year: v.number(),
    week: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Get team performances for this week
    const performances = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .order("desc")
      .take(limit);
    
    // Get weekly team scores for this week
    const weeklyScores = await ctx.db
      .query("weeklyTeamScores")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .order("desc")
      .take(limit);
    
    // Get total counts
    const totalPerformances = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .collect();
    
    const totalWeeklyScores = await ctx.db
      .query("weeklyTeamScores")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .collect();
    
    return {
      performances,
      weeklyScores,
      totalPerformancesCount: totalPerformances.length,
      totalWeeklyScoresCount: totalWeeklyScores.length,
    };
  },
});

// Debug function to investigate roster and team lookup issues
export const debugRosterIssues = query({
  args: {
    draftRoomId: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all participants
    const participants = await ctx.db
      .query("draftParticipants")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    // Get all roster entries for this draft room
    const allRosterEntries = await ctx.db
      .query("playerRosters")
      .withIndex("by_draft_room", q => q.eq("draftRoomId", args.draftRoomId))
      .collect();
    
    // Get sample team IDs from roster entries
    const sampleTeamIds = [...new Set(allRosterEntries.slice(0, 10).map(r => r.teamId))];
    
    // Check if these teams exist in teams table
    const teamLookupResults = [];
    for (const teamId of sampleTeamIds) {
      const team = await ctx.db
        .query("teams")
        .withIndex("by_teamId", q => q.eq("teamId", teamId))
        .first();
      
      const weeklyScore = await ctx.db
        .query("weeklyTeamScores")
        .withIndex("by_team_year_week", q => 
          q.eq("teamId", teamId).eq("year", args.year).eq("week", args.week)
        )
        .first();
      
      teamLookupResults.push({
        teamId,
        teamExists: !!team,
        teamData: team ? { teamNumber: team.teamNumber, name: team.name } : null,
        hasWeeklyScore: !!weeklyScore,
        weeklyPoints: weeklyScore?.weeklyPoints || 0,
      });
    }
    
    // Get total counts
    const totalTeamsInDb = await ctx.db.query("teams").collect();
    const totalWeeklyScores = await ctx.db
      .query("weeklyTeamScores")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .collect();
    
    return {
      participantCount: participants.length,
      totalRosterEntries: allRosterEntries.length,
      rosterEntriesPerUser: allRosterEntries.length / Math.max(participants.length, 1),
      sampleTeamLookups: teamLookupResults,
      totalTeamsInDatabase: totalTeamsInDb.length,
      totalWeeklyScoresForWeek: totalWeeklyScores.length,
      sampleRosterEntries: allRosterEntries.slice(0, 5).map(r => ({
        userId: r.userId,
        teamId: r.teamId,
        isStarting: r.isStarting,
        acquisitionType: r.acquisitionType,
      })),
    };
  },
});

// Get team event performances for a specific team
export const getTeamEventPerformances = query({
  args: {
    teamId: v.string(),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const year = args.year || 2024;
    
    // Get all performances for this team in the specified year
    const performances = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_team_year", q => 
        q.eq("teamId", args.teamId).eq("year", year)
      )
      .order("desc")
      .collect();
    
    // Get events data for each performance
    const enrichedPerformances = [];
    for (const performance of performances) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_event_key", q => q.eq("eventKey", performance.eventKey))
        .first();
      
      enrichedPerformances.push({
        ...performance,
        event: event ? {
          _id: event._id,
          eventKey: event.eventKey,
          name: event.name,
          eventCode: event.eventCode,
          startDate: event.startDate,
          endDate: event.endDate,
          city: event.city,
          stateProv: event.stateProv,
          country: event.country,
        } : null,
      });
    }
    
    // Calculate summary statistics
    const totalPoints = performances.reduce((sum, p) => sum + p.totalPoints, 0);
    const totalMatches = performances.reduce((sum, p) => sum + p.totalQualMatches, 0);
    const totalWins = performances.reduce((sum, p) => sum + p.qualWins, 0);
    const totalLosses = performances.reduce((sum, p) => sum + p.qualLosses, 0);
    const totalTies = performances.reduce((sum, p) => sum + p.qualTies, 0);
    const playoffAppearances = performances.filter(p => p.madePlayoffs).length;
    const eventWins = performances.filter(p => p.playoffWins >= 4).length; // Assuming 4+ playoff wins = event win
    
    return {
      performances: enrichedPerformances,
      summary: {
        totalEvents: performances.length,
        totalPoints: Math.round(totalPoints * 100) / 100,
        averagePoints: performances.length > 0 ? Math.round((totalPoints / performances.length) * 100) / 100 : 0,
        totalMatches,
        totalWins,
        totalLosses,
        totalTies,
        winPercentage: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 1000) / 10 : 0,
        playoffAppearances,
        eventWins,
      },
    };
  },
});

// Generate performance data for ALL teams in database for testing (with batching)
export const generateAllTeamsPerformances = mutation({
  args: {
    year: v.number(),
    week: v.number(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 200; // Process 200 teams at a time for single week
    
    // Get ALL teams from the database
    const allTeams = await ctx.db
      .query("teams")
      .collect();
    
    if (allTeams.length === 0) {
      throw new Error("No teams found in database. Add teams first.");
    }
    
    const results = [];
    let processedTeams = 0;
    
    // Process teams in batches
    for (let offset = 0; offset < allTeams.length; offset += batchSize) {
      const batchTeams = allTeams.slice(offset, offset + batchSize);
      
      // Generate team performances for this batch
      const batchResult = await generateTeamsBatchPerformancesInternal(ctx, {
        year: args.year,
        week: args.week,
        teams: batchTeams,
        startIndex: offset,
      });
      
      results.push(...batchResult.performanceIds);
      processedTeams += batchTeams.length;
    }
    
    return {
      message: `Generated ${results.length} team performances for ${allTeams.length} teams in ${args.year} Week ${args.week} using batching`,
      performanceIds: results,
      totalTeams: allTeams.length,
      processedTeams,
    };
  },
});

// Generate performance data for ALL teams for multiple weeks (with batching)
export const generateAllTeamsSeasonData = mutation({
  args: {
    year: v.number(),
    weeks: v.array(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100; // Process 100 teams at a time
    const results = [];
    
    // Get total team count first
    const allTeams = await ctx.db
      .query("teams")
      .collect();
    
    const totalTeams = allTeams.length;
    
    if (totalTeams === 0) {
      throw new Error("No teams found in database. Add teams first.");
    }
    
    for (const week of args.weeks) {
      let processedTeams = 0;
      let weekPerformances = 0;
      let weeklyScores = 0;
      
      // Process teams in batches
      for (let offset = 0; offset < totalTeams; offset += batchSize) {
        const batchTeams = allTeams.slice(offset, offset + batchSize);
        
        // Generate team performances for this batch
        const performanceResult = await generateTeamsBatchPerformancesInternal(ctx, {
          year: args.year,
          week,
          teams: batchTeams,
          startIndex: offset,
        });
        
        weekPerformances += performanceResult.performanceIds.length;
        processedTeams += batchTeams.length;
      }
      
      // Calculate weekly scores for this week (after all teams are processed)
      const weeklyScoreResult = await calculateWeeklyScoresInternal(ctx, {
        year: args.year,
        week,
      });
      
      weeklyScores = weeklyScoreResult.length;
      
      results.push({
        week,
        performances: weekPerformances,
        weeklyScores,
        processedTeams,
      });
    }
    
    return {
      message: `Generated sample data for ${totalTeams} teams across ${args.weeks.length} weeks using batching`,
      results,
      totalTeams,
    };
  },
});

// Helper function to generate performances for a batch of teams
const generateTeamsBatchPerformancesInternal = async (ctx: any, args: { 
  year: number; 
  week: number; 
  teams: any[]; 
  startIndex: number;
}) => {
  const now = new Date().toISOString();
  const results = [];
  
  // Generate performance data for this batch of teams
  for (let i = 0; i < args.teams.length; i++) {
    const team = args.teams[i];
    const teamId = team.teamId;
    const teamNumber = team.teamNumber;
    const globalIndex = args.startIndex + i;
    const eventKey = `2024week${args.week}_event${Math.floor(globalIndex / 60) + 1}`; // ~60 teams per event
    
    // Generate realistic performance based on team number (lower = historically better)
    const teamStrength = teamNumber <= 1000 ? 0.8 : teamNumber <= 3000 ? 0.6 : teamNumber <= 6000 ? 0.4 : 0.3;
    const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2 multiplier
    const performance = teamStrength * randomFactor;
    
    // Generate qualification record (10-12 matches typical)
    const totalQualMatches = 10 + Math.floor(Math.random() * 3);
    const winRate = Math.min(0.9, Math.max(0.1, performance));
    const qualWins = Math.floor(totalQualMatches * winRate);
    const qualLosses = totalQualMatches - qualWins;
    const qualTies = 0; // Rare in modern FRC
    
    // Playoff performance (top 8 teams make playoffs)
    const madePlayoffs = performance > 0.5 && Math.random() > 0.3;
    let playoffWins = 0;
    let playoffLosses = 0;
    
    if (madePlayoffs) {
      // Simulate playoff bracket
      const playoffPerformance = performance * (Math.random() * 0.4 + 0.8);
      if (playoffPerformance > 0.8) {
        playoffWins = 4; // Won event
        playoffLosses = 0;
      } else if (playoffPerformance > 0.7) {
        playoffWins = 3; // Lost in finals
        playoffLosses = 1;
      } else if (playoffPerformance > 0.6) {
        playoffWins = 2; // Lost in semifinals
        playoffLosses = 1;
      } else {
        playoffWins = 1; // Lost in quarterfinals
        playoffLosses = 1;
      }
    }
    
    // Ranking (1-60 typical for regionals)
    const rank = Math.floor((1 - performance) * 60) + 1;
    const rankingScore = Math.floor(performance * 100 + Math.random() * 20);
    
    // Calculate points using our scoring system
    const points = calculateEventPoints(
      qualWins,
      qualLosses,
      qualTies,
      totalQualMatches,
      playoffWins,
      playoffLosses,
      madePlayoffs
    );
    
    // Check if performance already exists
    const existingPerformance = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_team_event", (q: any) => 
        q.eq("teamId", teamId).eq("eventKey", eventKey)
      )
      .first();
    
    if (!existingPerformance) {
      const performanceId = await ctx.db.insert("teamEventPerformances", {
        teamId,
        eventKey,
        year: args.year,
        week: args.week,
        qualWins,
        qualLosses,
        qualTies,
        totalQualMatches,
        playoffWins,
        playoffLosses,
        madePlayoffs,
        rank,
        rankingScore,
        basePoints: points.basePoints,
        qualPoints: points.qualPoints,
        playoffPoints: points.playoffPoints,
        totalPoints: points.totalPoints,
        createdAt: now,
        updatedAt: now,
      });
      results.push(performanceId);
    }
  }
  
  return {
    message: `Generated ${results.length} team performances for ${args.teams.length} teams`,
    performanceIds: results,
  };
};



// Generate team data in small chunks automatically (avoids read limits)
export const generateTeamDataInChunks = mutation({
  args: {
    year: v.number(),
    week: v.number(),
    chunkSize: v.optional(v.number()),
    teamsPerWeek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const chunkSize = args.chunkSize || 25; // Process 25 teams at a time to avoid limits
    const teamsPerWeek = args.teamsPerWeek || 300; // Only 300 teams compete per week (realistic)
    const now = new Date().toISOString();
    
    // Get all teams and select a random subset for this week
    const allTeams = await ctx.db.query("teams").collect();
    
    if (allTeams.length === 0) {
      throw new Error("No teams found in database. Add teams first.");
    }
    
    // Create a deterministic but varied selection based on week
    // This ensures different teams compete each week but consistently for the same week
    const weekSeed = args.week * 1000 + args.year;
    const shuffledTeams = [...allTeams].sort((a, b) => {
      // Use team number and week to create deterministic "randomness"
      const aHash = (a.teamNumber * weekSeed) % 10000;
      const bHash = (b.teamNumber * weekSeed) % 10000;
      return aHash - bHash;
    });
    
    // Select teams for this week (some teams compete multiple weeks, some don't)
    const weekTeams = shuffledTeams.slice(0, Math.min(teamsPerWeek, allTeams.length));
    
    let totalProcessed = 0;
    const allResults = [];
    
    // Process teams in chunks
    for (let startIndex = 0; startIndex < weekTeams.length; startIndex += chunkSize) {
      const chunk = weekTeams.slice(startIndex, startIndex + chunkSize);
      
      // Generate performance data for this chunk
      for (let i = 0; i < chunk.length; i++) {
        const team = chunk[i];
        const teamId = team.teamId;
        const teamNumber = team.teamNumber;
        const globalIndex = startIndex + i;
        
        // Create more realistic event distribution
        // Teams 1-1000: More likely to attend multiple events
        // Teams 1000+: Usually attend 1-2 events per season
        const teamTier = teamNumber <= 1000 ? 'elite' : teamNumber <= 3000 ? 'experienced' : 'rookie';
        const eventsThisWeek = teamTier === 'elite' ? 
          (Math.random() > 0.7 ? 2 : 1) : // Elite teams sometimes do 2 events
          1; // Most teams do 1 event per week they compete
        
        for (let eventNum = 0; eventNum < eventsThisWeek; eventNum++) {
          const eventKey = `2024week${args.week}_${teamTier}_event${Math.floor(globalIndex / 40) + 1 + eventNum}`;
          
          // Generate realistic performance based on team number and tier
          const baseStrength = teamTier === 'elite' ? 0.8 : teamTier === 'experienced' ? 0.6 : 0.4;
          const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2 multiplier
          const performance = baseStrength * randomFactor;
          
          // Generate qualification record (8-12 matches typical)
          const totalQualMatches = 8 + Math.floor(Math.random() * 5);
          const winRate = Math.min(0.95, Math.max(0.05, performance));
          const qualWins = Math.floor(totalQualMatches * winRate);
          const qualLosses = totalQualMatches - qualWins;
          const qualTies = 0; // Rare in modern FRC
          
          // Playoff performance (top 8 teams make playoffs at most events)
          const playoffThreshold = 0.5 + (Math.random() * 0.2); // Varies by event competitiveness
          const madePlayoffs = performance > playoffThreshold;
          let playoffWins = 0;
          let playoffLosses = 0;
          
          if (madePlayoffs) {
            // Simulate playoff bracket (more realistic)
            const playoffPerformance = performance * (Math.random() * 0.3 + 0.85);
            if (playoffPerformance > 0.9) {
              playoffWins = 4; // Won event (very rare)
              playoffLosses = 0;
            } else if (playoffPerformance > 0.8) {
              playoffWins = 3; // Lost in finals
              playoffLosses = 1;
            } else if (playoffPerformance > 0.7) {
              playoffWins = 2; // Lost in semifinals
              playoffLosses = 1;
            } else {
              playoffWins = 1; // Lost in quarterfinals
              playoffLosses = 1;
            }
          }
          
          // Ranking (1-60 typical for regionals, 1-40 for districts)
          const maxRank = eventKey.includes('district') ? 40 : 60;
          const rank = Math.floor((1 - performance) * maxRank) + 1;
          const rankingScore = Math.floor(performance * 120 + Math.random() * 30); // More realistic RP range
          
          // Calculate points using our scoring system
          const points = calculateEventPoints(
            qualWins,
            qualLosses,
            qualTies,
            totalQualMatches,
            playoffWins,
            playoffLosses,
            madePlayoffs
          );
          
          // Check if performance already exists
          const existingPerformance = await ctx.db
            .query("teamEventPerformances")
            .withIndex("by_team_event", q => 
              q.eq("teamId", teamId).eq("eventKey", eventKey)
            )
            .first();
          
          if (!existingPerformance) {
            const performanceId = await ctx.db.insert("teamEventPerformances", {
              teamId,
              eventKey,
              year: args.year,
              week: args.week,
              qualWins,
              qualLosses,
              qualTies,
              totalQualMatches,
              playoffWins,
              playoffLosses,
              madePlayoffs,
              rank,
              rankingScore,
              basePoints: points.basePoints,
              qualPoints: points.qualPoints,
              playoffPoints: points.playoffPoints,
              totalPoints: points.totalPoints,
              createdAt: now,
              updatedAt: now,
            });
            allResults.push(performanceId);
          }
        }
      }
      
      totalProcessed += chunk.length;
    }
    
    // After generating all team performances, calculate weekly scores
    const weeklyScoreResult = await calculateWeeklyScoresInternal(ctx, {
      year: args.year,
      week: args.week,
    });
    
    return {
      message: `Generated ${allResults.length} team performances for ${totalProcessed} teams (${teamsPerWeek} selected for week ${args.week}) and calculated ${weeklyScoreResult.length} weekly scores`,
      performanceIds: allResults,
      totalTeamsProcessed: totalProcessed,
      teamsSelectedForWeek: weekTeams.length,
      chunksProcessed: Math.ceil(totalProcessed / chunkSize),
      weeklyScoresCalculated: weeklyScoreResult.length,
    };
  },
});

// Generate season data in small chunks automatically (one week at a time)
export const generateSeasonDataInChunks = mutation({
  args: {
    year: v.number(),
    weeks: v.array(v.number()),
    chunkSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const chunkSize = args.chunkSize || 25; // Use smaller chunks
    
    // Only process one week at a time to avoid execution limits
    if (args.weeks.length > 1) {
      throw new Error("Please process one week at a time to avoid execution limits. Use the single week function multiple times instead.");
    }
    
    const week = args.weeks[0];
    
    // Since we can only process one week at a time, just redirect to the main function
    throw new Error(`Please use the "Generate Week ${week} Data" function directly instead of the season function. Season function is deprecated to avoid execution limits.`);
  },
});

// Helper function for internal chunked generation (DEPRECATED - use main function instead)
const generateTeamDataInChunksInternal = async (ctx: any, args: {
  year: number;
  week: number;
  chunkSize: number;
}) => {
  // This function is deprecated - the main generateTeamDataInChunks function
  // now handles everything including weekly score calculation
  throw new Error("This function is deprecated. Use generateTeamDataInChunks instead.");
};

// Clear team performance data for testing
export const clearTeamPerformanceData = mutation({
  args: {
    year: v.number(),
    week: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let deletedPerformances = 0;
    let deletedWeeklyScores = 0;
    
    if (args.week !== undefined) {
      // Clear specific week
      const weekPerformances = await ctx.db
        .query("teamEventPerformances")
        .withIndex("by_year_week", q => 
          q.eq("year", args.year).eq("week", args.week)
        )
        .collect();
      
      for (const perf of weekPerformances) {
        await ctx.db.delete(perf._id);
        deletedPerformances++;
      }
      
      const weeklyScores = await ctx.db
        .query("weeklyTeamScores")
        .withIndex("by_year_week", q => 
          q.eq("year", args.year).eq("week", args.week!)
        )
        .collect();
      
      for (const score of weeklyScores) {
        await ctx.db.delete(score._id);
        deletedWeeklyScores++;
      }
      
      return {
        message: `Cleared ${deletedPerformances} team performances and ${deletedWeeklyScores} weekly scores for ${args.year} Week ${args.week}`,
        deletedPerformances,
        deletedWeeklyScores,
      };
    } else {
      // Clear entire year
      const allPerformances = await ctx.db
        .query("teamEventPerformances")
        .filter(q => q.eq(q.field("year"), args.year))
        .collect();
      
      for (const perf of allPerformances) {
        await ctx.db.delete(perf._id);
        deletedPerformances++;
      }
      
      const allWeeklyScores = await ctx.db
        .query("weeklyTeamScores")
        .filter(q => q.eq(q.field("year"), args.year))
        .collect();
      
      for (const score of allWeeklyScores) {
        await ctx.db.delete(score._id);
        deletedWeeklyScores++;
      }
      
      return {
        message: `Cleared ${deletedPerformances} team performances and ${deletedWeeklyScores} weekly scores for entire year ${args.year}`,
        deletedPerformances,
        deletedWeeklyScores,
      };
    }
  },
});

// Debug query to check data flow from TBA to league scores
export const checkDataFlow = query({
  args: {
    year: v.number(),
    week: v.number(),
    draftRoomId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check team event performances
    const teamPerformances = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .take(10); // Sample of 10

    // Check weekly team scores
    const weeklyScores = await ctx.db
      .query("weeklyTeamScores")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .take(10); // Sample of 10

    // Check league scores if draft room provided
    let leagueScores: any[] = [];
    if (args.draftRoomId) {
      leagueScores = await ctx.db
        .query("leagueWeeklyScores")
        .withIndex("by_league_year_week", q => 
          q.eq("draftRoomId", args.draftRoomId!)
           .eq("year", args.year)
           .eq("week", args.week)
        )
        .collect();
    }

    // Get total counts
    const totalPerformances = await ctx.db
      .query("teamEventPerformances")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .collect();

    const totalWeeklyScores = await ctx.db
      .query("weeklyTeamScores")
      .withIndex("by_year_week", q => 
        q.eq("year", args.year).eq("week", args.week)
      )
      .collect();

    return {
      year: args.year,
      week: args.week,
      draftRoomId: args.draftRoomId,
      counts: {
        teamPerformances: totalPerformances.length,
        weeklyScores: totalWeeklyScores.length,
        leagueScores: leagueScores.length,
      },
      samples: {
        teamPerformances: teamPerformances.map(p => ({
          teamId: p.teamId,
          eventKey: p.eventKey,
          totalPoints: p.totalPoints,
          qualWins: p.qualWins,
          qualLosses: p.qualLosses,
          madePlayoffs: p.madePlayoffs,
        })),
        weeklyScores: weeklyScores.map(s => ({
          teamId: s.teamId,
          weeklyPoints: s.weeklyPoints,
          eventsCount: s.eventsCount,
        })),
        leagueScores: leagueScores.map(l => ({
          userId: l.userId,
          weeklyPoints: l.weeklyPoints,
          startingTeamCount: l.startingTeamCount,
        })),
      },
    };
  },
});

