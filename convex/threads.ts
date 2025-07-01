import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const create = mutation({
  args: {
    parentMessageId: v.id("messages"),
    title: v.optional(v.string()),
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
    
    if (existingThread) {
      return existingThread._id
    }
    
    return await ctx.db.insert("threads", {
      channelId: parentMessage.channelId,
      parentMessageId: args.parentMessageId,
      createdBy: userId,
      title: args.title,
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
      reactions.map(async (reaction) => ({
        ...reaction,
        user: { ...(await ctx.db.get(reaction.userId))!, image: null },
      }))
    )
    
    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
        metadata: await ctx.db.system.get(file.storageId),
      }))
    )
    
    // Add user images
    for (const reaction of reactionsWithUsers) {
      if (reaction.user.image) {
        reaction.user.image = await ctx.storage.getUrl(reaction.user.image)
      }
    }
    
    let authorImage = null
    if (author?.image) {
      authorImage = await ctx.storage.getUrl(author.image)
    }
    
    return {
      thread,
      parentMessage: {
        ...parentMessage,
        author: author ? { ...author, image: authorImage } : null,
        reactions: reactionsWithUsers,
        files: filesWithUrls,
      },
    }
  },
})

export const listChannelThreads = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await requireUser(ctx)
    
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect()
    
    return await Promise.all(threads.map(async (thread) => {
      const replies = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect()
      
      return {
        threadId: thread._id,
        parentMessageId: thread.parentMessageId,
        replyCount: replies.length,
        lastReplyTime: replies.length > 0 ? Math.max(...replies.map(r => r._creationTime)) : undefined,
      }
    }))
  },
})

export const sendMessage = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
    files: v.optional(v.array(v.object({ name: v.string(), storageId: v.id("_storage") }))),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    
    const thread = await ctx.db.get(args.threadId)
    if (!thread) throw new Error("Thread not found")
    
    const message = await ctx.db.insert("messages", {
      channelId: thread.channelId,
      authorId: userId,
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

export const listMessages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireUser(ctx)
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect()
    
    return await Promise.all(messages.map(async (message) => {
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
        reactions.map(async (reaction) => ({
          ...reaction,
          user: { ...(await ctx.db.get(reaction.userId))!, image: null },
        }))
      )
      
      const filesWithUrls = await Promise.all(
        files.map(async (file) => ({
          ...file,
          url: await ctx.storage.getUrl(file.storageId),
          metadata: await ctx.db.system.get(file.storageId),
        }))
      )
      
      // Add user images
      for (const reaction of reactionsWithUsers) {
        if (reaction.user.image) {
          reaction.user.image = await ctx.storage.getUrl(reaction.user.image)
        }
      }
      
      let authorImage = null
      if (author?.image) {
        authorImage = await ctx.storage.getUrl(author.image)
      }
      
      return {
        ...message,
        author: author ? { ...author, image: authorImage } : null,
        reactions: reactionsWithUsers,
        files: filesWithUrls,
        temp: false,
      }
    }))
  },
})