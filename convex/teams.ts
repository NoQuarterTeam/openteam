import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    if (!user.teamId) throw new ConvexError("User is not part of a team")

    const team = await ctx.db.get(user.teamId)
    if (!team) throw new ConvexError("Team not found")

    const existing = await ctx.db.get(team._id)

    if (!existing) throw new ConvexError("User not found")

    return await ctx.db.patch(existing._id, args)
  },
})

export const get = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    if (!user.teamId) throw new ConvexError("User is not part of a team")
    const team = await ctx.db.get(user.teamId)
    if (!team) throw new ConvexError("Team not found")

    let image = null
    if (team.image) {
      image = await ctx.storage.getUrl(team.image as Id<"_storage">)
    }

    return { ...team, image }
  },
})
