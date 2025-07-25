import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { OptimisticStatus } from "@openteam/backend/convex/optimistic"
import { optimisticallyUpdateValueInPaginatedQuery, useMutation } from "convex/react"
import { useLocalSearchParams } from "expo-router"
import { CheckIcon, XIcon } from "lucide-react-native"
import { useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, useColorScheme, View } from "react-native"

export default function EditMessage({
  message,
  onClose,
}: {
  message: { _id: Id<"messages">; content: string }
  onClose: () => void
}) {
  const colorScheme = useColorScheme()
  const params = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels">; messageId: Id<"messages"> }>()
  const [content, setContent] = useState(message.content)

  const updateMessage = useMutation(api.messages.update).withOptimisticUpdate((localStore, args) => {
    optimisticallyUpdateValueInPaginatedQuery(
      localStore,
      api.messages.list,
      { channelId: params.channelId, messageId: params.messageId },
      (currentValue) => {
        if (message._id === currentValue._id) {
          return { ...currentValue, content: args.content }
        }
        return currentValue
      },
    )
  })

  const remove = useMutation(api.messages.remove).withOptimisticUpdate((localStore) => {
    optimisticallyUpdateValueInPaginatedQuery(
      localStore,
      api.messages.list,
      { channelId: params.channelId, messageId: params.messageId },
      (currentValue) => {
        if (message._id === currentValue._id) {
          return { ...currentValue, optimisticStatus: "deleted" as OptimisticStatus }
        }
        return currentValue
      },
    )
  })

  useEffect(() => {
    if (message) {
      setContent(message.content)
    }
  }, [message])

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: "height" })}>
      <View
        style={{
          borderTopWidth: 1,
          flexDirection: "row",
          alignItems: "flex-end",
          borderColor: colorScheme === "dark" ? "#444" : "#eee",
          padding: 16,
          gap: 12,
        }}
      >
        <TextInput
          multiline
          autoFocus
          style={{ flex: 1, minHeight: 32, fontSize: 16, padding: 4, color: colorScheme === "dark" ? "#fff" : "#000" }}
          value={content}
          onChangeText={setContent}
        />
        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
          }}
        >
          <XIcon color={colorScheme === "dark" ? "#fff" : "#000"} size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            onClose()
            if (content) {
              await updateMessage({ messageId: message._id, content: content })
            } else {
              await remove({ messageId: message._id })
            }
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colorScheme === "dark" ? "#fff" : "#000",
          }}
        >
          <CheckIcon color={colorScheme === "dark" ? "#000" : "#fff"} size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
