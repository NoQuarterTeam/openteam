import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { insertAtPosition, useMutation, useQuery } from "convex/react"
import * as Crypto from "expo-crypto"
import { useLocalSearchParams } from "expo-router"
import { ArrowRightIcon, PlusIcon } from "lucide-react-native"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, View } from "react-native"

export function MessageInput() {
  const user = useQuery(api.auth.me)

  const [tempMessageId, setTempMessageId] = useState<string | null>(Crypto.randomUUID())
  const params = useLocalSearchParams<{ teamId: string; channelId: Id<"channels"> }>()
  const [message, setMessage] = useState("")
  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate((localStore, args) => {
    const { content } = args
    if (!user) return

    // For thread messages, update both thread queries
    if (args.threadId) {
      const messageId = Crypto.randomUUID() as Id<"messages">
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
          channelId: params.channelId,
          threadId: args.threadId,
          _creationTime: Date.now(),
          optimisticStatus: "created",
          reactions: [],
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
    } else {
      const messageId = Crypto.randomUUID() as Id<"messages">

      insertAtPosition({
        paginatedQuery: api.messages.list,
        argsToMatch: { channelId: params.channelId },
        sortOrder: "desc",
        sortKeyFromItem: (item) => item._creationTime,
        localQueryStore: localStore,
        item: {
          _id: messageId,
          authorId: user._id,
          content,
          author: user,
          channelId: params.channelId,
          _creationTime: Date.now(),
          optimisticStatus: "created",
          reactions: [],
          threadInfo: null,
          files: [],
          // files:
          //   filePreviews.map(({ file, url, id }) => ({
          //     _id: Crypto.randomUUID() as Id<"files">,
          //     name: file.name,
          //     _creationTime: Date.now(),
          //     messageId,
          //     url: null,
          //     previewId: id,
          //     previewContentType: file.type,
          //     previewUrl: url,
          //     metadata: null,
          //     storageId: undefined,
          //   })) || [],
        },
      })
    }
  })

  const handleSend = async () => {
    setMessage("")
    await sendMessage({ channelId: params.channelId, content: message, tempMessageId })
    setTempMessageId(Crypto.randomUUID())
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: "height" })}>
      <View style={{ borderTopWidth: 1, flexDirection: "row", borderColor: "#eee", padding: 16, gap: 12 }}>
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
          placeholder="Message"
          style={{ fontSize: 16, flex: 1 }}
          value={message}
          onChangeText={setMessage}
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
