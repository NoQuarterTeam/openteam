import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { canManageTeam } from "./auth"

export const list = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const teamId = ctx.db.normalizeId("teams", args.teamId)
    if (!teamId) throw new ConvexError("Invalid team ID")
    await canManageTeam(ctx, teamId)
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .filter((q) => q.eq(q.field("acceptedAt"), null))
      .collect()
    return invites
  },
})

export const get = query({
  args: { inviteId: v.string() },
  handler: async (ctx, args) => {
    const inviteId = ctx.db.normalizeId("invites", args.inviteId)
    if (!inviteId) throw new ConvexError("Invalid invite ID")
    return await ctx.db.get(inviteId)
  },
})

export const create = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const teamId = ctx.db.normalizeId("teams", args.teamId)
    if (!teamId) throw new ConvexError("Invalid team ID")
    const { user, team } = await canManageTeam(ctx, teamId)

    // Check for existing invite
    const existing = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("teamId"), teamId))
      .first()
    if (existing) throw new ConvexError("Invite already sent to this email for this team")

    // Insert invite
    const inviteId = await ctx.db.insert("invites", { email: args.email, role: args.role, teamId, createdBy: user._id })

    await ctx.scheduler.runAfter(0, internal.emails.invite.send, { teamId, teamName: team.name, inviteId, email: args.email })

    return inviteId
  },
})

export const accept = mutation({
  args: {
    inviteId: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteId = ctx.db.normalizeId("invites", args.inviteId)
    if (!inviteId) throw new ConvexError("Invalid invite ID")
    const invite = await ctx.db.get(inviteId)
    if (!invite) throw new ConvexError("Invite not found")
    if (invite.acceptedAt) throw new ConvexError("Invite already accepted")

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", invite.email))
      .first()
    if (!user) throw new ConvexError("User not found for this invite email")

    // Mark invite as accepted
    await ctx.db.patch(inviteId, { acceptedAt: Date.now() })

    // Add to userTeams
    await ctx.db.insert("userTeams", { userId: user._id, teamId: invite.teamId, role: invite.role })

    return true
  },
})

export const remove = mutation({
  args: { inviteId: v.string() },
  handler: async (ctx, args) => {
    const inviteId = ctx.db.normalizeId("invites", args.inviteId)
    if (!inviteId) throw new ConvexError("Invalid invite ID")
    const invite = await ctx.db.get(inviteId)
    if (!invite) throw new ConvexError("Invite not found")

    // Mark invite as rejected
    await ctx.db.delete(inviteId)

    return true
  },
})
