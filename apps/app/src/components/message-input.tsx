import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { insertAtPosition, useMutation, useQuery } from "convex/react"
import * as Crypto from "expo-crypto"
import { useLocalSearchParams } from "expo-router"
import { ArrowRightIcon, PlusIcon } from "lucide-react-native"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, View } from "react-native"

export function MessageInput({ onFocus }: { onFocus?: () => void }) {
  const params = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels">; messageId: Id<"messages"> }>()
  const user = useQuery(api.auth.me)

  const [tempMessageId, setTempMessageId] = useState<string | null>(Crypto.randomUUID())

  const [message, setMessage] = useState("")
  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate((localStore, args) => {
    const { content } = args
    if (!user) return

    const messageId = Crypto.randomUUID() as Id<"messages">
    insertAtPosition({
      paginatedQuery: api.messages.list,
      argsToMatch: { channelId: params.channelId, messageId: args.parentMessageId },
      sortOrder: "desc",
      sortKeyFromItem: (item) => item._creationTime,
      localQueryStore: localStore,
      item: {
        _id: messageId,
        authorId: user._id,
        content,
        author: user,
        channelId: params.channelId,
        parentMessageId: args.parentMessageId,
        _creationTime: Date.now(),
        optimisticStatus: "created",
        reactions: [],
        threadInfo: null,
        files: [],
        // files:
        //   filePreviews.map(({ file, id, url }) => ({
        //     _id: Crypto.randomUUID() as Id<"files">,
        //     name: file.name,
        //     previewId: id,
        //     previewContentType: file.type,
        //     previewUrl: url,
        //     _creationTime: Date.now(),
        //     messageId,
        //     url: null,
        //     metadata: null,
        //     storageId: undefined,
        //   })) || [],
      },
    })
  })

  const handleSend = async () => {
    if (!message.trim()) return
    setMessage("")
    await sendMessage({ channelId: params.channelId, content: message.trim(), tempMessageId, parentMessageId: params.messageId })
    setTempMessageId(Crypto.randomUUID())
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: "height" })}>
      <View
        style={{ borderTopWidth: 1, flexDirection: "row", alignItems: "flex-end", borderColor: "#eee", padding: 16, gap: 12 }}
      >
        <TouchableOpacity
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
          <PlusIcon color="black" size={20} />
        </TouchableOpacity>
        <TextInput
          onSubmitEditing={handleSend}
          multiline
          placeholder="Message"
          style={{ fontSize: 16, flex: 1, minHeight: 32 }}
          value={message}
          autoFocus={!!params.messageId}
          onChangeText={setMessage}
          onFocus={onFocus}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "black",
          }}
        >
          <ArrowRightIcon color="white" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
