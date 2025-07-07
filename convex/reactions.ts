import { ConvexError, v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireUser } from "./auth"

export const add = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    if (!user.teamId) throw new ConvexError("User is not part of a team")
    const message = await ctx.db.get(args.messageId)
    if (!message) throw new ConvexError("Message not found")
    const channel = await ctx.db.get(message.channelId)
    if (!channel) throw new ConvexError("Channel not found")
    if (channel.teamId !== user.teamId) throw new ConvexError("You are not the author of this message")

    return ctx.db.insert("messageReactions", {
      messageId: args.messageId,
      userId: user._id,
      content: args.content,
    })
  },
})

export const remove = mutation({
  args: {
    reactionId: v.id("messageReactions"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const reaction = await ctx.db.get(args.reactionId)
    if (!reaction) throw new ConvexError("Reaction not found")
    if (reaction.userId !== user._id) throw new ConvexError("You are not the owner of this reaction")
    await ctx.db.delete(args.reactionId)

    return true
  },
})
