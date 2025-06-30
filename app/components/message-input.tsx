import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useQuery } from "convex/react"
import { ArrowRightIcon, PlusIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { ExpandableTextarea, type ExpandableTextareaRef } from "./expandable-textarea"
import { FilePill } from "./file-pill"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"

function isImage(file: File | { name: string }): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name)
}

export function MessageInput({ currentChannel }: { currentChannel: Doc<"channels"> }) {
  const [newMessage, setNewMessage] = useState("")
  const [filePreviews, setFilePreviews] = useState<{ id: string; file: File; url: string; storageId?: Id<"_storage"> }[]>([])

  const user = useQuery(api.auth.loggedInUser)

  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate((localStore, args) => {
    const { content } = args
    if (!user) return
    const currentValue = localStore.getQuery(api.messages.list, { channelId: currentChannel._id })
    if (!currentValue) return
    const messageId = crypto.randomUUID() as Id<"messages">
    localStore.setQuery(api.messages.list, { channelId: currentChannel._id }, [
      ...currentValue,
      {
        _id: messageId,
        authorId: user._id,
        content,
        author: user,
        channelId: currentChannel._id,
        _creationTime: Date.now(),
        temp: true,
        reactions: [],
        files:
          args.files?.map(({ name, storageId }, i) => ({
            _id: crypto.randomUUID() as Id<"files">,
            name,
            _creationTime: Date.now(),
            messageId,
            url: filePreviews[i]?.url || null,
            metadata: {
              _id: crypto.randomUUID() as Id<"_storage">,
              _creationTime: Date.now(),
              contentType: filePreviews[i]?.file.type || "image/png",
              sha256: "",
              size: filePreviews[i]?.file.size || 10,
            },
            storageId,
          })) || [],
      },
    ])
  })

  const generateUploadUrl = useConvexMutation(api.uploads.generateUploadUrl)

  const textAreaRef = useRef<ExpandableTextareaRef>(null)

  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && filePreviews.length === 0) || filePreviews.some(({ storageId }) => !storageId)) return

    try {
      setIsLoading(true)

      textAreaRef.current?.resetHeight()
      textAreaRef.current?.clearValue()

      setIsLoading(false)
      void sendMessage({
        channelId: currentChannel._id,
        content: newMessage.trim(),
        files: filePreviews.map(({ file, storageId }) => ({ name: file.name, storageId: storageId! })),
      })
      setFilePreviews([])
    } catch {
      toast.error("Failed to send message")
    }
  }
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newPreviews = acceptedFiles.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))
    setFilePreviews((prev) => [...prev, ...newPreviews])

    const newFiles = await Promise.all(
      newPreviews.map(async ({ id, file, url }) => {
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })
        if (!result.ok) throw new Error("Failed to upload file")
        const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
        return { id, file, url, storageId }
      }),
    )

    setFilePreviews((prev) =>
      prev.map((preview) => {
        const uploaded = newFiles.find((nf) => nf.id === preview.id)
        return uploaded || preview
      }),
    )
  }, [])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  const handleRemoveFile = (index: number) => {
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
    if (filePreviews[index]) window.URL.revokeObjectURL(filePreviews[index].url)
  }

  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    setTimeout(() => {
      textAreaRef.current?.focus()
    }, 100)
  }, [currentChannel._id])

  return (
    <div className="border-t bg-background">
      <form onSubmit={handleSendMessage} ref={formRef} className="relative flex flex-col gap-2">
        {filePreviews.length > 0 && (
          <div className="-top-18 absolute right-0 left-0 flex flex-wrap gap-2 border-t border-b bg-background p-2">
            {filePreviews.map(({ id, file, url, storageId }, i) => (
              <div key={id} className="relative">
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
                  {storageId ? <XIcon className="size-4" /> : <Spinner className="size-4 text-white" />}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-row items-end gap-2 p-4">
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="secondary" size="icon">
              <PlusIcon />
            </Button>
          </div>

          <ExpandableTextarea
            ref={textAreaRef}
            placeholder="Send a message..."
            onChange={(e) => setNewMessage(e.target.value)}
            rows={1}
            disabled={!!currentChannel.archivedTime}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                formRef.current?.requestSubmit()
              }
            }}
          />

          <Button
            type="submit"
            size="icon"
            disabled={
              (!newMessage.trim() && filePreviews.length === 0) || isLoading || filePreviews.some(({ storageId }) => !storageId)
            }
          >
            {isLoading ? <Spinner className="size-4" /> : <ArrowRightIcon />}
          </Button>
        </div>
      </form>
    </div>
  )
}
