import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,
  channels: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    archivedTime: v.optional(v.string()),
    dmId: v.optional(v.id("users")),
  })
    .index("by_name", ["name"])
    .index("by_dm_id", ["dmId"]),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.optional(v.string()),
  })
    .index("by_channel", ["channelId"])
    .searchIndex("search_content", { searchField: "content", filterFields: ["channelId"] }),

  files: defineTable({
    name: v.string(),
    messageId: v.id("messages"),
    storageId: v.id("_storage"),
  })
    .index("by_message", ["messageId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["messageId"] }),

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
