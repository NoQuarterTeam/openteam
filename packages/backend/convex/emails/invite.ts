"use node"
import { ConvexError, v } from "convex/values"
import { internalAction } from "../_generated/server"
import { InviteEmail } from "./InviteEmail"

export const send = internalAction({
  args: {
    teamId: v.id("teams"),
    teamName: v.string(),
    inviteId: v.id("invites"),
    email: v.string(),
  },
  handler: async (_, args) => {
    const { render } = await import("@react-email/render")
    const inviteLink = `${process.env.SITE_URL}/${args.teamId}/invite/${args.inviteId}`
    const emailHtml = await render(InviteEmail({ teamName: args.teamName, inviteLink }))

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "OpenTeam <auth@updates.openteam.app>",
        to: [args.email],
        subject: `You've been invited to join ${args.teamName} on OpenTeam!`,
        html: emailHtml,
        text: `You've been invited to join ${args.teamName} on OpenTeam! Accept your invite: ${inviteLink}`,
      }),
    })
    if (!res.ok) {
      throw new ConvexError("Could not send invite email")
    }
  },
})
