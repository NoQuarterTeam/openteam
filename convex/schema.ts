import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    image: v.optional(v.id("_storage")),
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    githubId: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .searchIndex("search_name", { searchField: "name" }),

  invites: defineTable({
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    teamId: v.id("teams"),
    createdBy: v.id("users"),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_team", ["teamId"])
    .index("by_email", ["email"]),

  teams: defineTable({
    name: v.string(),
    image: v.optional(v.id("_storage")),
    createdBy: v.id("users"),
    isDemo: v.optional(v.boolean()),
  })
    .index("by_name", ["name"])
    .index("by_user", ["createdBy"]),

  userTeams: defineTable({
    userId: v.id("users"),
    teamId: v.id("teams"),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_user_team", ["userId", "teamId"])
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"]),

  channels: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    archivedTime: v.optional(v.string()),
    userId: v.optional(v.id("users")), // FOR DMS
    otherUserId: v.optional(v.id("users")), // FOR DMS
    teamId: v.id("teams"),
  })
    .index("by_team_name", ["teamId", "name"])
    .index("by_team", ["teamId"])
    .index("by_user_id", ["userId"])
    .index("by_other_user_id", ["otherUserId"]),

  channelOrders: defineTable({
    channelId: v.id("channels"),
    order: v.number(),
    userId: v.id("users"),
  })
    .index("by_channel", ["channelId"])
    .index("by_order", ["order"])
    .index("by_user", ["userId"]),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.optional(v.string()),
    threadId: v.optional(v.id("threads")),
  })
    .index("by_channel", ["channelId"])
    .index("by_thread", ["threadId"])
    .searchIndex("search_content", { searchField: "content", filterFields: ["channelId"] }),

  userChannelActivity: defineTable({
    lastReadMessageTime: v.optional(v.number()),
    channelId: v.id("channels"),
    isFavourite: v.boolean(),
    isMuted: v.boolean(),
    userId: v.id("users"),
  })
    .index("by_last_read_message_time", ["lastReadMessageTime"])
    .index("by_user", ["userId"])
    .index("by_channel", ["channelId"]),

  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    content: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"]),

  files: defineTable({
    name: v.string(),
    previewId: v.optional(v.string()),
    previewMessageId: v.optional(v.string()),
    previewContentType: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    messageId: v.optional(v.id("messages")),
    storageId: v.optional(v.id("_storage")),
  })
    .index("by_message", ["messageId"])
    .index("by_preview_id", ["previewId"])
    .index("by_preview_message_id", ["previewMessageId"])
    .searchIndex("search_name", { searchField: "name" }),

  babblers: defineTable({
    userId: v.id("users"),
    joinedAt: v.number(),
    teamId: v.id("teams"),
  })
    .index("by_user", ["userId"])
    .index("by_user_team", ["userId", "teamId"])
    .index("by_team", ["teamId"]),

  babbleSignals: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    signal: v.any(),
    createdAt: v.number(),
  })
    .index("by_to_user", ["toUserId"])
    .index("by_from_user", ["fromUserId"]),

  threads: defineTable({
    channelId: v.id("channels"),
    parentMessageId: v.id("messages"),
    createdBy: v.id("users"),
  })
    .index("by_channel", ["channelId"])
    .index("by_parent_message", ["parentMessageId"]),

  threadActivity: defineTable({
    threadId: v.id("threads"),
    userId: v.id("users"),
    lastReadTime: v.optional(v.number()),
  })
    .index("by_thread", ["threadId"])
    .index("by_user", ["userId"]),
})
