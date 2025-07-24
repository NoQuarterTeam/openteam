import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { OptimisticStatus } from "@openteam/backend/convex/optimistic"
import { optimisticallyUpdateValueInPaginatedQuery, useMutation } from "convex/react"
import { useLocalSearchParams } from "expo-router"
import { CheckIcon, XIcon } from "lucide-react-native"
import { useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, View } from "react-native"
import { useEditMessage } from "@/lib/use-edit-message"

export default function EditMessage() {
  const { message: editMessage, setMessage: clearMessage } = useEditMessage()
  const params = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels">; messageId: Id<"messages"> }>()
  const [message, setMessage] = useState(editMessage?.content)

  const updateMessage = useMutation(api.messages.update).withOptimisticUpdate((localStore, args) => {
    if (!editMessage?.id) return
    optimisticallyUpdateValueInPaginatedQuery(
      localStore,
      api.messages.list,
      { channelId: params.channelId, messageId: params.messageId },
      (currentValue) => {
        if (editMessage.id === currentValue._id) {
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
        if (editMessage.id === currentValue._id) {
          return { ...currentValue, optimisticStatus: "deleted" as OptimisticStatus }
        }
        return currentValue
      },
    )
  })

  useEffect(() => {
    if (editMessage) {
      setMessage(editMessage.content)
    }
  }, [editMessage])

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: "height" })}>
      <View
        style={{ borderTopWidth: 1, flexDirection: "row", alignItems: "flex-end", borderColor: "#eee", padding: 16, gap: 12 }}
      >
        <TextInput
          multiline
          autoFocus
          style={{ flex: 1, minHeight: 32, fontSize: 16, padding: 4 }}
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity
          onPress={() => clearMessage(null)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#eee",
          }}
        >
          <XIcon color="black" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            clearMessage(null)
            if (message) {
              await updateMessage({ messageId: editMessage.id, content: message })
            } else {
              await remove({ messageId: editMessage.id })
            }
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
          }}
        >
          <CheckIcon color="white" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
