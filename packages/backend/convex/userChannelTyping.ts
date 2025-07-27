// convex/isTyping.ts

import { ConvexError, v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { canManageTeamChannel } from "./auth"

const TYPING_TIMEOUT_MS = 3000 // 3 seconds

export const userStartedTyping = mutation({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    const channelId = ctx.db.normalizeId("channels", args.channelId)
    if (!channelId) throw new ConvexError("Invalid channel ID")
    const { user } = await canManageTeamChannel(ctx, channelId)

    const existingTypingStatus = await ctx.db
      .query("userChannelTyping")
      .withIndex("by_channel_and_user", (q) => q.eq("channelId", channelId).eq("userId", user._id))
      .first()

    if (existingTypingStatus) {
      // Update existing timestamp
      await ctx.db.patch(existingTypingStatus._id, { timestamp: Date.now() })
    } else {
      // Create new typing status entry
      await ctx.db.insert("userChannelTyping", { userId: user._id, channelId, timestamp: Date.now() })
    }
  },
})

// Re-introduce this mutation for explicit client-side "stop" triggers
export const userStoppedTyping = mutation({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    const channelId = ctx.db.normalizeId("channels", args.channelId)
    if (!channelId) throw new ConvexError("Invalid channel ID")
    const { user } = await canManageTeamChannel(ctx, channelId)

    const existingTypingStatus = await ctx.db
      .query("userChannelTyping")
      .withIndex("by_channel_and_user", (q) => q.eq("channelId", channelId).eq("userId", user._id))
      .first()

    if (existingTypingStatus) {
      await ctx.db.delete(existingTypingStatus._id) // Delete the record
    }
  },
})

export const getUsersTyping = query({
  args: { channelId: v.string() },
  handler: async (ctx, args) => {
    const channelId = ctx.db.normalizeId("channels", args.channelId)
    if (!channelId) return []
    const { user } = await canManageTeamChannel(ctx, channelId)
    const now = Date.now()
    const activeTypingStatuses = await ctx.db
      .query("userChannelTyping")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .filter((q) => q.gt(q.field("timestamp"), now - TYPING_TIMEOUT_MS) && q.neq(q.field("userId"), user._id))
      .collect()

    const userIds = activeTypingStatuses.map((status) => status.userId)
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)))

    return users.filter(Boolean)
  },
})

export const cleanupOldTypingIndicators = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const oldTypingStatuses = await ctx.db
      .query("userChannelTyping")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", now - TYPING_TIMEOUT_MS * 2))
      .collect()

    for (const status of oldTypingStatuses) {
      await ctx.db.delete(status._id)
    }
  },
})
