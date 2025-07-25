import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { FlashList } from "@shopify/flash-list"
import { usePaginatedQuery, useQuery } from "convex/react"
import dayjs from "dayjs"
import advancedFormat from "dayjs/plugin/advancedFormat"
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router"
import { ChevronLeftIcon } from "lucide-react-native"
import { useCallback, useMemo, useRef, useState } from "react"
import { NativeScrollEvent, NativeSyntheticEvent, useColorScheme, View } from "react-native"
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
    results,
    loadMore: _,
    status,
  } = usePaginatedQuery(
    api.messages.list,
    { channelId: params.channelId, messageId: params.messageId },
    { initialNumItems: DEFAULT_PAGINATION_NUM_ITEMS },
  )

  const isScrolledUpRef = useRef(false)

  const messages = useMemo(() => [...results].reverse(), [results])

  const flatMessagesWithDates = useMemo(() => {
    const result: Array<((typeof messages)[0] & { isFirstMessageOfUser: boolean }) | string> = []
    let currentDate = ""

    for (let index = 0; index < messages.length; index++) {
      const message = messages[index]
      const isFirstMessageOfUser =
        index === 0 ||
        messages[index - 1]?.authorId !== message.authorId ||
        (!!messages[index - 1] &&
          new Date(message._creationTime).getTime() - new Date(messages[index - 1]!._creationTime).getTime() > 10 * 60 * 1000)
      const date = dayjs(message._creationTime).format("YYYY-MM-DD")
      if (date !== currentDate) {
        currentDate = date
        result.push(date)
      }
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
  const prevMessagesLengthRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  const [editMessage, setEditMessage] = useState<{ _id: Id<"messages">; content: string } | null>(null)
  // Handle scrolling to bottom for new messages and initial load
  useFocusEffect(
    useCallback(() => {
      if (!flatListRef.current) return
      const currentLength = messages.length
      const prevLength = prevMessagesLengthRef.current
      prevMessagesLengthRef.current = currentLength

      // Don't scroll if we're loading more messages or still loading first page
      if (isLoadingMoreRef.current || status === "LoadingFirstPage") return

      try {
        const shouldScrollToBottom =
          (prevLength === 0 && currentLength > 0 && !isScrolledUpRef.current) ||
          (currentLength > prevLength && !isScrolledUpRef.current)

        if (shouldScrollToBottom) {
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      } catch {
        // weird thing where scroll throws
      }
    }, [messages.length, status]),
  )
  if (!parentMessage) return null

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 12,
          alignItems: "center",
          gap: 8,
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
        estimatedItemSize={55}
        ListHeaderComponent={
          <Message message={parentMessage} isFirstMessageOfUser isThreadParentMessage isThreadMessage onEdit={setEditMessage} />
        }
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        data={flatMessagesWithDates}
        contentContainerStyle={{ paddingBottom: 16 }}
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

          return (
            <Message message={item} isFirstMessageOfUser={item.isFirstMessageOfUser} isThreadMessage onEdit={setEditMessage} />
          )
        }}
        getItemType={(item) => (typeof item === "string" ? "sectionHeader" : "row")}
      />

      {editMessage ? <EditMessage message={editMessage} onClose={() => setEditMessage(null)} /> : <MessageInput />}
    </View>
  )
}
