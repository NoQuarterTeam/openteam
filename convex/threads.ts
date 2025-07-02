import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const create = mutation({
  args: {
    parentMessageId: v.id("messages"),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    const parentMessage = await ctx.db.get(args.parentMessageId)
    if (!parentMessage) throw new Error("Parent message not found")

    // Check if thread already exists for this message
    const existingThread = await ctx.db
      .query("threads")
      .withIndex("by_parent_message", (q) => q.eq("parentMessageId", args.parentMessageId))
      .unique()

    if (existingThread) return existingThread._id

    return await ctx.db.insert("threads", {
      channelId: parentMessage.channelId,
      parentMessageId: args.parentMessageId,
      createdBy: userId,
    })
  },
})

export const get = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const thread = await ctx.db.get(args.threadId)
    if (!thread) return null

    const parentMessage = await ctx.db.get(thread.parentMessageId)
    if (!parentMessage) return null

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
        url: await ctx.storage.getUrl(file.storageId),
        metadata: (await ctx.db.system.get(file.storageId))!,
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
        temp: false,
        author: author ? { ...author, image: authorImage } : null,
        reactions: reactionsWithUsers.filter(Boolean),
        files: filesWithUrls,
        threadInfo: null,
      },
    }
  },
})

export const listMessages = query({
  args: { threadId: v.id("threads"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const result = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
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
            url: await ctx.storage.getUrl(file.storageId),
            metadata: (await ctx.db.system.get(file.storageId))!,
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
          temp: false,
        }
      }),
    )

    return { ...result, page: messagesWithAuthorsAndFiles }
  },
})
