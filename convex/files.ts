import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { action, mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const search = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(10)

    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        name: file.name,
        url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null,
        metadata: file.storageId ? await ctx.db.system.get(file.storageId) : null,
      })),
    )
  },
})

export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId)
  },
})

export const upload = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const uploadUrl = await ctx.storage.generateUploadUrl()
    const blob = await fetch(args.url)
    const blobBuffer = await blob.arrayBuffer()
    const result = await fetch(uploadUrl, {
      method: "POST",
      body: blobBuffer,
      headers: {
        "Content-Type": blob.headers.get("content-type") as string,
      },
    })
    if (!result.ok) throw new Error("Failed to upload image")
    const json = (await result.json()) as { storageId: Id<"_storage"> }
    return json.storageId
  },
})

export const createFilePreviews = mutation({
  args: {
    previewMessageId: v.string(),
    previews: v.array(
      v.object({
        previewId: v.string(),
        url: v.string(),
        name: v.string(),
        contentType: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.previews.map(async (preview) => {
        await ctx.db.insert("files", {
          name: preview.name,
          previewId: preview.previewId,
          previewMessageId: args.previewMessageId,
          previewContentType: preview.contentType,
          previewUrl: preview.url,
        })
      }),
    )
  },
})

export const update = mutation({
  args: {
    previewId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_preview_id", (q) => q.eq("previewId", args.previewId))
      .first()
    if (!file) throw new ConvexError("File not found")
    await ctx.db.patch(file._id, { storageId: args.storageId })
  },
})

export const remove = mutation({
  args: { fileId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const fileId = ctx.db.normalizeId("files", args.fileId)
    if (!fileId) throw new ConvexError("Invalid file ID")
    const file = await ctx.db.get(fileId)
    if (!file) return
    if (!file.messageId) return
    const message = await ctx.db.get(file.messageId)
    if (!message) return
    if (message.authorId !== user._id) throw new ConvexError("You are not the author of this message")

    const messageFiles = await ctx.db
      .query("files")
      .withIndex("by_message", (q) => q.eq("messageId", message._id))
      .collect()
    await ctx.db.delete(fileId)
    if (messageFiles.length === 1 && !message.content) await ctx.db.delete(message._id)
  },
})
