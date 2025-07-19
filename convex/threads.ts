import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { canManageTeamChannel, requireUser } from "./auth"
import type { OptimisticStatus } from "./optimistic"

export const create = mutation({
  args: {
    parentMessageId: v.string(),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const parentMessageId = ctx.db.normalizeId("messages", args.parentMessageId)
    if (!parentMessageId) throw new ConvexError("Invalid parent message ID")
    const user = await requireUser(ctx)

    const parentMessage = await ctx.db.get(parentMessageId)
    if (!parentMessage) throw new Error("Parent message not found")

    // Check if thread already exists for this message
    const existingThread = await ctx.db
      .query("threads")
      .withIndex("by_parent_message", (q) => q.eq("parentMessageId", parentMessageId))
      .unique()

    if (existingThread) return existingThread._id

    return await ctx.db.insert("threads", {
      channelId: parentMessage.channelId,
      parentMessageId,
      createdBy: user._id,
    })
  },
})

export const get = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId("threads", args.threadId)
    if (!threadId) throw new ConvexError("Invalid thread ID")
    const thread = await ctx.db.get(threadId)
    if (!thread) throw new ConvexError("Thread not found")

    const parentMessage = await ctx.db.get(thread.parentMessageId)
    if (!parentMessage) throw new ConvexError("Parent message not found")

    await canManageTeamChannel(ctx, thread.channelId)

    // Get author and files for parent message
    const [author, reactions, files] = await Promise.all([
      ctx.db.get(parentMessage.authorId),
      ctx.db
        .query("messageReactions")
        .withIndex("by_message", (q) => q.eq("messageId", parentMessage._id))
        .collect(),
      ctx.db
        .query("files")
        .withIndex("by_message", (q) => q.eq("messageId", parentMessage._id))
        .collect(),
    ])

    const reactionsWithUsers = await Promise.all(
      reactions.map(async (reaction) => {
        const user = await ctx.db.get(reaction.userId)
        if (!user) return null
        return {
          ...reaction,
          user: { ...user!, image: user.image ? await ctx.storage.getUrl(user.image) : null },
        }
      }),
    )

    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null,
        metadata: file.storageId ? (await ctx.db.system.get(file.storageId))! : null,
      })),
    )

    let authorImage = null
    if (author?.image) {
      authorImage = await ctx.storage.getUrl(author.image)
    }

    return {
      thread,
      parentMessage: {
        ...parentMessage,
        optimisticStatus: null,
        author: author ? { ...author, image: authorImage } : null,
        reactions: reactionsWithUsers.filter(Boolean),
        files: filesWithUrls,
        threadInfo: null,
      },
    }
  },
})

export const listMessages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId("threads", args.threadId)
    if (!threadId) throw new ConvexError("Invalid thread ID")
    const thread = await ctx.db.get(threadId)
    if (!thread) throw new ConvexError("Thread not found")

    const parentMessage = await ctx.db.get(thread.parentMessageId)
    if (!parentMessage) throw new ConvexError("Parent message not found")

    await canManageTeamChannel(ctx, thread.channelId)

    const result = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .paginate(args.paginationOpts)

    const messagesWithAuthorsAndFiles = await Promise.all(
      result.page.map(async (message) => {
        const [author, reactions, files] = await Promise.all([
          ctx.db.get(message.authorId),
          ctx.db
            .query("messageReactions")
            .withIndex("by_message", (q) => q.eq("messageId", message._id))
            .collect(),
          ctx.db
            .query("files")
            .withIndex("by_message", (q) => q.eq("messageId", message._id))
            .collect(),
        ])

        const reactionsWithUsers = await Promise.all(
          reactions.map(async (reaction) => {
            const user = await ctx.db.get(reaction.userId)
            if (!user) return null
            return {
              ...reaction,
              user: { ...user!, image: user.image ? await ctx.storage.getUrl(user.image) : null },
            }
          }),
        )

        const filesWithUrls = await Promise.all(
          files.map(async (file) => ({
            ...file,
            url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null,
            metadata: file.storageId ? (await ctx.db.system.get(file.storageId))! : null,
          })),
        )

        let authorImage = null
        if (author?.image) {
          authorImage = await ctx.storage.getUrl(author.image)
        }

        return {
          ...message,
          author: author ? { ...author, image: authorImage } : null,
          reactions: reactionsWithUsers.filter(Boolean),
          files: filesWithUrls,
          optimisticStatus: null as OptimisticStatus,
        }
      }),
    )

    return { ...result, page: messagesWithAuthorsAndFiles }
  },
})
