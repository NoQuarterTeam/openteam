import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)

    const [channels, channelOrders] = await Promise.all([
      ctx.db
        .query("channels")
        .filter((q) => q.eq(q.field("archivedTime"), undefined))
        .order("asc")
        .collect(),
      ctx.db
        .query("channelOrders")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ])

    const orderMap = new Map(channelOrders.map((order) => [order.channelId, order.order]))

    const sortedChannels = channels.sort((a, b) => {
      const orderA = orderMap.get(a._id) ?? a._creationTime
      const orderB = orderMap.get(b._id) ?? b._creationTime
      return orderA - orderB
    })

    return await Promise.all(
      sortedChannels.map(async (channel) => {
        const dmUser = channel.userId ? await ctx.db.get(channel.userId) : null
        const userChannelActivity = await ctx.db
          .query("userChannelActivity")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first()

        const unreadMessages = userChannelActivity?.lastReadMessageTime
          ? await ctx.db
              .query("messages")
              .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
              .filter((q) =>
                q.and(
                  q.neq(q.field("authorId"), userId),
                  q.gte(q.field("_creationTime"), userChannelActivity.lastReadMessageTime!),
                ),
              )
              .take(100)
          : await ctx.db
              .query("messages")
              .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
              .filter((q) => q.neq(q.field("authorId"), userId))
              .take(100)

        return {
          ...channel,
          isMuted: !!userChannelActivity?.isMuted,
          unreadCount: unreadMessages.length,
          dmUser: dmUser ? { ...dmUser, image: dmUser.image ? await ctx.storage.getUrl(dmUser.image) : null } : null,
        }
      }),
    )
  },
})

export const markAsRead = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    const channelActivity = await ctx.db
      .query("userChannelActivity")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!channelActivity) {
      await ctx.db.insert("userChannelActivity", {
        channelId: args.channelId,
        isFavourite: false,
        isMuted: false,
        userId,
        lastReadMessageTime: Date.now(),
      })
    } else {
      await ctx.db.patch(channelActivity._id, { lastReadMessageTime: Date.now() })
    }
  },
})

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    // Check if channel already exists
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first()

    if (existing) throw new ConvexError("Channel already exists")

    const channelId = await ctx.db.insert("channels", { name: args.name, createdBy: userId })

    // Get the current max order for this user and add the new channel at the end
    const userChannelOrders = await ctx.db
      .query("channelOrders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    const maxOrder = Math.max(...userChannelOrders.map((order) => order.order), -1)

    await ctx.db.insert("channelOrders", {
      channelId,
      userId,
      order: maxOrder + 1,
    })

    return channelId
  },
})

export const update = mutation({
  args: { channelId: v.id("channels"), name: v.optional(v.string()), archivedTime: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const data: any = {}
    if (args.name) data.name = args.name
    if (args.archivedTime) data.archivedTime = args.archivedTime

    return await ctx.db.patch(args.channelId, data)
  },
})

export const toggleMute = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    const channel = await ctx.db.get(args.channelId)
    if (!channel) throw new ConvexError("Channel not found")

    const userChannelActivity = await ctx.db
      .query("userChannelActivity")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!userChannelActivity) {
      await ctx.db.insert("userChannelActivity", {
        channelId: args.channelId,
        isFavourite: false,
        isMuted: true,
        userId,
        lastReadMessageTime: Date.now(),
      })
    } else {
      await ctx.db.patch(userChannelActivity._id, { isMuted: !userChannelActivity.isMuted })
    }
  },
})

export const get = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    const channel = await ctx.db.get(args.channelId)
    if (!channel) return null

    const userChannelActivity = await ctx.db
      .query("userChannelActivity")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    const isMuted = !!userChannelActivity?.isMuted

    const dmUser = channel.userId ? await ctx.db.get(channel.userId) : null
    return {
      ...channel,
      isMuted,
      dmUser: dmUser ? { ...dmUser, image: dmUser?.image ? await ctx.storage.getUrl(dmUser.image) : null } : null,
    }
  },
})

export const updateOrder = mutation({
  args: {
    channelOrders: v.array(
      v.object({
        channelId: v.id("channels"),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)

    // Update or create channel orders for the user
    for (const { channelId, order } of args.channelOrders) {
      const existingOrder = await ctx.db
        .query("channelOrders")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("channelId"), channelId))
        .first()

      if (existingOrder) {
        await ctx.db.patch(existingOrder._id, { order })
      } else {
        await ctx.db.insert("channelOrders", {
          channelId,
          userId,
          order,
        })
      }
    }
  },
})
