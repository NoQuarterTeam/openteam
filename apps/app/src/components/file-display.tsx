import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { Image } from "expo-image"
import { Text, View } from "react-native"

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
  const isImage = !!file.metadata?.contentType?.startsWith("image/") || !!file.previewContentType?.startsWith("image/")
  // const isVideo = !!file.metadata?.contentType?.startsWith("video/") || !!file.previewContentType?.startsWith("video/")
  // const isAudioFile = isAudio({
  //   type: file.metadata?.contentType || file.previewContentType || "",
  //   name: file.name,
  // })
  return (
    <View style={{ marginRight: 4 }}>
      {isImage ? (
        <Image source={{ uri: file.url || file.previewUrl || "#" }} style={{ width: 100, height: 100, borderRadius: 6 }} />
      ) : (
        <FilePill
          name={file.name}
          src={file.url || file.previewUrl || "#"}
          isImage={isImage}
          type={file.metadata?.contentType || file.previewContentType || ""}
        />
      )}
    </View>
  )
}

function FilePill({ name, src, isImage, type }: { name: string; src: string; isImage: boolean; type: string }) {
  return (
    <View>
      <Text>{name}</Text>
    </View>
  )
}
