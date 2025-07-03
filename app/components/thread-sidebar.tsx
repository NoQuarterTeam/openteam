import { useQuery as useConvexQuery, usePaginatedQuery, useQuery } from "convex/react"
import { XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { Message } from "@/components/message"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { DEFAULT_PAGINATION_NUM_ITEMS } from "@/lib/pagination"
import { MessageInput } from "./message-input"
import { Spinner } from "./ui/spinner"

interface ThreadSidebarProps {
  threadId: Id<"threads">
  onClose: () => void
}

export function ThreadSidebar({ threadId, onClose }: ThreadSidebarProps) {
  const threadData = useQuery(api.threads.get, { threadId })

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)

  // Scroll state
  const isScrolledUpRef = useRef(false)

  // Track pagination state
  const scrollAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)
  const prevMessagesLengthRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  // Track thread changes
  const prevThreadIdRef = useRef<string | null>(null)

  // Use paginated query for thread messages
  const { results, loadMore, status } = usePaginatedQuery(
    api.threads.listMessages,
    { threadId },
    { initialNumItems: DEFAULT_PAGINATION_NUM_ITEMS },
  )

  const messages = useMemo(() => [...results].reverse(), [results])

  const user = useConvexQuery(api.auth.loggedInUser)
  const lastMessageOfUser = messages?.findLast((message) => message.authorId === user?._id)

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 1 // +1 for rounding

    isScrolledUpRef.current = !isAtBottom
  }, [])

  // Handle thread changes - reset state
  useEffect(() => {
    if (!threadId) return

    const isThreadChange = prevThreadIdRef.current !== threadId
    prevThreadIdRef.current = threadId

    if (isThreadChange) {
      isScrolledUpRef.current = false
    }
  }, [threadId])

  // Handle scroll position during pagination (loading older messages)
  useEffect(() => {
    if (!isLoadingMoreRef.current || !scrollAnchorRef.current || !messagesContainerRef.current) return

    // Restore scroll position after loading more messages
    requestAnimationFrame(() => {
      if (!scrollAnchorRef.current || !messagesContainerRef.current) return

      const { scrollHeight: prevScrollHeight, scrollTop: prevScrollTop } = scrollAnchorRef.current
      const newScrollHeight = messagesContainerRef.current.scrollHeight

      messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop

      // Clean up
      scrollAnchorRef.current = null
      isLoadingMoreRef.current = false
    })
  }, [messages.length])

  // Handle scrolling to bottom for new messages and initial load
  useEffect(() => {
    const currentLength = messages.length
    const prevLength = prevMessagesLengthRef.current
    prevMessagesLengthRef.current = currentLength

    // Don't scroll if we're loading more messages or still loading first page
    if (isLoadingMoreRef.current || status === "LoadingFirstPage") return

    // Scroll to bottom if:
    // 1. Initial load (prevLength === 0) and we have messages and user isn't scrolled up
    // 2. New messages arrived (currentLength > prevLength) and user is at bottom
    const shouldScrollToBottom =
      (prevLength === 0 && currentLength > 0 && !isScrolledUpRef.current) ||
      (currentLength > prevLength && !isScrolledUpRef.current)

    if (shouldScrollToBottom) {
      requestAnimationFrame(() => {
        bottomSentinelRef.current?.scrollIntoView()
      })
    }
  }, [messages.length, status])

  return (
    <div className="flex h-full w-full shrink-0 flex-col overflow-hidden border bg-background shadow-xs md:w-72 md:rounded-xl lg:w-96">
      {/* Thread Header */}
      <div className="flex items-center justify-between border-b py-2 pr-2 pl-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Thread</h3>
          {!threadData && <Spinner className="size-4" />}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {threadData && (
        <>
          <Message message={threadData.parentMessage} isFirstMessageOfUser isThreadParentMessage isThreadMessage />
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-none py-2" onScroll={handleScroll}>
            {status === "LoadingMore" ? (
              <div className="flex justify-center py-2">
                <Spinner className="size-4" />
              </div>
            ) : status === "CanLoadMore" ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const container = messagesContainerRef.current
                    if (!container) return

                    // Save scroll position and mark that we're loading more
                    scrollAnchorRef.current = { scrollHeight: container.scrollHeight, scrollTop: container.scrollTop }
                    isLoadingMoreRef.current = true
                    loadMore(DEFAULT_PAGINATION_NUM_ITEMS)
                  }}
                >
                  Load more
                </Button>
              </div>
            ) : null}
            <div ref={topSentinelRef} className="h-1" />
            <div className="min-h-[200px]">
              {status === "LoadingFirstPage"
                ? null
                : messages?.map((message, index) => {
                    const isFirstMessageOfUser =
                      index === 0 ||
                      messages[index - 1]?.authorId !== message.authorId ||
                      new Date(message._creationTime).getTime() - new Date(messages[index - 1]!._creationTime).getTime() >
                        10 * 60 * 1000

                    return (
                      <Message key={message._id} message={message} isFirstMessageOfUser={isFirstMessageOfUser} isThreadMessage />
                    )
                  })}
            </div>

            <div ref={bottomSentinelRef} />
          </div>

          <MessageInput
            channelId={threadData.thread.channelId}
            threadId={threadId}
            isDisabled={false}
            lastMessageIdOfUser={lastMessageOfUser?._id}
          />
        </>
      )}
    </div>
  )
}
