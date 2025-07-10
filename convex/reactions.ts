import { ConvexError, v } from "convex/values"
import { mutation } from "./_generated/server"
import { canManageTeamMessage, requireUser } from "./auth"

export const add = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await canManageTeamMessage(ctx, args.messageId)

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
