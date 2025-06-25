import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("asc")
      .take(100)

    // Get author profiles for each message
    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db.get(message.authorId)

        const dbFiles = await ctx.db
          .query("files")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect()

        const files = await Promise.all(
          dbFiles.map(async (file) => {
            const fileDb = await ctx.db.get(file._id)
            if (!fileDb?.storageId) return null
            const metadata = await ctx.db.system.get(fileDb.storageId)
            if (!metadata) return null
            return { ...fileDb, metadata, url: await ctx.storage.getUrl(fileDb.storageId) }
          }),
        )

        let image = null
        if (user?.image) image = await ctx.storage.getUrl(user.image)

        return { ...message, files: files.filter(Boolean), temp: false, author: user ? { ...user, image } : null }
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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Not authenticated")

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
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }

    if (!args.query.trim()) return []

    const searchQuery = ctx.db.query("messages").withSearchIndex("search_content", (q) => {
      let query = q.search("content", args.query)
      if (args.channelId) {
        query = query.eq("channelId", args.channelId)
      }
      return query
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
