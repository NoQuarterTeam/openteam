import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const list = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("asc")
      .take(100)

    // Get author profiles for each message
    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const [user, dbReactions, dbFiles] = await Promise.all([
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

        const [reactions, files] = await Promise.all([
          Promise.all(
            dbReactions.map(async (reaction) => {
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
        ])

        let image = null
        if (user?.image) image = await ctx.storage.getUrl(user.image)

        return { ...message, reactions, files: files.filter(Boolean), temp: false, author: user ? { ...user, image } : null }
      }),
    )

    return messagesWithAuthors
  },
})

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    content: v.optional(v.string()),
    files: v.optional(v.array(v.object({ name: v.string(), storageId: v.id("_storage") }))),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    const message = await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: userId,
      content: args.content,
    })

    if (args.files) {
      await Promise.all(
        args.files.map((file) => ctx.db.insert("files", { name: file.name, messageId: message, storageId: file.storageId })),
      )
    }

    return message
  },
})

export const search = query({
  args: {
    query: v.string(),
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx)

    if (!args.query.trim()) return []

    const searchQuery = ctx.db.query("messages").withSearchIndex("search_content", (q) => {
      return q.search("content", args.query)
    })

    const messages = await searchQuery.take(20)

    // Get author profiles and channel names for each message
    const messagesWithDetails = await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db.get(message.authorId)
        const channel = await ctx.db.get(message.channelId)

        let image = null
        if (user?.image) image = await ctx.storage.getUrl(user.image)

        return {
          ...message,
          author: user ? { ...user, image } : null,
          channelName: channel?.name || "Unknown Channel",
        }
      }),
    )

    return messagesWithDetails
  },
})

export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error("Message not found")
    if (message.authorId !== userId) throw new Error("You are not the author of this message")
    await ctx.db.delete(args.messageId)
  },
})

export const update = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    const message = await ctx.db.get(args.messageId)
    if (!message) throw new ConvexError("Message not found")
    if (message.authorId !== userId) throw new ConvexError("You are not the author of this message")
    await ctx.db.patch(args.messageId, { content: args.content })
  },
})
