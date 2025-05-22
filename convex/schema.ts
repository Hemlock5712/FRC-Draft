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
    privacy: v.string(), // "PUBLIC" or "PRIVATE"
    createdAt: v.string(), // Date as string in ISO format
    updatedAt: v.string(), // Date as string in ISO format
  }),

  // Draft Participant table
  draftParticipants: defineTable({
    userId: v.string(), // Reference to user's ID
    draftRoomId: v.string(), // Reference to draft room's ID
    pickOrder: v.number(),
    isReady: v.boolean(),
    createdAt: v.string(), // Date as string in ISO format
    updatedAt: v.string(), // Date as string in ISO format
  }).index("by_draft_room", ["draftRoomId"]), // Index for querying participants by room

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
}); 