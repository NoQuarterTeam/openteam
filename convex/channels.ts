import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    return await ctx.db
      .query("channels")
      .filter((q) => q.eq(q.field("archivedTime"), undefined))
      .order("asc")
      .collect()
  },
})

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    // Check if channel already exists
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first()

    if (existing) throw new Error("Channel already exists")

    return await ctx.db.insert("channels", { name: args.name, createdBy: userId })
  },
})
export const update = mutation({
  args: { channelId: v.id("channels"), name: v.optional(v.string()), archivedTime: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const data: any = {}
    if (args.name) data.name = args.name
    if (args.archivedTime) data.archivedTime = args.archivedTime

    return await ctx.db.patch(args.channelId, data)
  },
})

export const get = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const channel = await ctx.db.get(args.channelId)
    if (!channel) return null
    return channel
  },
})
