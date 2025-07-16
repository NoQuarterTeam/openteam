import { ConvexError, v } from "convex/values"
import { query } from "./_generated/server"
import { canManageTeam } from "./auth"

export const list = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const teamId = ctx.db.normalizeId("teams", args.teamId)
    if (!teamId) throw new ConvexError("Invalid team ID")
    await canManageTeam(ctx, teamId)
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect()
    return invites
  },
})
