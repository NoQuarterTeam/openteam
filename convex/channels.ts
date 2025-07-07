import { ConvexError, v } from "convex/values"
import dayjs from "dayjs"
import { mutation, query } from "./_generated/server"
import { canManageTeamChannel, requireUser } from "./auth"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    if (!user.teamId) throw new ConvexError("User is not part of a team")

    const [channels, channelOrders] = await Promise.all([
      ctx.db
        .query("channels")
        .withIndex("by_team", (q) => q.eq("teamId", user.teamId!))
        .filter((q) => q.eq(q.field("archivedTime"), undefined))
        .order("asc")
        .collect(),
      ctx.db
        .query("channelOrders")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
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
          .filter((q) => q.eq(q.field("userId"), user._id))
          .first()

        const unreadMessages = userChannelActivity?.lastReadMessageTime
          ? await ctx.db
              .query("messages")
              .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
              .filter((q) =>
                q.and(
                  q.neq(q.field("authorId"), user._id),
                  q.gte(q.field("_creationTime"), userChannelActivity.lastReadMessageTime!),
                ),
              )
              .take(100)
          : await ctx.db
              .query("messages")
              .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
              .filter((q) => q.neq(q.field("authorId"), user._id))
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
    const user = await canManageTeamChannel(ctx, args.channelId)
    const channelActivity = await ctx.db
      .query("userChannelActivity")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first()

    if (!channelActivity) {
      await ctx.db.insert("userChannelActivity", {
        channelId: args.channelId,
        isFavourite: false,
        isMuted: false,
        userId: user._id,
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
    const user = await requireUser(ctx)

    if (!user.teamId) throw new ConvexError("User is not part of a team")
    // Check if channel already exists
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_team_name", (q) => q.eq("teamId", user.teamId!).eq("name", args.name))
      .first()

    if (existing) throw new ConvexError("Channel already exists with this name")

    const channelId = await ctx.db.insert("channels", { name: args.name, createdBy: user._id, teamId: user.teamId })

    // Get the current max order for this user and add the new channel at the end
    const userChannelOrders = await ctx.db
      .query("channelOrders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()

    const maxOrder = Math.max(...userChannelOrders.map((order) => order.order), -1)

    await ctx.db.insert("channelOrders", { channelId, userId: user._id, order: maxOrder + 1 })

    return channelId
  },
})

export const update = mutation({
  args: { channelId: v.id("channels"), name: v.optional(v.string()), archivedTime: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const channel = await ctx.db.get(args.channelId)
    if (!channel) throw new ConvexError("Channel not found")

    const data: any = {}
    if (args.name) data.name = args.name
    if (args.archivedTime) {
      data.archivedTime = args.archivedTime
      data.name = `${channel.name} (archived - ${dayjs(args.archivedTime).format()})`
    }

    return await ctx.db.patch(args.channelId, data)
  },
})

export const toggleMute = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const user = await canManageTeamChannel(ctx, args.channelId)

    const channel = await ctx.db.get(args.channelId)
    if (!channel) throw new ConvexError("Channel not found")

    const userChannelActivity = await ctx.db
      .query("userChannelActivity")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first()

    if (!userChannelActivity) {
      await ctx.db.insert("userChannelActivity", {
        channelId: args.channelId,
        isFavourite: false,
        isMuted: true,
        userId: user._id,
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
    const user = await canManageTeamChannel(ctx, args.channelId)

    const channel = await ctx.db.get(args.channelId)
    if (!channel) return null

    const [userChannelActivity, createdBy] = await Promise.all([
      ctx.db
        .query("userChannelActivity")
        .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .first(),
      ctx.db.get(channel.createdBy),
    ])

    const isMuted = !!userChannelActivity?.isMuted

    const dmUser = channel.userId ? await ctx.db.get(channel.userId) : null
    return {
      ...channel,
      createdBy,
      isMuted,
      dmUser: dmUser ? { ...dmUser, image: dmUser?.image ? await ctx.storage.getUrl(dmUser.image) : null } : null,
    }
  },
})

export const updateOrder = mutation({
  args: {
    channelOrders: v.array(v.object({ channelId: v.id("channels"), order: v.number() })),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    // Update or create channel orders for the user
    for (const { channelId, order } of args.channelOrders) {
      const channel = await ctx.db.get(channelId)
      if (!channel) throw new ConvexError("Channel not found")
      if (channel.teamId !== user.teamId) throw new ConvexError("You are not the author of this channel")

      const existingOrder = await ctx.db
        .query("channelOrders")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("channelId"), channelId))
        .first()

      if (existingOrder) {
        await ctx.db.patch(existingOrder._id, { order })
      } else {
        await ctx.db.insert("channelOrders", { channelId, userId: user._id, order })
      }
    }
  },
})
