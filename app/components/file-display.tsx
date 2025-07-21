import { optimisticallyUpdateValueInPaginatedQuery, useMutation } from "convex/react"
import dayjs from "dayjs"
import { DownloadIcon, ExpandIcon, MoreVerticalIcon, TrashIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { AudioPill, isAudio } from "./audio-pill"
import { FilePill } from "./file-pill"
import { Button } from "./ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Spinner } from "./ui/spinner"
import { VideoThumbnail } from "./video-thumbnail"

type FileType = {
  _id: Id<"files">
  name: string
  url?: string | null
  previewUrl?: string | null
  previewId?: string
  storageId?: Id<"_storage">
  metadata?: { contentType?: string; _creationTime?: number } | null
  previewContentType?: string | null
}

interface FileDisplayProps {
  file: FileType
  variant: "message" | "preview"
  channelId: Id<"channels">
  messageId?: Id<"messages">
  onRemove?: (id: Id<"files">) => void
  fullSize?: boolean
}

export function FileDisplay({ file, variant, channelId, messageId, onRemove, fullSize = false }: FileDisplayProps) {
  const isUploading = !!file.previewId && !file.storageId
  const isImage = !!file.metadata?.contentType?.startsWith("image/") || !!file.previewContentType?.startsWith("image/")
  const isVideo = !!file.metadata?.contentType?.startsWith("video/") || !!file.previewContentType?.startsWith("video/")
  const isAudioFile = isAudio({
    type: file.metadata?.contentType || file.previewContentType || "",
    name: file.name,
  })

  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const removeFile = useMutation(api.files.remove).withOptimisticUpdate((localStore) => {
    if (messageId) {
      optimisticallyUpdateValueInPaginatedQuery(localStore, api.messages.list, { channelId }, (currentValue) => {
        if (messageId === currentValue._id) {
          return { ...currentValue, files: currentValue.files.filter((f) => f._id !== file._id) }
        }
        return currentValue
      })
    }
  })

  const handleDownload = async () => {
    if (!file.url && !file.previewUrl) return
    setIsDownloading(true)
    try {
      const tempFile = await fetch(file.url || file.previewUrl!)
      const tempFileBlog = await tempFile.blob()
      const tempFileURL = URL.createObjectURL(tempFileBlog)
      const link = document.createElement("a")
      link.href = tempFileURL
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      toast.error("Failed to download file")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleClick = () => {
    if (variant === "message" && !isAudioFile) {
      setIsPreviewing(true)
    }
  }

  return (
    <>
      <div className="relative">
        <div
          onClick={handleClick}
          className={cn(
            "flex h-14 shrink-0",
            (isImage || isVideo) && variant === "message" && fullSize && "h-[200px]",
            variant === "message" && !isAudioFile && !isVideo && "cursor-zoom-in",
          )}
        >
          {isImage ? (
            <img
              src={file.url || file.previewUrl || "#"}
              alt={file.name}
              className={cn("rounded-lg border object-cover", variant === "message" && fullSize ? "h-full" : "h-full w-14")}
            />
          ) : isVideo ? (
            <VideoThumbnail
              src={file.url || file.previewUrl || "#"}
              className={cn(variant === "message" && fullSize ? "h-full min-w-sm max-w-sm" : "h-full w-14")}
            />
          ) : isAudioFile ? (
            <AudioPill src={file.url || file.previewUrl || "#"} />
          ) : (
            <FilePill
              name={file.name}
              src={file.url || file.previewUrl || "#"}
              isImage={isImage}
              type={file.metadata?.contentType || file.previewContentType || ""}
            />
          )}
        </div>

        {/* Uploading overlay */}
        {isUploading && variant === "message" && (
          <div className="absolute top-2 left-2 rounded-full bg-background p-2">
            <Spinner className="size-3.5" />
          </div>
        )}

        {/* Actions */}
        <div className={cn("absolute top-1.5 right-1.5 flex items-center justify-center gap-1")}>
          {variant === "message" ? (
            <>
              {/* Expand button for videos */}
              {isVideo && (
                <Button size="icon" variant="outline" className="!bg-background size-6" onClick={() => setIsPreviewing(true)}>
                  <ExpandIcon className="size-3" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="!bg-background size-6">
                    <MoreVerticalIcon className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload}>
                    {isDownloading ? <Spinner className="size-3.5" /> : <DownloadIcon />}
                    {isDownloading ? "Downloading..." : "Download"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (window.confirm("Are you sure?")) {
                        removeFile({ id: file._id })
                      }
                    }}
                  >
                    <TrashIcon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <button type="button" onClick={() => onRemove?.(file._id)} className="rounded-full bg-black p-1 hover:bg-neutral-700">
              {isUploading ? (
                <Spinner className="size-3 text-white dark:text-white" />
              ) : (
                <XIcon className="size-3 text-white dark:text-white" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      {variant === "message" && (
        <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
          <DialogContent className="flex h-[95vh] max-h-[95vh] flex-col justify-between md:max-w-[95vw]">
            <DialogHeader>
              <DialogTitle>{file.name}</DialogTitle>
              <DialogDescription>{dayjs(file.metadata?._creationTime).format("DD/MM/YYYY HH:mm")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-1 items-center justify-center overflow-auto bg-background p-4">
              {isImage ? (
                <img
                  src={file.url || file.previewUrl || "#"}
                  alt={file.name}
                  className="mx-auto max-h-full max-w-full object-contain"
                />
              ) : isVideo ? (
                <video src={file.url || file.previewUrl || "#"} className="mx-auto max-h-full max-w-full" controls autoPlay />
              ) : file.metadata?.contentType === "application/pdf" || file.previewContentType === "application/pdf" ? (
                <object title={file.name} data={file.url || file.previewUrl || "#"} className="h-full w-full" />
              ) : (
                <FilePill
                  name={file.name}
                  src={file.url || file.previewUrl || "#"}
                  isImage={false}
                  type={file.metadata?.contentType || file.previewContentType || ""}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="icon" onClick={handleDownload}>
                <DownloadIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (window.confirm("Are you sure?")) {
                    removeFile({ id: file._id })
                  }
                }}
              >
                <TrashIcon />
              </Button>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
