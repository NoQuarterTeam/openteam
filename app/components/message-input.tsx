import { insertAtPosition, useMutation, useQuery } from "convex/react"
import { ArrowRightIcon, MicIcon, MicOffIcon, PlusIcon } from "lucide-react"
import posthog from "posthog-js"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useParams } from "react-router"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useEditMessage } from "@/lib/use-edit-message"
import { ExpandableTextarea, type ExpandableTextareaRef } from "./expandable-textarea"
import { FileDisplay } from "./file-display"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"

export function MessageInput({
  channelId,
  threadId,
  lastMessageIdOfUser,
}: {
  channelId: Id<"channels">
  threadId?: Id<"threads">
  lastMessageIdOfUser?: Id<"messages">
}) {
  const [tempMessageId, setTempMessageId] = useState<string>(crypto.randomUUID())
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const [newMessage, setNewMessage] = useState("")
  const [filePreviews, setFilePreviews] = useState<{ id: string; file: File; url: string; storageId?: Id<"_storage"> }[]>([])

  const user = useQuery(api.auth.me)

  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate((localStore, args) => {
    const { content } = args
    if (!user) return

    // For thread messages, update both thread queries
    if (args.threadId) {
      const messageId = crypto.randomUUID() as Id<"messages">
      insertAtPosition({
        paginatedQuery: api.threads.listMessages,
        argsToMatch: { threadId: args.threadId },
        sortOrder: "desc",
        sortKeyFromItem: (item) => item._creationTime,
        localQueryStore: localStore,
        item: {
          _id: messageId,
          authorId: user._id,
          content,
          author: user,
          channelId,
          threadId: args.threadId,
          _creationTime: Date.now(),
          optimisticStatus: "created",
          reactions: [],
          files:
            filePreviews.map(({ file, id, url }) => ({
              _id: crypto.randomUUID() as Id<"files">,
              name: file.name,
              previewId: id,
              previewContentType: file.type,
              previewUrl: url,
              _creationTime: Date.now(),
              messageId,
              url: null,
              metadata: null,
              storageId: undefined,
            })) || [],
        },
      })
    } else {
      const messageId = crypto.randomUUID() as Id<"messages">

      insertAtPosition({
        paginatedQuery: api.messages.list,
        argsToMatch: { channelId },
        sortOrder: "desc",
        sortKeyFromItem: (item) => item._creationTime,
        localQueryStore: localStore,
        item: {
          _id: messageId,
          authorId: user._id,
          content,
          author: user,
          channelId,
          _creationTime: Date.now(),
          optimisticStatus: "created",
          reactions: [],
          threadInfo: null,
          files:
            filePreviews.map(({ file, url, id }) => ({
              _id: crypto.randomUUID() as Id<"files">,
              name: file.name,
              _creationTime: Date.now(),
              messageId,
              url: null,
              previewId: id,
              previewContentType: file.type,
              previewUrl: url,
              metadata: null,
              storageId: undefined,
            })) || [],
        },
      })
    }
  })

  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  const textAreaRef = useRef<ExpandableTextareaRef>(null)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && filePreviews.length === 0) return

    try {
      textAreaRef.current?.resetHeight()
      setNewMessage("")
      setFilePreviews([])
      posthog.capture("message_sent", { channelId, teamId, threadId })
      await sendMessage({
        channelId,
        tempMessageId,
        content: newMessage.trim(),
        threadId,
      })
      setTempMessageId(crypto.randomUUID())
    } catch {
      toast.error("Failed to send message")
    }
  }

  const createFilePreviews = useMutation(api.files.createFilePreviews)
  const updateFile = useMutation(api.files.update)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newPreviews = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      }))

      await createFilePreviews({
        previewMessageId: tempMessageId,
        previews: newPreviews.map(({ file, ...rest }) => ({
          previewId: rest.id,
          url: rest.url,
          name: file.name,
          contentType: file.type,
        })),
      })
      setFilePreviews((prev) => [...prev, ...newPreviews])

      posthog.capture("files_uploaded", { teamId, channelId, threadId })

      const results = await Promise.allSettled(
        newPreviews.map(async (preview) => {
          const uploadUrl = await generateUploadUrl()
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": preview.file.type },
            body: preview.file,
          })
          if (!result.ok) throw new Error("Failed to upload file")
          const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
          return { ...preview, storageId }
        }),
      )

      if (results.some((result) => result.status === "rejected")) {
        toast.error("Some files failed to upload")
      }

      for (const result of results) {
        if (result.status === "rejected") continue
        await updateFile({ previewId: result.value.id, storageId: result.value.storageId })
        setFilePreviews((prev) => prev.map((p) => (p.id === result.value.id ? { ...p, storageId: result.value.storageId } : p)))
      }
    },
    [tempMessageId],
  )

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  const handleRemoveFile = (id: string) => {
    setFilePreviews((prev) => prev.filter((p) => p.id !== id))
    const file = filePreviews.find((p) => p.id === id)
    if (file) window.URL.revokeObjectURL(file.url)
  }

  const setEditMessageId = useEditMessage((s) => s.setMessageId)
  const editMessageId = useEditMessage((s) => s.messageId)

  useEffect(() => {
    if (!editMessageId) {
      textAreaRef.current?.focus()
    }
  }, [editMessageId])

  const formRef = useRef<HTMLFormElement>(null)

  const previousChannelIdRef = useRef<Id<"channels"> | null>(null)
  useEffect(() => {
    if (previousChannelIdRef.current !== channelId) {
      setEditMessageId(null)
      previousChannelIdRef.current = channelId
    }
  }, [channelId])

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup any audio URLs
      filePreviews.forEach((preview) => {
        if (preview.file.type.startsWith("audio/")) {
          URL.revokeObjectURL(preview.url)
        }
      })
    }
  }, [])

  return (
    <div className="border-t bg-background">
      <form onSubmit={handleSendMessage} ref={formRef} className="relative flex flex-col gap-2">
        {filePreviews.length > 0 && (
          <div className="-top-18 absolute right-0 left-0 flex flex-wrap gap-2 border-t border-b bg-background p-2">
            {filePreviews.map(({ id, file, storageId, url }) => (
              <FileDisplay
                key={id}
                file={{
                  _id: id as Id<"files">,
                  name: file.name,
                  previewUrl: url,
                  previewId: id,
                  storageId,
                  previewContentType: file.type,
                  url: null,
                  metadata: null,
                }}
                variant="preview"
                channelId={channelId}
                onRemove={handleRemoveFile}
              />
            ))}
          </div>
        )}
        <div className="flex flex-row items-end gap-2 p-3 md:p-4">
          <div {...getRootProps()} className="flex-shrink-0">
            <input {...getInputProps()} />
            <Button variant="secondary" size="icon">
              <PlusIcon />
            </Button>
          </div>

          <AudioRecorder
            onAudioRecorded={(audioFile) => {
              setFilePreviews((prev) => [...prev, audioFile])
            }}
            onAudioUploaded={(previewId, storageId) => {
              setFilePreviews((prev) => prev.map((p) => (p.id === previewId ? { ...p, storageId } : p)))
            }}
            tempMessageId={tempMessageId}
            channelId={channelId}
            threadId={threadId}
          />

          <ExpandableTextarea
            ref={textAreaRef}
            placeholder={threadId ? "Reply to thread..." : "Send a message..."}
            onChangeValue={setNewMessage}
            onSubmitMobile={() => {
              formRef.current?.requestSubmit()
            }}
            onArrowUp={() => {
              if (lastMessageIdOfUser && !newMessage) {
                setEditMessageId(lastMessageIdOfUser)
              }
            }}
            value={newMessage}
            rows={1}
            autoFocus
          />

          <Button type="submit" size="icon" disabled={!newMessage.trim() && filePreviews.length === 0}>
            <ArrowRightIcon />
          </Button>
        </div>
      </form>
    </div>
  )
}

// Audio Recorder Component
interface AudioRecorderProps {
  onAudioRecorded: (audioFile: { id: string; file: File; url: string }) => void
  onAudioUploaded: (previewId: string, storageId: Id<"_storage">) => void
  tempMessageId: string
  channelId: Id<"channels">
  threadId?: Id<"threads">
}

function AudioRecorder({ onAudioRecorded, onAudioUploaded, tempMessageId, channelId, threadId }: AudioRecorderProps) {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()

  const [status, setStatus] = useState<"idle" | "loading" | "recording">("idle")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const createFilePreviews = useMutation(api.files.createFilePreviews)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const updateFile = useMutation(api.files.update)

  const startRecording = async () => {
    try {
      setStatus("loading")
      posthog.capture("audio_recorded", { teamId, channelId, threadId })

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Try to use a more compatible audio format
      let options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" }
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4", bitsPerSecond: 128000 }
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" }
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstart = () => {
        // Recording has actually started
        setStatus("recording")
      }

      mediaRecorder.onstop = async () => {
        // Check if we actually have audio data
        if (audioChunksRef.current.length === 0) {
          setStatus("idle")
          return
        }

        // Only create file preview when recording actually stops
        const mimeType = mediaRecorder.mimeType || "audio/webm"

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

        if (audioBlob.size === 0) {
          setStatus("idle")
          return
        }

        const fileExtension = mimeType.includes("mp4") ? "m4a" : "webm"
        const audioFile = new File([audioBlob], `recording-${Date.now()}.${fileExtension}`, { type: mimeType })
        const audioUrl = URL.createObjectURL(audioFile)

        const newPreview = { id: crypto.randomUUID(), file: audioFile, url: audioUrl }

        await createFilePreviews({
          previewMessageId: tempMessageId,
          previews: [
            {
              previewId: newPreview.id,
              url: newPreview.url,
              name: audioFile.name,
              contentType: audioFile.type,
            },
          ],
        })

        // Notify parent component
        onAudioRecorded(newPreview)

        // Upload the audio file in the background
        try {
          const uploadUrl = await generateUploadUrl()
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": audioFile.type },
            body: audioFile,
          })
          if (!result.ok) throw new Error("Failed to upload audio file")
          const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }

          await updateFile({ previewId: newPreview.id, storageId })
          onAudioUploaded(newPreview.id, storageId)
        } catch {
          toast.error("Failed to upload audio file")
        }

        // Clean up the stream
        stream.getTracks().forEach((track) => track.stop())

        // Reset recording state after everything is processed
        setStatus("idle")
      }

      mediaRecorder.onerror = () => {
        setStatus("idle")
        toast.error("Recording failed")
      }

      mediaRecorder.start()
    } catch {
      setStatus("idle")
      toast.error("Failed to access microphone")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && (status === "recording" || status === "loading")) {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      } else {
        setStatus("idle")
      }
    }
  }

  const toggleRecording = () => {
    if (status === "recording") {
      stopRecording()
    } else {
      startRecording()
    }
  }

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  return (
    <Button
      variant={status === "recording" ? "destructive" : "secondary"}
      size="icon"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleRecording()
      }}
      disabled={status === "loading"}
      type="button"
    >
      {status === "loading" ? <Spinner className="size-4" /> : status === "recording" ? <MicOffIcon /> : <MicIcon />}
    </Button>
  )
}
