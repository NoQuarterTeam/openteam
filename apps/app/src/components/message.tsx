import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { OptimisticStatus } from "@openteam/backend/convex/optimistic"
import { optimisticallyUpdateValueInPaginatedQuery, useMutation, useQuery } from "convex/react"
import dayjs from "dayjs"
import * as Clipboard from "expo-clipboard"
import * as Crypto from "expo-crypto"
import { Image } from "expo-image"
import { useLocalSearchParams, useRouter } from "expo-router"
import { CopyIcon, PencilIcon, ReplyIcon, SmilePlusIcon, TrashIcon } from "lucide-react-native"
import { Fragment, useCallback, useRef } from "react"
import { Alert, TouchableOpacity, useColorScheme, View } from "react-native"
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useMarkdown } from "react-native-marked"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ThreadIndicator } from "./thread-indicator"
import { toast } from "./toaster"
import { Button } from "./ui/button"
import { Text } from "./ui/text"

type MessageData = (typeof api.messages.list._returnType)["page"][number] | typeof api.messages.get._returnType

interface Props {
  message: MessageData
  isFirstMessageOfUser: boolean
  isThreadParentMessage?: boolean
  isThreadMessage?: boolean
  onEdit?: (message: { _id: Id<"messages">; content: string }) => void
}

export function Message({
  message,
  isFirstMessageOfUser,
  isThreadParentMessage = false,
  isThreadMessage = false,
  onEdit,
}: Props) {
  const colorScheme = useColorScheme()
  const user = useQuery(api.auth.me)
  const params = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels">; messageId: Id<"messages"> }>()
  const actionSheetRef = useRef<ActionSheetRef>(null)
  const { teamId } = useLocalSearchParams<{ teamId: Id<"teams"> }>()
  const markdown = useMarkdown(message.content, {
    styles: {
      text: { fontSize: 14, color: colorScheme === "dark" ? "#fff" : "#000" },
      strong: { fontWeight: "bold", fontSize: 14, color: colorScheme === "dark" ? "#fff" : "#000" },
      paragraph: { paddingVertical: 0 },
    },
  })

  const handleCreateThread = useCallback(async () => {
    if (isThreadMessage) return
    router.push(`/${teamId}/${message.channelId}/${message._id}`)
  }, [isThreadMessage, teamId, message.channelId])

  const insets = useSafeAreaInsets()
  const router = useRouter()

  const groupedReactions = message.reactions.reduce(
    (acc, reaction) => {
      acc[reaction.content] = {
        count: (acc[reaction.content]?.count || 0) + 1,
        reactions: [...(acc[reaction.content]?.reactions || []), reaction],
      }
      return acc
    },
    {} as Record<string, { count: number; reactions: MessageData["reactions"] }>,
  )

  const addReaction = useMutation(api.reactions.add).withOptimisticUpdate((localStore, args) => {
    if (!user) return

    optimisticallyUpdateValueInPaginatedQuery(
      localStore,
      api.messages.list,
      { channelId: params.channelId, messageId: params.messageId },
      (currentValue) => {
        if (message._id === currentValue._id) {
          return {
            ...currentValue,
            reactions: [
              ...currentValue.reactions,
              {
                ...args,
                messageId: message._id,
                _id: Crypto.randomUUID() as Id<"messageReactions">,
                _creationTime: Date.now(),
                userId: user._id,
                user,
              },
            ],
          }
        }
        return currentValue
      },
    )
  })

  const removeReaction = useMutation(api.reactions.remove).withOptimisticUpdate((localStore, args) => {
    optimisticallyUpdateValueInPaginatedQuery(
      localStore,
      api.messages.list,
      { channelId: params.channelId, messageId: params.messageId },
      (currentValue) => {
        if (message._id === currentValue._id) {
          return {
            ...currentValue,
            reactions: currentValue.reactions.filter((reaction) => reaction._id !== args.reactionId),
          }
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

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => {
      if (isThreadMessage) return
      router.push(`/${teamId}/${message.channelId}/${message._id}`)
    })
    .runOnJS(true)

  const doubleTap = Gesture.Tap()
    .maxDuration(250)
    .numberOfTaps(2)
    .onStart(() => {
      onEdit?.({ _id: message._id, content: message.content })
    })
    .runOnJS(true)

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      actionSheetRef.current?.show()
    })
    .runOnJS(true)

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 4,
        paddingHorizontal: 12,
        backgroundColor:
          message.optimisticStatus === "deleted" ? (colorScheme === "dark" ? "#544" : "rgba(255,0,0,0.05)") : "transparent",
        ...(isThreadParentMessage && {
          borderBottomWidth: 1,
          paddingTop: 12,
          paddingBottom: 10,
          marginBottom: 8,
          borderColor: colorScheme === "dark" ? "#444" : "#eee",
          backgroundColor: colorScheme === "dark" ? "#221" : "#ffe",
        }),
      }}
    >
      {isFirstMessageOfUser ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
            borderColor: colorScheme === "dark" ? "#444" : "#eee",
          }}
        >
          {message.author?.image ? (
            <Image source={{ uri: message.author.image }} style={{ width: 36, height: 36, borderRadius: 8 }} />
          ) : (
            <Text>{message.author?.name?.[0]}</Text>
          )}
        </View>
      ) : (
        <View style={{ width: 36 }} />
      )}
      <View>
        <GestureDetector gesture={Gesture.Exclusive(doubleTap, singleTap, longPress)}>
          <TouchableOpacity activeOpacity={0.8}>
            {isFirstMessageOfUser && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold" }}>{message.author.name}</Text>
                <Text style={{ fontSize: 12, color: "gray" }}>{dayjs(message._creationTime).format("HH:mm")}</Text>
              </View>
            )}
            <View style={{ opacity: message.optimisticStatus === "created" ? 0.8 : 1 }}>
              {markdown.map((element, index) => (
                <Fragment key={`ot-${index}`}>{element}</Fragment>
              ))}
            </View>
          </TouchableOpacity>
        </GestureDetector>

        {/* Reactions */}
        {Object.entries(groupedReactions).length > 0 && (
          <View style={{ alignItems: "center", gap: 4, paddingTop: 4, flexDirection: "row" }}>
            {Object.entries(groupedReactions).map(([content, { count, reactions }]) => {
              const isReacted = reactions.some((r) => r.userId === user?._id)
              return (
                <TouchableOpacity
                  key={content}
                  disabled={!user}
                  onPress={() => {
                    if (!user) return
                    const existingReaction = message.reactions.find((r) => r.content === content && r.userId === user._id)
                    if (existingReaction) {
                      // posthog.capture("reaction_removed", { channelId: message.channelId, teamId })
                      removeReaction({ reactionId: existingReaction._id })
                    } else {
                      // posthog.capture("reaction_added", { channelId: message.channelId, teamId })
                      addReaction({ messageId: message._id, content })
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 25,
                    justifyContent: "center",
                    paddingHorizontal: 4,
                    borderWidth: 1,
                    height: 26,
                    borderColor: isReacted ? "blue" : colorScheme === "dark" ? "#444" : "#eee",
                    backgroundColor: isReacted
                      ? colorScheme === "dark"
                        ? "rgba(59, 130, 246, 0.2)"
                        : "rgba(59, 130, 246, 0.1)"
                      : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12, textAlign: "center" }}>{content}</Text>
                  <Text style={{ fontSize: 12, minWidth: 16, textAlign: "center", color: isReacted ? "blue" : "black" }}>
                    {count}
                  </Text>
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity
              onPress={() => {
                actionSheetRef.current?.show()
              }}
              style={{
                borderRadius: 25,
                height: 26,
                paddingHorizontal: 8,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
                borderColor: colorScheme === "dark" ? "#444" : "#eee",
                backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
              }}
            >
              <SmilePlusIcon size={16} color={colorScheme === "dark" ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>
        )}
        {message.threadInfo && <ThreadIndicator threadInfo={message.threadInfo} />}
      </View>
      <ActionSheet
        ref={actionSheetRef}
        gestureEnabled
        containerStyle={{ backgroundColor: colorScheme === "dark" ? "#000" : "#fff" }}
      >
        <View style={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
          <QuickReactions
            message={message}
            onAdd={(content) => {
              addReaction({ messageId: message._id, content })
              actionSheetRef.current?.hide()
            }}
            onRemove={(reactionId) => {
              removeReaction({ reactionId })
              actionSheetRef.current?.hide()
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!isThreadMessage && (
              <Button
                onPress={() => {
                  handleCreateThread()
                  actionSheetRef.current?.hide()
                }}
                variant="outline"
                style={{ flex: 1 }}
                leftIcon={<ReplyIcon size={16} color={colorScheme === "dark" ? "#fff" : "#000"} />}
              >
                Reply
              </Button>
            )}
            <Button
              variant="outline"
              style={{ flex: 1 }}
              leftIcon={<PencilIcon size={16} color={colorScheme === "dark" ? "#fff" : "#000"} />}
            >
              Edit
            </Button>
            <Button
              onPress={() => {
                Alert.alert("Delete message", "Are you sure you want to delete this message?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "OK",
                    onPress: () => {
                      actionSheetRef.current?.hide()
                      remove({ messageId: message._id })
                    },
                  },
                ])
              }}
              variant="outline"
              style={{ flex: 1 }}
              leftIcon={<TrashIcon size={16} color="red" />}
            >
              Delete
            </Button>
          </View>
          <Button
            variant="outline"
            leftIcon={<CopyIcon size={16} />}
            onPress={async () => {
              actionSheetRef.current?.hide()
              toast({ type: "success", title: "Copied to clipboard", visibilityTime: 1000 })
              void Clipboard.setStringAsync(message.content)
            }}
          >
            Copy text
          </Button>
        </View>
      </ActionSheet>
    </View>
  )
}

const QUICK_REACTIONS = ["👍", "👌", "😁", "🙌", "🙏"] as const

function QuickReactions({
  message,
  onAdd,
  onRemove,
}: {
  message: MessageData
  onAdd: (emoji: string) => void
  onRemove: (reactionId: Id<"messageReactions">) => void
}) {
  const user = useQuery(api.auth.me)
  const colorScheme = useColorScheme()

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "space-around" }}>
      {QUICK_REACTIONS.map((emoji) => {
        const existingReaction = message.reactions.find((r) => r.content === emoji && r.userId === user?._id)
        return (
          <TouchableOpacity
            key={emoji}
            onPress={() => {
              if (existingReaction) {
                onRemove(existingReaction._id)
              } else {
                onAdd(emoji)
              }
            }}
            style={{
              borderRadius: 25,
              width: 50,
              height: 50,
              borderWidth: 1,
              borderColor: existingReaction ? "blue" : colorScheme === "dark" ? "#444" : "#eee",
              backgroundColor: existingReaction
                ? colorScheme === "dark"
                  ? "rgba(59, 130, 246, 0.2)"
                  : "rgba(59, 130, 246, 0.1)"
                : "transparent",
              padding: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
