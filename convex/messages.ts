import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { canManageTeamChannel, requireUser } from "./auth"
import type { OptimisticStatus } from "./optimistic"

export const list = query({
  args: { channelId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const channelId = ctx.db.normalizeId("channels", args.channelId)
    if (!channelId) throw new ConvexError("Invalid channel ID")
    await canManageTeamChannel(ctx, channelId)

    const result = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .filter((q) => q.eq(q.field("threadId"), undefined))
      .order("desc")
      .paginate(args.paginationOpts)

    const messagesWithAuthorsAndThreads = await Promise.all(
      result.page.map(async (message) => {
        const [user, dbReactions, dbFiles, thread] = await Promise.all([
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
            .query("threads")
            .withIndex("by_parent_message", (q) => q.eq("parentMessageId", message._id))
            .first(),
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
              const fileDb = await ctx.db.get(file._id)
              if (!fileDb?.storageId) return null
              const metadata = await ctx.db.system.get(fileDb.storageId)
              if (!metadata) return null
              return { ...fileDb, metadata, url: await ctx.storage.getUrl(fileDb.storageId) }
            }),
          ),
          user?.image && ctx.storage.getUrl(user.image),
        ])

        // Thread info
        let threadInfo = null
        if (thread) {
          const replies = await ctx.db
            .query("messages")
            .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
            .collect()
          const participants = await Promise.all(
            replies.map(async (reply) => {
              const user = await ctx.db.get(reply.authorId)
              if (!user) return null
              return { ...user, image: user.image ? await ctx.storage.getUrl(user.image) : null }
            }),
          )
          const uniqueParticipants = [...new Set(participants.filter(Boolean).map((p) => p!._id))]
          threadInfo = {
            threadId: thread._id,
            parentMessageId: thread.parentMessageId,
            replyCount: replies.length,
            lastReplyTime: replies.length > 0 ? Math.max(...replies.map((r) => r._creationTime)) : undefined,
            participants: uniqueParticipants.map((p) => {
              const user = participants.find((u) => u!._id === p)
              return user!
            }),
          }
        }

        return {
          ...message,
          reactions,
          files: files.filter(Boolean),
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
    files: v.optional(v.array(v.object({ name: v.string(), storageId: v.id("_storage") }))),
    threadId: v.optional(v.id("threads")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    let channelId = ctx.db.normalizeId("channels", args.channelId)
    if (!channelId) throw new ConvexError("Invalid channel ID")
    const user = await canManageTeamChannel(ctx, channelId)

    // If threadId is provided, verify the thread exists and get channelId from it
    if (args.threadId) {
      const thread = await ctx.db.get(args.threadId)
      if (!thread) throw new Error("Thread not found")
      channelId = thread.channelId
    }

    const message = await ctx.db.insert("messages", {
      channelId,
      authorId: user._id,
      content: args.content,
      threadId: args.threadId,
    })

    if (args.files) {
      await Promise.all(
        args.files.map((file) => ctx.db.insert("files", { name: file.name, messageId: message, storageId: file.storageId })),
      )
    }

    return message
  },
})

export const deleteMessage = mutation({
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
