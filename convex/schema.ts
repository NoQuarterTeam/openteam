import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const applicationTables = {
  channels: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
  }).index("by_name", ["name"]),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.string(),
  })
    .index("by_channel", ["channelId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["channelId"],
    }),

  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    avatarId: v.optional(v.id("_storage")),
  }).index("by_user", ["userId"]),
}

export default defineSchema({
  ...authTables,
  ...applicationTables,
})
