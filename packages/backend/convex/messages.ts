import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { canManageTeamChannel, requireUser } from "./auth"
import type { OptimisticStatus } from "./optimistic"

export const list = query({
  args: { channelId: v.string(), messageId: v.optional(v.id("messages")), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const channelId = ctx.db.normalizeId("channels", args.channelId)
    if (!channelId) throw new ConvexError("Invalid channel ID")

    let parentMessageId: Id<"messages"> | undefined
    if (args.messageId) {
      parentMessageId = ctx.db.normalizeId("messages", args.messageId) || undefined
      if (!parentMessageId) throw new ConvexError("Invalid parent message ID")
    }
    await canManageTeamChannel(ctx, channelId)

    const result = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .filter((q) => q.eq(q.field("parentMessageId"), parentMessageId))
      .order("desc")
      .paginate(args.paginationOpts)

    const messagesWithAuthorsAndThreads = await Promise.all(
      result.page.map(async (message) => {
        const [user, dbReactions, dbFiles, dbThreadMessages] = await Promise.all([
          ctx.db.get(message.authorId),
          ctx.db
            .query("messageReactions")
            .withIndex("by_message", (q) => q.eq("messageId", message._id))
            .collect(),
          ctx.db
            .query("files")
            .withIndex("by_message", (q) => q.eq("messageId", message._id))
            .collect(),
          ctx.db
            .query("messages")
            .withIndex("by_parent_message", (q) => q.eq("parentMessageId", message._id))
            .collect(),
        ])

        const [reactions, files, image] = await Promise.all([
          Promise.all(
            dbReactions.map(async (reaction: Doc<"messageReactions">) => {
              const user = await ctx.db.get(reaction.userId)
              return { ...reaction, user: { ...user, image: user?.image ? await ctx.storage.getUrl(user.image) : null } }
            }),
          ),
          Promise.all(
            dbFiles.map(async (file) => {
              return {
                ...file,
                metadata: file.storageId ? await ctx.db.system.get(file.storageId) : null,
                url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null,
              }
            }),
          ),
          user?.image && ctx.storage.getUrl(user.image),
        ])

        // Thread info
        let threadInfo = null
        if (dbThreadMessages.length > 0) {
          const participants = await Promise.all(
            dbThreadMessages.map(async (reply) => {
              const user = await ctx.db.get(reply.authorId)
              if (!user) return null
              return { ...user, image: user.image ? await ctx.storage.getUrl(user.image) : null }
            }),
          )
          const uniqueParticipants = [...new Set(participants.filter(Boolean).map((p) => p!._id))]
          threadInfo = {
            parentMessageId: message._id,
            replyCount: dbThreadMessages.length,
            lastReplyTime: dbThreadMessages.length > 0 ? Math.max(...dbThreadMessages.map((r) => r._creationTime)) : undefined,
            participants: uniqueParticipants.map((p) => {
              const user = participants.find((u) => u!._id === p)
              return user!
            }),
          }
        }

        return {
          ...message,
          reactions,
          files,
          optimisticStatus: null as OptimisticStatus,
          author: user ? { ...user, image } : null,
          threadInfo,
        }
      }),
    )

    return { ...result, page: messagesWithAuthorsAndThreads }
  },
})

export const send = mutation({
  args: {
    channelId: v.string(),
    content: v.optional(v.string()),
    parentMessageId: v.optional(v.id("messages")),
    tempMessageId: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { user, channel } = await canManageTeamChannel(ctx, args.channelId)

    const message = await ctx.db.insert("messages", {
      channelId: channel._id,
      authorId: user._id,
      content: args.content,
      parentMessageId: args.parentMessageId,
    })

    const files = await ctx.db
      .query("files")
      .withIndex("by_preview_message_id", (q) => q.eq("previewMessageId", args.tempMessageId))
      .collect()

    await Promise.all(files.map((file) => ctx.db.patch(file._id, { messageId: message })))

    await ctx.scheduler.runAfter(0, internal.pushNotifications.send, { messageId: message, numberOfFiles: files.length })

    return message
  },
})

export const get = query({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const messageId = ctx.db.normalizeId("messages", args.messageId)
    if (!messageId) throw new ConvexError("Invalid message ID")
    const message = await ctx.db.get(messageId)
    if (!message) throw new ConvexError("Message not found")

    const [user, reactions, files] = await Promise.all([
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
        return { ...reaction, user: { ...user, image: user?.image ? await ctx.storage.getUrl(user.image) : null } }
      }),
    )

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        return {
          ...file,
          url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null,
          metadata: file.storageId ? await ctx.db.system.get(file.storageId) : null,
        }
      }),
    )

    return {
      ...message,
      optimisticStatus: null as OptimisticStatus,
      threadInfo: null,
      reactions: reactionsWithUsers,
      files: filesWithUrls,
      author: user ? { ...user, image: user.image ? await ctx.storage.getUrl(user.image) : null } : null,
    }
  },
})

export const remove = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const messageId = ctx.db.normalizeId("messages", args.messageId)
    if (!messageId) throw new ConvexError("Invalid message ID")
    const user = await requireUser(ctx)
    const message = await ctx.db.get(messageId)
    if (!message) throw new ConvexError("Message not found")
    if (message.authorId !== user._id) throw new ConvexError("You are not the author of this message")
    await ctx.db.delete(messageId)
  },
})

export const update = mutation({
  args: { messageId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const messageId = ctx.db.normalizeId("messages", args.messageId)
    if (!messageId) throw new ConvexError("Invalid message ID")
    const user = await requireUser(ctx)
    const message = await ctx.db.get(messageId)
    if (!message) throw new ConvexError("Message not found")
    if (message.authorId !== user._id) throw new ConvexError("You are not the author of this message")
    await ctx.db.patch(messageId, { content: args.content })
  },
})
