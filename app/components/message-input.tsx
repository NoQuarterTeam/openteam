import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useQuery } from "convex/react"
import { ArrowRightIcon, PlusIcon, XIcon } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { FilePill } from "./file-pill"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Spinner } from "./ui/spinner"

function isImage(file: File | { name: string }): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name)
}

export function MessageInput({ currentChannel }: { currentChannel: Doc<"channels"> }) {
  const [newMessage, setNewMessage] = React.useState("")
  const [filePreviews, setFilePreviews] = React.useState<{ file: File; url: string; storageId?: Id<"_storage"> }[]>([])
  const fileInputId = React.useId()
  const user = useQuery(api.auth.loggedInUser)

  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate((localStore, args) => {
    const { channelId, content } = args
    if (!user) return
    const currentValue = localStore.getQuery(api.messages.list, { channelId })
    if (currentValue) {
      const messageId = crypto.randomUUID() as Id<"messages">
      localStore.setQuery(api.messages.list, { channelId }, [
        ...(currentValue || []),
        {
          _id: messageId,
          authorId: user._id,
          content,
          author: user,
          channelId,
          _creationTime: Date.now(),
          temp: true,
          reactions: [],
          files: filePreviews.map(({ file, url }) => ({
            name: file.name,
            _creationTime: Date.now(),
            _id: crypto.randomUUID() as Id<"files">,
            messageId,
            url,
            metadata: {
              _id: crypto.randomUUID() as Id<"_storage">,
              _creationTime: Date.now(),
              contentType: file.type,
              sha256: "",
              size: file.size,
            },
            storageId: crypto.randomUUID() as Id<"_storage">,
          })),
        },
      ])
    }
  })

  const generateUploadUrl = useConvexMutation(api.uploads.generateUploadUrl)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && filePreviews.length === 0) return

    try {
      // const newFiles: { name: string; storageId: Id<"_storage"> }[] = []
      // if (filePreviews.length > 0) {
      //   for (const { file } of filePreviews) {
      //     const uploadUrl = await generateUploadUrl()
      //     const result = await fetch(uploadUrl, {
      //       method: "POST",
      //       headers: { "Content-Type": file.type },
      //       body: file,
      //     })
      //     if (!result.ok) throw new Error("Failed to upload file")
      //     const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
      //     newFiles.push({ name: file.name, storageId })
      //   }
      // }

      void sendMessage({
        channelId: currentChannel._id,
        content: newMessage.trim(),
        files: filePreviews
          .filter(({ storageId }) => storageId)
          .map(({ file, storageId }) => ({ name: file.name, storageId: storageId as Id<"_storage"> })),
      })
      setFilePreviews([])
      setNewMessage("")
    } catch {
      toast.error("Failed to send message")
    }
  }
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []

    setFilePreviews((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])

    const storageIds = await Promise.all(
      files.map(async (file) => {
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })
        if (!result.ok) throw new Error("Failed to upload file")
        const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
        return storageId
      }),
    )
    setFilePreviews((prev) => prev.map((file, i) => ({ ...file, storageId: storageIds[i] })))
  }

  const handleRemoveFile = (index: number) => setFilePreviews((prev) => prev.filter((_, i) => i !== index))

  return (
    <div className="border-t bg-background">
      <form onSubmit={handleSendMessage} className="relative flex flex-col gap-2">
        {filePreviews.length > 0 && (
          <div className="-top-18 absolute right-0 left-0 flex flex-wrap gap-2 border-t border-b bg-background p-2">
            {filePreviews.map(({ file, url, storageId }, i) => (
              <div key={i} className="relative">
                {isImage(file) ? (
                  <img src={url} alt={file.name} className="h-14 w-14 rounded-lg border object-cover" />
                ) : (
                  <FilePill name={file.name} />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(i)}
                  className="-top-1 -right-1 absolute rounded-full bg-black p-0.5 text-white hover:bg-neutral-700"
                >
                  {storageId ? <XIcon className="size-4" /> : <Spinner className="size-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-row gap-2 p-4">
          <Button type="button" variant="secondary" onClick={() => document.getElementById(fileInputId)?.click()} size="icon">
            <PlusIcon />
          </Button>
          <Input
            disabled={!currentChannel || !!currentChannel.archivedTime}
            type="text"
            placeholder={`Message`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input id={fileInputId} type="file" multiple className="hidden" onChange={handleFileInput} />
            <Button type="submit" size="icon" disabled={!newMessage.trim() && filePreviews.length === 0}>
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
