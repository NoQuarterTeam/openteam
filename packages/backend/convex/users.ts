import { ConvexError, v } from "convex/values"
import { mutation } from "./_generated/server"
import { canManageTeam, requireUser } from "./auth"

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

export const updateUserRole = mutation({
  args: {
    userTeamId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const userTeamId = ctx.db.normalizeId("userTeams", args.userTeamId)
    if (!userTeamId) throw new ConvexError("Invalid user team ID")
    const userTeam = await ctx.db.get(userTeamId)

    if (!userTeam) throw new ConvexError("User team not found")

    const team = await ctx.db.get(userTeam.teamId)
    if (!team) throw new ConvexError("Team not found")

    const { userTeam: userTeamData } = await canManageTeam(ctx, team._id)

    if (userTeamData.role !== "admin") throw new ConvexError("You are not allowed to update this user's role")

    return await ctx.db.patch(userTeamId, { role: args.role })
  },
})

export const remove = mutation({
  args: {
    userTeamId: v.string(),
  },
  handler: async (ctx, args) => {
    const userTeamId = ctx.db.normalizeId("userTeams", args.userTeamId)
    if (!userTeamId) throw new ConvexError("Invalid user team ID")

    const userTeam = await ctx.db.get(userTeamId)
    if (!userTeam) throw new ConvexError("User team not found")

    const team = await ctx.db.get(userTeam.teamId)
    if (!team) throw new ConvexError("Team not found")

    const user = await ctx.db.get(userTeam.userId)
    if (!user) throw new ConvexError("User not found")

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .filter((q) => q.eq(q.field("teamId"), team._id))
      .first()
    if (invite) await ctx.db.delete(invite._id)

    const { userTeam: userTeamData } = await canManageTeam(ctx, team._id)

    if (userTeamData.role !== "admin") throw new ConvexError("You are not allowed to remove this user")

    return await ctx.db.delete(userTeamId)
  },
})
