import { ConvexError, v } from "convex/values"
import { mutation } from "./_generated/server"
import { canManageTeamMessage, requireUser } from "./auth"

export const add = mutation({
  args: {
    messageId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = ctx.db.normalizeId("messages", args.messageId)
    if (!messageId) throw new ConvexError("Invalid message ID")
    const { user } = await canManageTeamMessage(ctx, messageId)

    return ctx.db.insert("messageReactions", {
      messageId,
      userId: user._id,
      content: args.content,
    })
  },
})

export const remove = mutation({
  args: {
    reactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const reactionId = ctx.db.normalizeId("messageReactions", args.reactionId)
    if (!reactionId) throw new ConvexError("Invalid reaction ID")
    const user = await requireUser(ctx)
    const reaction = await ctx.db.get(reactionId)
    if (!reaction) throw new ConvexError("Reaction not found")
    if (reaction.userId !== user._id) throw new ConvexError("You are not the owner of this reaction")
    await ctx.db.delete(reactionId)

    return true
  },
})
