import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)

    const user = await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("_id", userId))
      .first()

    if (!user) return null

    let avatarUrl = null
    if (user.image) {
      avatarUrl = await ctx.storage.getUrl(user.image as Id<"_storage">)
    }

    return { ...user, avatarUrl }
  },
})

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    const existing = await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("_id", userId))
      .first()

    if (!existing) throw new ConvexError("User not found")

    return await ctx.db.patch(existing._id, args)
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)

    const users = await ctx.db.query("users").collect()

    return await Promise.all(
      users.map(async (user) => {
        const image = user.image ? await ctx.storage.getUrl(user.image as Id<"_storage">) : null

        return { ...user, image }
      }),
    )
  },
})
