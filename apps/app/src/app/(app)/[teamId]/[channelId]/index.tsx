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
  const colorScheme = useColorScheme()
  const params = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels"> }>()
  const channel = useQuery(api.channels.get, { channelId: params.channelId })
  const insets = useSafeAreaInsets()

  // Initial page load
  const { results, loadMore, status } = usePaginatedQuery(
    api.messages.list,
    { channelId: params.channelId },
    { initialNumItems: DEFAULT_PAGINATION_NUM_ITEMS },
  )

  const isScrolledUpRef = useRef(false)

  const messages = results

  const flatMessagesWithDates = useMemo(() => {
    const result: Array<((typeof messages)[0] & { isFirstMessageOfUser: boolean }) | string> = []
    let currentDate = ""

    // Iterate backwards since we're using an inverted list
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index]
      const date = dayjs(message._creationTime).format("YYYY-MM-DD")

      // Add date header if it's a new date (checking the previous message in original order)
      if (date !== currentDate) {
        currentDate = date
        result.push(date)
      }

      // For inverted list, check if this is the first message of the user by looking at the NEXT message
      // (which appears above in the inverted display)
      const isFirstMessageOfUser =
        index === messages.length - 1 ||
        messages[index + 1]?.authorId !== message.authorId ||
        (!!messages[index + 1] &&
          new Date(message._creationTime).getTime() - new Date(messages[index + 1]!._creationTime).getTime() > 10 * 60 * 1000)

      result.push({ ...message, isFirstMessageOfUser })
    }

    return result.reverse()
  }, [messages])

  const flatListRef = useRef<FlashList<(typeof flatMessagesWithDates)[number] & { isFirstMessageOfUser: boolean }>>(null)

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!flatListRef.current) return
    const { contentOffset } = event.nativeEvent
    // In inverted list, when contentOffset.y is 0, we're at the "bottom" (newest messages)
    // When contentOffset.y is high, we're at the "top" (oldest messages)
    const isAtBottom = contentOffset.y <= 1 // +1 for rounding
    isScrolledUpRef.current = !isAtBottom
  }, [])

  const [editMessage, setEditMessage] = useState<{ _id: Id<"messages">; content: string } | null>(null)

  const markAsRead = useMutation(api.channels.markAsRead)
  const prevMessagesLengthRef = useRef(0)

  // Handle scrolling to bottom for new messages and initial load
  useFocusEffect(
    useCallback(() => {
      if (!params.channelId) return
      const currentLength = messages.length
      const prevLength = prevMessagesLengthRef.current
      prevMessagesLengthRef.current = currentLength
      // Don't scroll if we're loading more messages or still loading first page
      // if (status === "LoadingFirstPage") return
      // Scroll to bottom if:
      // 1. Initial load (prevLength === 0) and we have messages and user isn't scrolled up
      // 2. New messages arrived (currentLength > prevLength) and user is at bottom
      const shouldScrollToBottom =
        (prevLength === 0 && currentLength > 0 && !isScrolledUpRef.current) ||
        (currentLength > prevLength && !isScrolledUpRef.current)

      if (shouldScrollToBottom) {
        flatListRef.current?.scrollToIndex({ index: 0, animated: false })
        void markAsRead({ channelId: params.channelId })
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
          alignItems: "center",
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderColor: colorScheme === "dark" ? "#444" : "#eee",
        }}
      >
        <Link href="../">
          <ChevronLeftIcon size={24} color={colorScheme === "dark" ? "#fff" : "#000"} />
        </Link>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}># {channel?.name}</Text>
      </View>
      <FlashList
        ref={flatListRef}
        extraData={messages.length > 0}
        onScroll={handleScroll}
        onEndReached={() => {
          if (status === "CanLoadMore") {
            void loadMore(DEFAULT_PAGINATION_NUM_ITEMS)
          }
        }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        scrollEventThrottle={16}
        estimatedItemSize={55}
        contentInsetAdjustmentBehavior="always"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        inverted
        data={flatMessagesWithDates}
        ListFooterComponent={
          status === "Exhausted" && (
            <View
              style={{
                padding: 16,
                marginBottom: 32,
                gap: 4,
                borderBottomWidth: 1,
                borderColor: colorScheme === "dark" ? "#444" : "#eee",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "bold" }}>{channel?.name}</Text>
              <Text style={{ fontSize: 14, color: colorScheme === "dark" ? "#888" : "#666" }}>
                Created {dayjs(channel?._creationTime).format("MMMM Do, YYYY")} by {channel?.createdBy.name}. This is the very
                beginning of the {channel?.name} channel.
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 16 }}
        getItemType={(item) => (typeof item === "string" ? "sectionHeader" : "row")}
        maintainVisibleContentPosition={{
          minIndexForVisible: 1,
          autoscrollToTopThreshold: 10,
        }}
        renderItem={({ item }) => {
          if (typeof item === "string") {
            return (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  paddingVertical: 8,
                  marginBottom: 8,
                  paddingHorizontal: 12,
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

      <Animated.View style={[animatedStyle]} />
    </View>
  )
}
