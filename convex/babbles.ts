import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { canManageTeam, requireUser } from "./auth"

export const join = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const { user } = await canManageTeam(ctx, args.teamId)

    // delete all existing babblers for me and this team

    const babblers = await ctx.db
      .query("babblers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()

    for (const babbler of babblers) {
      await ctx.db.delete(babbler._id)
    }

    // Add user as participant
    await ctx.db.insert("babblers", { userId: user._id, teamId: args.teamId, joinedAt: Date.now() })

    return null
  },
})

export const leave = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const { user } = await canManageTeam(ctx, args.teamId)

    // Find user's babbler
    const babbler = await ctx.db
      .query("babblers")
      .withIndex("by_user_team", (q) => q.eq("userId", user._id).eq("teamId", args.teamId))
      .first()

    if (babbler) {
      await ctx.db.delete(babbler._id)
    }

    return null
  },
})

export const getBabblers = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    await canManageTeam(ctx, args.teamId)

    const babblers = await ctx.db
      .query("babblers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect()

    const babblersWithUsers = await Promise.all(
      babblers.map(async (participant) => {
        const user = await ctx.db.get(participant.userId)
        if (!user) return null
        const image = user.image ? await ctx.storage.getUrl(user.image) : null
        return { ...participant, user: { ...user, image } }
      }),
    )

    return babblersWithUsers.filter(Boolean)
  },
})

// WebRTC Signaling functions
export const sendSignal = mutation({
  args: {
    targetUserId: v.id("users"),
    signal: v.any(),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const { user } = await canManageTeam(ctx, args.teamId)

    // Verify both users are in the babble
    const senderBabbler = await ctx.db
      .query("babblers")
      .withIndex("by_user_team", (q) => q.eq("userId", user._id).eq("teamId", args.teamId))
      .first()

    const targetBabbler = await ctx.db
      .query("babblers")
      .withIndex("by_user_team", (q) => q.eq("userId", args.targetUserId).eq("teamId", args.teamId))
      .first()

    if (!senderBabbler || !targetBabbler) {
      throw new ConvexError("Both users must be in the babble to exchange signals")
    }

    // Store the signal (it will be picked up by the target user's polling)
    await ctx.db.insert("babbleSignals", {
      fromUserId: user._id,
      toUserId: args.targetUserId,
      signal: args.signal,
      createdAt: Date.now(),
    })

    return null
  },
})

export const getSignals = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    // Get all signals for this user from the last 30 seconds
    const thirtySecondsAgo = Date.now() - 30000
    const signals = await ctx.db
      .query("babbleSignals")
      .withIndex("by_to_user", (q) => q.eq("toUserId", user._id))
      .filter((q) => q.gt(q.field("createdAt"), thirtySecondsAgo))
      .collect()

    return signals
  },
})

export const deleteSignal = mutation({
  args: {
    signalId: v.id("babbleSignals"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const signal = await ctx.db.get(args.signalId)
    if (!signal) return null

    // Only allow deleting signals addressed to the current user
    if (signal.toUserId !== user._id) {
      throw new ConvexError("You can only delete signals addressed to you")
    }

    await ctx.db.delete(args.signalId)
    return null
  },
})
