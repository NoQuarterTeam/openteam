import { ConvexError } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const join = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)

    // Check if user is already in the babble
    const existingBabbler = await ctx.db
      .query("babblers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (existingBabbler) throw new ConvexError("You're already in the babble")

    // Add user as participant
    await ctx.db.insert("babblers", {
      userId,
      joinedAt: Date.now(),
    })

    return null
  },
})

export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)

    // Find user's babbler
    const babbler = await ctx.db
      .query("babblers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (!babbler) throw new ConvexError("You're not in the babble")

    // Remove user from babblers
    await ctx.db.delete(babbler._id)

    return null
  },
})

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)

    const babblers = await ctx.db.query("babblers").collect()

    const babblersWithUsers = await Promise.all(
      babblers.map(async (participant) => {
        const user = await ctx.db.get(participant.userId)
        if (!user) return null
        const image = user.image ? await ctx.storage.getUrl(user.image) : null
        return { ...participant, user: { ...user, image } }
      }),
    )

    const validBabblers = babblersWithUsers.filter(Boolean)

    return validBabblers.length > 0 ? { babblers: validBabblers } : null
  },
})

export const getCurrentUserActiveBabble = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)

    const babbler = await ctx.db
      .query("babblers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    return babbler ? { isActive: true } : null
  },
})
