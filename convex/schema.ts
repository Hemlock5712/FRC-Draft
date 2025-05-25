import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User table
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.string()), // Date as string in ISO format
    image: v.optional(v.string()),
    password: v.optional(v.string()),
    createdAt: v.string(), // Date as string in ISO format
    updatedAt: v.string(), // Date as string in ISO format
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    team: v.optional(v.string()),
    role: v.optional(v.string()),
    preferences: v.optional(v.any()), // JSON data
  }),

  // Team table
  teams: defineTable({
    teamId: v.string(), // Custom ID (not Convex's _id)
    teamNumber: v.number(),
    name: v.string(),
    city: v.optional(v.string()),
    stateProv: v.optional(v.string()),
    country: v.optional(v.string()),
    rookieYear: v.optional(v.number()),
    website: v.optional(v.string()),
    createdAt: v.string(), // Date as string in ISO format
    updatedAt: v.string(), // Date as string in ISO format
  })
  .index("by_teamId", ["teamId"])
  .index("by_teamNumber", ["teamNumber"])
  .searchIndex("search_name", {
    searchField: "name",
    filterFields: [],
  }),

  // Team Season Data table
  teamSeasonData: defineTable({
    teamId: v.string(), // Reference to team's ID
    eventCount: v.number(),
    totalRPs: v.number(),
    avgRPs: v.number(),
    totalMatchScore: v.number(),
    avgMatchScore: v.number(),
    wins: v.number(),
    losses: v.number(),
    ties: v.number(),
    districtRank: v.optional(v.number()),
    regionalWins: v.number(),
    lastUpdated: v.string(), // Date as string in ISO format
  }),

  // Award table
  awards: defineTable({
    teamSeasonId: v.string(), // Reference to team season's ID
    eventKey: v.string(),
    awardType: v.number(),
    name: v.string(),
    receivedAt: v.string(), // Date as string in ISO format
  }),

  // Draft Room table
  draftRooms: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // Reference to user's ID
    status: v.string(), // "PENDING", "ACTIVE", "COMPLETED"
    startTime: v.optional(v.string()), // Date as string in ISO format
    endTime: v.optional(v.string()), // Date as string in ISO format
    maxTeams: v.number(),
    pickTimeSeconds: v.number(),
    snakeFormat: v.boolean(),
    privacy: v.union(v.literal("PUBLIC"), v.literal("PRIVATE")), // "PUBLIC" or "PRIVATE"
    numberOfRounds: v.optional(v.number()), // Number of draft rounds (optional for backward compatibility)
    teamsToStart: v.optional(v.number()), // Number of teams each participant needs to start (optional for backward compatibility)
    createdAt: v.string(), // Date as string in ISO format
    updatedAt: v.string(), // Date as string in ISO format
    nextPickOrder: v.optional(v.number()), // Track next available pick order (optional for backward compatibility)
  }),

  // Draft Participant table
  draftParticipants: defineTable({
    userId: v.string(), // Reference to user's ID
    draftRoomId: v.string(), // Reference to draft room's ID
    pickOrder: v.number(),
    isReady: v.boolean(),
    createdAt: v.string(), // Date as string in ISO format
    updatedAt: v.string(), // Date as string in ISO format
  })
  .index("by_draft_room", ["draftRoomId"])
  .index("by_draft_room_pick_order", ["draftRoomId", "pickOrder"]), // Index for enforcing unique pick orders per room

  // Draft Pick table
  draftPicks: defineTable({
    draftRoomId: v.string(), // Reference to draft room's ID
    participantId: v.string(), // Reference to participant's ID
    teamId: v.string(), // Reference to team's ID
    pickNumber: v.number(),
    roundNumber: v.number(),
    pickedAt: v.string(), // Date as string in ISO format
  }).index("by_draft_room", ["draftRoomId"]), // Index for querying picks by room

  // Sync State table
  syncStates: defineTable({
    type: v.string(),
    lastSyncTime: v.string(), // Date as string in ISO format
    syncInProgress: v.boolean(),
    createdAt: v.string(), // Date as string in ISO format
    updatedAt: v.string(), // Date as string in ISO format
  }),

  // ===== PHASE 4: PLAYER MANAGEMENT TABLES =====
  
  // Event table - stores FRC events/competitions
  events: defineTable({
    eventKey: v.string(), // TBA event key (e.g., "2024nhnas")
    name: v.string(),
    eventCode: v.string(), // Short event code
    eventType: v.number(), // TBA event type
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    stateProv: v.optional(v.string()),
    country: v.optional(v.string()),
    startDate: v.string(), // Date as string in ISO format
    endDate: v.string(), // Date as string in ISO format
    year: v.number(),
    week: v.optional(v.number()), // Competition week
    address: v.optional(v.string()),
    timezone: v.optional(v.string()),
    website: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_event_key", ["eventKey"])
  .index("by_year", ["year"])
  .index("by_year_week", ["year", "week"]),

  // Team Event Performance - stores team performance at specific events
  teamEventPerformances: defineTable({
    teamId: v.string(), // Reference to team
    eventKey: v.string(), // Reference to event
    year: v.number(),
    week: v.optional(v.number()),
    
    // Qualification stats
    qualWins: v.number(),
    qualLosses: v.number(),
    qualTies: v.number(),
    totalQualMatches: v.number(),
    
    // Playoff stats
    playoffWins: v.number(),
    playoffLosses: v.number(),
    madePlayoffs: v.boolean(),
    
    // Rankings and performance
    rank: v.optional(v.number()),
    rankingScore: v.optional(v.number()),
    
    // Points calculation (based on our scoring system)
    basePoints: v.number(), // 12 points for participating
    qualPoints: v.number(), // +2 per win, -1 per loss, normalized to 10 matches
    playoffPoints: v.number(), // 1 for making playoffs, +0.3333 per win, -0.25 per loss
    totalPoints: v.number(), // Sum of all points
    
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_team_year", ["teamId", "year"])
  .index("by_event", ["eventKey"])
  .index("by_team_event", ["teamId", "eventKey"])
  .index("by_year_week", ["year", "week"]),

  // Match Results - individual match data for detailed tracking
  matchResults: defineTable({
    matchKey: v.string(), // TBA match key (e.g., "2024nhnas_qm1")
    eventKey: v.string(),
    matchNumber: v.number(),
    setNumber: v.number(),
    compLevel: v.string(), // "qm", "ef", "qf", "sf", "f"
    
    // Teams and alliances
    redTeams: v.array(v.string()), // Array of team IDs
    blueTeams: v.array(v.string()),
    winningAlliance: v.optional(v.string()), // "red", "blue", or null for tie
    
    // Scores
    redScore: v.optional(v.number()),
    blueScore: v.optional(v.number()),
    
    // Match timing
    actualTime: v.optional(v.string()), // When match was actually played
    predictedTime: v.optional(v.string()),
    postResultTime: v.optional(v.string()),
    
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_event", ["eventKey"])
  .index("by_match_key", ["matchKey"]),

  // Weekly Team Scores - aggregated weekly scores for the season
  weeklyTeamScores: defineTable({
    teamId: v.string(),
    year: v.number(),
    week: v.number(),
    
    // Events participated in this week
    eventsCount: v.number(),
    eventKeys: v.array(v.string()),
    
    // Weekly point totals
    weeklyPoints: v.number(), // Total points earned this week
    
    // Cumulative season totals
    seasonPoints: v.number(), // Total points for the season so far
    
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_team_year", ["teamId", "year"])
  .index("by_year_week", ["year", "week"])
  .index("by_team_year_week", ["teamId", "year", "week"]),

  // Player Rosters - tracks which teams each user has on their roster
  playerRosters: defineTable({
    userId: v.string(), // Reference to user
    draftRoomId: v.string(), // Reference to draft room/league
    teamId: v.string(), // Reference to team
    
    // Roster management
    isStarting: v.boolean(), // Whether this team is in starting lineup
    acquisitionType: v.string(), // "draft", "waiver", "trade", "free_agent"
    acquisitionDate: v.string(),
    
    // Performance tracking
    totalPointsScored: v.number(), // Total points this team has scored for this user
    weeksStarted: v.number(), // Number of weeks this team was in starting lineup
    
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_user_draft", ["userId", "draftRoomId"])
  .index("by_draft_room", ["draftRoomId"])
  .index("by_team", ["teamId"]),

  // ===== PHASE 5: LEAGUE MANAGEMENT & SCORING TABLES =====

  // League Weekly Scores - tracks weekly fantasy scores for each user in each league
  leagueWeeklyScores: defineTable({
    draftRoomId: v.string(), // Reference to draft room/league
    userId: v.string(), // Reference to user
    year: v.number(),
    week: v.number(),
    
    // Weekly scoring
    weeklyPoints: v.number(), // Total points earned this week
    startingTeamCount: v.number(), // Number of teams in starting lineup
    teamScores: v.array(v.object({
      teamId: v.string(),
      points: v.number(),
    })), // Individual team contributions
    
    createdAt: v.string(),
    updatedAt: v.string(),
  })
  .index("by_league_year", ["draftRoomId", "year"])
  .index("by_league_year_week", ["draftRoomId", "year", "week"])
  .index("by_league_user_week", ["draftRoomId", "userId", "year", "week"])
  .index("by_league_user_year", ["draftRoomId", "userId", "year"])
  .index("by_user_year", ["userId", "year"]),
}); 