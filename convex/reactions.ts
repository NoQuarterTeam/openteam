import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireUser } from "./auth"

export const add = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    const message = await ctx.db.insert("messageReactions", {
      messageId: args.messageId,
      userId: userId,
      content: args.content,
    })
    return message
  },
})

export const remove = mutation({
  args: {
    reactionId: v.id("messageReactions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    const reaction = await ctx.db.get(args.reactionId)
    if (!reaction) throw new Error("Reaction not found")
    if (reaction.userId !== userId) throw new Error("You are not the owner of this reaction")
    await ctx.db.delete(args.reactionId)

    return true
  },
})
