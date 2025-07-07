import { ConvexError, v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireUser } from "./auth"

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const existing = await ctx.db.get(user._id)

    if (!existing) throw new ConvexError("User not found")

    return await ctx.db.patch(existing._id, args)
  },
})
