import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { canManageTeam } from "./auth";

export const list = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const teamId = ctx.db.normalizeId("teams", args.teamId);
    if (!teamId) throw new ConvexError("Invalid team ID");
    await canManageTeam(ctx, teamId);
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
    return invites;
  },
});

export const createInvite = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const teamId = ctx.db.normalizeId("teams", args.teamId);
    if (!teamId) throw new ConvexError("Invalid team ID");
    const { user } = await canManageTeam(ctx, teamId);

    // Check for existing invite
    const existing = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing && existing.teamId === teamId && !existing.acceptedAt) {
      throw new ConvexError("Invite already sent to this email for this team");
    }

    // Insert invite
    const inviteId = await ctx.db.insert("invites", {
      email: args.email,
      role: args.role,
      teamId,
      createdBy: user._id,
      acceptedAt: undefined,
    });

    // Send invite email using Resend
    try {
      const { render } = await import("@react-email/render");
      const { InviteEmail } = await import("./otp/InviteEmail");
      const team = await ctx.db.get(teamId);
      const inviteLink = `${
        process.env.PUBLIC_APP_ORIGIN || "https://app.openteam.app"
      }/${teamId}/invite/${inviteId}`;
      const emailHtml = await render(
        InviteEmail({ teamName: team?.name || "a team", inviteLink })
      );
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "OpenTeam <auth@updates.openteam.app>",
          to: [args.email],
          subject: `You've been invited to join ${
            team?.name || "a team"
          } on OpenTeam!`,
          html: emailHtml,
          text: `You've been invited to join ${
            team?.name || "a team"
          } on OpenTeam! Accept your invite: ${inviteLink}`,
        }),
      });
      if (!res.ok) {
        throw new ConvexError("Could not send invite email");
      }
    } catch (err) {
      // Optionally: log error, but don't block invite creation
      console.error("Failed to send invite email", err);
    }

    return inviteId;
  },
});

export const acceptInvite = mutation({
  args: {
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new ConvexError("Invite not found");
    if (invite.acceptedAt) throw new ConvexError("Invite already accepted");

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", invite.email))
      .first();
    if (!user) throw new ConvexError("User not found for this invite email");

    // Mark invite as accepted
    await ctx.db.patch(args.inviteId, { acceptedAt: Date.now() });

    // Add to userTeams
    await ctx.db.insert("userTeams", {
      userId: user._id,
      teamId: invite.teamId,
      role: invite.role,
    });

    return true;
  },
});
