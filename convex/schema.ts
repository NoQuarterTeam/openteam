import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,
  channels: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    archivedTime: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  })
    .index("by_name", ["name"])
    .index("by_user_id", ["userId"]),

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
  })
    .index("by_channel", ["channelId"])
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
    messageId: v.id("messages"),
    storageId: v.id("_storage"),
  })
    .index("by_message", ["messageId"])
    .searchIndex("search_name", { searchField: "name" }),

  babblers: defineTable({
    userId: v.id("users"),
    joinedAt: v.number(),
  }).index("by_user", ["userId"]),

  babbleSignals: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    signal: v.any(),
    createdAt: v.number(),
  })
    .index("by_to_user", ["toUserId"])
    .index("by_from_user", ["fromUserId"]),

  users: defineTable({
    name: v.string(),
    image: v.optional(v.id("_storage")),
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    githubId: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .searchIndex("search_name", { searchField: "name" }),
})
