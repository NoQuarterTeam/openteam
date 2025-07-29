import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { FlashList } from "@shopify/flash-list"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import dayjs from "dayjs"
import advancedFormat from "dayjs/plugin/advancedFormat"
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router"
import { ChevronLeftIcon } from "lucide-react-native"
import { useCallback, useMemo, useRef, useState } from "react"
import { NativeScrollEvent, NativeSyntheticEvent, useColorScheme, View } from "react-native"
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import EditMessage from "@/components/edit-message"
import { Message } from "@/components/message"
import { MessageInput } from "@/components/message-input"
import { Text } from "@/components/ui/text"
import { DEFAULT_PAGINATION_NUM_ITEMS } from "@/lib/config"

dayjs.extend(advancedFormat)

export default function Page() {
  const params = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels">; messageId: Id<"messages"> }>()
  const parentMessage = useQuery(api.messages.get, { messageId: params.messageId })
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()

  // Initial page load
  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.messages.list,
    { channelId: params.channelId, messageId: params.messageId, order: "asc" },
    { initialNumItems: DEFAULT_PAGINATION_NUM_ITEMS },
  )

  const isScrolledUpRef = useRef(true)

  const [editMessage, setEditMessage] = useState<{ _id: Id<"messages">; content: string } | null>(null)

  const flatMessagesWithDates = useMemo(() => {
    const result: Array<((typeof messages)[0] & { isFirstMessageOfUser: boolean }) | string> = []
    let currentDate = ""

    // Iterate forwards since we're using a regular list (oldest to newest)
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index]
      const date = dayjs(message._creationTime).format("YYYY-MM-DD")

      // Add date header if it's a new date (checking the previous message in original order)
      if (date !== currentDate) {
        currentDate = date
        result.push(date)
      }

      // For regular list, check if this is the first message of the user by looking at the PREVIOUS message
      // (which appears above in the regular display)
      const isFirstMessageOfUser =
        index === 0 ||
        messages[index - 1]?.authorId !== message.authorId ||
        (!!messages[index - 1] &&
          new Date(message._creationTime).getTime() - new Date(messages[index - 1]!._creationTime).getTime() > 10 * 60 * 1000)

      result.push({ ...message, isFirstMessageOfUser })
    }

    return result
  }, [messages])

  const flatListRef = useRef<FlashList<(typeof flatMessagesWithDates)[number] & { isFirstMessageOfUser: boolean }>>(null)

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!flatListRef.current) return
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 1 // +1 for rounding
    isScrolledUpRef.current = !isAtBottom
  }, [])

  const markAsRead = useMutation(api.channels.markThreadAsRead)
  const prevMessagesLengthRef = useRef(0)

  // Handle scrolling to bottom for new messages and initial load
  useFocusEffect(
    useCallback(() => {
      if (!params.channelId) return
      const currentLength = messages.length
      const prevLength = prevMessagesLengthRef.current
      prevMessagesLengthRef.current = currentLength
      // Don't scroll if we're loading more messages or still loading first page
      // Scroll to bottom if:
      // 1. Initial load (prevLength === 0) and we have messages and user isn't scrolled up
      // 2. New messages arrived (currentLength > prevLength) and user is at bottom
      const shouldScrollToBottom =
        (prevLength === 0 && currentLength > 0 && !isScrolledUpRef.current) ||
        (currentLength > prevLength && !isScrolledUpRef.current)

      if (shouldScrollToBottom) {
        flatListRef.current?.scrollToEnd({ animated: true })
        void markAsRead({ messageId: params.messageId })
      }
    }, [messages.length]),
  )

  const keyboard = useAnimatedKeyboard()

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: Math.max(keyboard.height.value, insets.bottom),
    }
  })
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          alignItems: "center",
          gap: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderColor: colorScheme === "dark" ? "#444" : "#eee",
        }}
      >
        <Link href="../">
          <ChevronLeftIcon size={24} color={colorScheme === "dark" ? "#fff" : "#000"} />
        </Link>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Thread</Text>
      </View>

      <FlashList
        ref={flatListRef}
        onScroll={handleScroll}
        onEndReached={() => {
          if (status === "CanLoadMore") {
            void loadMore(DEFAULT_PAGINATION_NUM_ITEMS)
          }
        }}
        onEndReachedThreshold={0.5}
        estimatedItemSize={55}
        contentInsetAdjustmentBehavior="always"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={16}
        extraData={messages.length}
        data={flatMessagesWithDates}
        contentContainerStyle={{ paddingBottom: 16 }}
        getItemType={(item) => (typeof item === "string" ? "sectionHeader" : "row")}
        ListHeaderComponent={
          parentMessage && (
            <View
              style={{
                borderBottomWidth: 1,
                marginBottom: 8,
                borderColor: colorScheme === "dark" ? "#444" : "#eee",
              }}
            >
              <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: colorScheme === "dark" ? "#444" : "#eee" }}>
                <Message message={parentMessage} isFirstMessageOfUser isThreadParentMessage onEdit={setEditMessage} />
              </View>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ opacity: 0.5 }}>
                  {dayjs(parentMessage._creationTime).isSame(dayjs(), "day")
                    ? "Today"
                    : dayjs(parentMessage._creationTime).isSame(dayjs().subtract(1, "day"), "day")
                      ? "Yesterday"
                      : dayjs(parentMessage._creationTime).format("dddd, MMMM Do")}
                  {parentMessage.threadInfo ? `• ${parentMessage.threadInfo.replyCount} replies` : ""}
                </Text>
              </View>
            </View>
          )
        }
        renderItem={({ item }) => {
          if (typeof item === "string") {
            if (params.messageId) return null
            return (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginBottom: 8,
                  borderBottomWidth: 1,
                  borderColor: colorScheme === "dark" ? "#444" : "#eee",
                }}
              >
                {dayjs(item).isSame(dayjs(), "day")
                  ? "Today"
                  : dayjs(item).isSame(dayjs().subtract(1, "day"), "day")
                    ? "Yesterday"
                    : dayjs(item).format("dddd, MMMM Do")}
              </Text>
            )
          }

          return <Message message={item} isFirstMessageOfUser={item.isFirstMessageOfUser} onEdit={setEditMessage} />
        }}
      />
      {editMessage ? <EditMessage message={editMessage} onClose={() => setEditMessage(null)} /> : <MessageInput />}
      <Animated.View style={animatedStyle} />
    </View>
  )
}
