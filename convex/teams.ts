import { ConvexError, v } from "convex/values"
import { getManyVia } from "convex-helpers/server/relationships"
import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { canManageTeam, requireUser } from "./auth"

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const team = await ctx.db.insert("teams", { name: args.name, createdBy: user._id })
    await ctx.db.insert("userTeams", { userId: user._id, teamId: team, role: "admin" })
    await ctx.db.insert("channels", { name: "general", createdBy: user._id, teamId: team })
    await ctx.db.insert("channels", { name: user._id, createdBy: user._id, userId: user._id, teamId: team })
    return team
  },
})
export const update = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { teamId, ...input }) => {
    await canManageTeam(ctx, teamId)

    return await ctx.db.patch(teamId, input)
  },
})

export const get = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { team } = await canManageTeam(ctx, args.teamId)

    let image = null
    if (team.image) {
      image = await ctx.storage.getUrl(team.image as Id<"_storage">)
    }
    const createdBy = await ctx.db.get(team.createdBy)

    return { ...team, image, createdBy }
  },
})
export const getPublic = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId)
    if (!team) throw new ConvexError("Team not found")

    let image = null
    if (team.image) {
      image = await ctx.storage.getUrl(team.image as Id<"_storage">)
    }

    return { ...team, image }
  },
})

export const myTeams = query({
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const teams = await getManyVia(ctx.db, "userTeams", "teamId", "by_user", user._id, "userId")
    return await Promise.all(
      teams
        .filter((team) => !!team)
        .map(async (team) => ({
          ...team,
          image: team.image ? await ctx.storage.getUrl(team.image as Id<"_storage">) : null,
        })),
    )
  },
})

export const listMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await canManageTeam(ctx, args.teamId)
    const userTeams = await ctx.db
      .query("userTeams")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect()
    const members = await Promise.all(
      userTeams.map(async (ut) => {
        const user = await ctx.db.get(ut.userId)
        if (!user) return null
        const image = user.image ? await ctx.storage.getUrl(user.image) : null
        return { _id: user._id, name: user.name, email: user.email, image, role: ut.role, userTeamId: ut._id }
      }),
    )
    return members.filter(Boolean)
  },
})
