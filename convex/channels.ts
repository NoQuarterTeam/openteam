import { ConvexError, v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)

    const channels = await ctx.db
      .query("channels")
      .filter((q) => q.eq(q.field("archivedTime"), undefined))
      .order("asc")
      .collect()

    return await Promise.all(
      channels.map(async (channel) => {
        const dmUser = channel.dmId ? await ctx.db.get(channel.dmId) : null

        if (dmUser?.image) {
          dmUser.image = (await ctx.storage.getUrl(dmUser.image)) as Id<"_storage"> | undefined
        }
        return { ...channel, dmUser }
      }),
    )
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

    return await ctx.db.insert("channels", { name: args.name, createdBy: userId })
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

export const get = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const channel = await ctx.db.get(args.channelId)
    if (!channel) return null

    const dmUser = channel.dmId ? await ctx.db.get(channel.dmId) : null
    return { ...channel, dmUser }
  },
})
