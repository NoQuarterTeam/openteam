import { PushNotifications } from "@convex-dev/expo-push-notifications"
import { ConvexError, v } from "convex/values"
import { components } from "./_generated/api"
import { internalMutation, mutation } from "./_generated/server"
import { requireUser } from "./auth"

export const pushNotifications = new PushNotifications(components.pushNotifications)

export const saveToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await pushNotifications.recordToken(ctx, { userId: user._id, pushToken: args.token })
  },
})

export const send = internalMutation({
  args: {
    messageId: v.id("messages"),
    numberOfFiles: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const message = await ctx.db.get(args.messageId)
      if (!message) throw new ConvexError("Message not found")
      const channel = await ctx.db.get(message.channelId)
      if (!channel) throw new ConvexError("Channel not found")
      const team = await ctx.db.get(channel.teamId)
      if (!team) throw new ConvexError("Team not found")

      const userTeams = await ctx.db
        .query("userTeams")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .filter((q) => q.neq(q.field("userId"), message.authorId))
        .collect()

      if (message.content || args.numberOfFiles > 0) {
        await Promise.all(
          userTeams.map(async (userTeam) => {
            const user = await ctx.db.get(userTeam.userId)
            if (!user) return
            const status = await pushNotifications.getStatusForUser(ctx, { userId: user._id })
            if (!status.hasToken) return
            const userChannelActivity = await ctx.db
              .query("userChannelActivity")
              .withIndex("by_user_channel", (q) => q.eq("userId", user._id).eq("channelId", message.channelId))
              .first()

            if (userChannelActivity?.isMuted) return

            await pushNotifications.sendPushNotification(ctx, {
              userId: user._id,
              notification: {
                mutableContent: true,
                title: user.name,
                body: message.content || `Sent ${args.numberOfFiles} file${args.numberOfFiles === 1 ? "" : "s"}`,
                data: {
                  type: "NEW_MESSAGE",
                  parentMessageId: message.parentMessageId,
                  channelId: message.channelId,
                  teamId: team._id,
                },
              },
            })
            return
          }),
        )
      }
    } catch (error) {
      console.error(error)
    }
  },
})
