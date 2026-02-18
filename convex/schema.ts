import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // Override users table to add isAdmin
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
    groupmeUserId: v.optional(v.string()),
  }).index("email", ["email"]),

  seasons: defineTable({
    name: v.string(),
    status: v.union(
      v.literal("registration"),
      v.literal("active"),
      v.literal("completed")
    ),
    startDate: v.string(),
    endDate: v.string(),
    totalWeeks: v.number(),
    currentWeek: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"]),

  seasonPlayers: defineTable({
    seasonId: v.id("seasons"),
    userId: v.id("users"),
    displayName: v.string(),
    wins: v.number(),
    losses: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_season_and_user", ["seasonId", "userId"])
    .index("by_user", ["userId"]),

  matches: defineTable({
    seasonId: v.id("seasons"),
    weekNumber: v.number(),
    player1Id: v.id("users"),
    player2Id: v.id("users"),
    winnerId: v.optional(v.id("users")),
    player1Score: v.optional(v.number()),
    player2Score: v.optional(v.number()),
    reportedBy: v.optional(v.id("users")),
    status: v.union(v.literal("scheduled"), v.literal("completed")),
    scheduledDay: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
  })
    .index("by_season", ["seasonId"])
    .index("by_season_and_week", ["seasonId", "weekNumber"])
    .index("by_season_and_player1", ["seasonId", "player1Id"])
    .index("by_season_and_player2", ["seasonId", "player2Id"])
    .index("by_season_and_status", ["seasonId", "status"]),

  playerAvailability: defineTable({
    userId: v.id("users"),
    slots: v.any(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
