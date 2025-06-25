import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (!profile) {
      return null
    }

    let avatarUrl = null
    if (profile.avatarId) {
      avatarUrl = await ctx.storage.getUrl(profile.avatarId)
    }

    return {
      ...profile,
      avatarUrl,
    }
  },
})

export const update = mutation({
  args: {
    name: v.string(),
    avatarId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        avatarId: args.avatarId,
      })
      return existing._id
    } else {
      return await ctx.db.insert("profiles", {
        userId,
        name: args.name,
        avatarId: args.avatarId,
      })
    }
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }

    return await ctx.storage.generateUploadUrl()
  },
})
