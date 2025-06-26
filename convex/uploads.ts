import { v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { action, mutation, query } from "./_generated/server"
import { requireUser } from "./auth"

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId)
  },
})

export const uploadFile = action({
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
