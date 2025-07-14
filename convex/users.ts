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
    userTeamId: v.id("userTeams"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const userTeam = await ctx.db.get(args.userTeamId)

    if (!userTeam) throw new ConvexError("User team not found")

    const team = await ctx.db.get(userTeam.teamId)
    if (!team) throw new ConvexError("Team not found")

    const { userTeam: userTeamData } = await canManageTeam(ctx, team._id)

    if (userTeamData.role !== "admin") throw new ConvexError("You are not allowed to update this user's role")

    return await ctx.db.patch(args.userTeamId, { role: args.role })
  },
})
