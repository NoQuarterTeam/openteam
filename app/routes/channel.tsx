import { convexQuery } from "@convex-dev/react-query"
import { useQuery as useQueryTanstack } from "@tanstack/react-query"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import dayjs from "dayjs"
import advancedFormat from "dayjs/plugin/advancedFormat"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { redirect, useParams, useSearchParams } from "react-router"
import { ChannelHeader } from "@/components/channel-header"
import { Message } from "@/components/message"
import { MessageInput } from "@/components/message-input"
import { ThreadSidebar } from "@/components/thread-sidebar"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { DEFAULT_PAGINATION_NUM_ITEMS } from "@/lib/pagination"
import { useRecentChannels } from "@/lib/use-recent-channels"
import { cn } from "@/lib/utils"

dayjs.extend(advancedFormat)

export default function Component() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()

  const user = useQuery(api.auth.loggedInUser)
  const { data: currentChannel } = useQueryTanstack(convexQuery(api.channels.get, { channelId: channelId! }))
  // Initial page load
  const { results, loadMore, status } = usePaginatedQuery(
    api.messages.list,
    { channelId: channelId! },
    { initialNumItems: DEFAULT_PAGINATION_NUM_ITEMS },
  )

  const addChannel = useRecentChannels((s) => s.addChannel)

  const [searchParams, setSearchParams] = useSearchParams()
  const currentThreadId = searchParams.get("threadId") as Id<"threads"> | null

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)

  // Scroll state
  const isScrolledUpRef = useRef(false)

  // Track pagination state
  const scrollAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)
  const prevMessagesLengthRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  // Track channel changes
  const prevChannelIdRef = useRef<string | null>(null)

  const messages = useMemo(() => [...results].reverse(), [results])

  const handleCloseThread = useCallback(() => {
    setSearchParams((searchParams) => {
      searchParams.delete("threadId")
      return searchParams
    })
  }, [])

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 1 // +1 for rounding

    isScrolledUpRef.current = !isAtBottom
  }, [])

  const markAsRead = useMutation(api.channels.markAsRead)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setSearchParams((searchParams) => {
          searchParams.delete("threadId")
          return searchParams
        })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Handle channel changes - reset state
  useEffect(() => {
    if (!channelId) return

    const isChannelChange = prevChannelIdRef.current !== channelId
    prevChannelIdRef.current = channelId

    if (isChannelChange) {
      isScrolledUpRef.current = false
      prevMessagesLengthRef.current = 0
      scrollAnchorRef.current = null
      isLoadingMoreRef.current = false
      addChannel(channelId)
      void markAsRead({ channelId })
    }
  }, [channelId])

  // Set up intersection observer for automatic loading
  useEffect(() => {
    if (!topSentinelRef.current || status !== "CanLoadMore") return

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0]
      if (entry?.isIntersecting && !isLoadingMoreRef.current) {
        const container = messagesContainerRef.current
        if (!container) return
        scrollAnchorRef.current = { scrollHeight: container.scrollHeight, scrollTop: container.scrollTop }
        isLoadingMoreRef.current = true
        loadMore(DEFAULT_PAGINATION_NUM_ITEMS)
      }
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0,
      rootMargin: "100px 0px 0px 0px",
    })

    observer.observe(topSentinelRef.current)

    return () => {
      observer.disconnect()
    }
  }, [status])

  // Handle scroll position during pagination (loading older messages)
  useEffect(() => {
    if (!isLoadingMoreRef.current || !scrollAnchorRef.current || !messagesContainerRef.current) return

    // Restore scroll position after loading more messages
    requestAnimationFrame(() => {
      if (!scrollAnchorRef.current || !messagesContainerRef.current) return

      const { scrollHeight: prevScrollHeight, scrollTop: prevScrollTop } = scrollAnchorRef.current
      const newScrollHeight = messagesContainerRef.current.scrollHeight

      messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop - 50

      // Clean up
      scrollAnchorRef.current = null
      isLoadingMoreRef.current = false
    })
  }, [messages.length])

  // Handle scrolling to bottom for new messages and initial load
  useEffect(() => {
    if (!channelId) return

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
        bottomSentinelRef.current?.scrollIntoView({ behavior: "instant" })
      })
      void markAsRead({ channelId })
    }
  }, [messages.length, status, channelId])

  const groupedMessages = useMemo(() => {
    return messages.reduce(
      (acc, message) => {
        const date = dayjs(message._creationTime).format("YYYY-MM-DD")
        if (!acc[date]) acc[date] = []
        acc[date].push(message)
        return acc
      },
      {} as Record<string, typeof messages>,
    )
  }, [messages])
  if (currentChannel === null) return redirect("/")
  if (!currentChannel) return null

  const displayName = currentChannel.dmUser ? currentChannel.dmUser.name : currentChannel.name

  const lastMessageOfUser = messages.findLast((message) => message.authorId === user?._id)

  return (
    <div className="flex h-full flex-1">
      <div
        className={cn(
          "flex-1 flex-col overflow-hidden border bg-background shadow-xs transition-all md:rounded-xl",
          currentThreadId ? "mr-2 hidden md:flex" : "flex",
        )}
      >
        <ChannelHeader key={currentChannel._id} channel={currentChannel} />

        <div
          ref={messagesContainerRef}
          className="relative flex-1 overflow-y-auto overscroll-none pt-9 pb-2"
          onScroll={handleScroll}
        >
          <div className="-mt-6">
            {status === "LoadingMore" ? (
              <div className="flex h-12 justify-center pt-2">
                <Spinner className="size-4" />
              </div>
            ) : status === "CanLoadMore" ? (
              <div ref={topSentinelRef} className="h-1" />
            ) : status === "LoadingFirstPage" ? null : (
              <div className="pb-4 pl-4">
                <h1 className="font-bold text-3xl">{displayName}</h1>
                <p className="font-normal text-muted-foreground text-sm">
                  Created {dayjs(currentChannel._creationTime).format("MMMM D, YYYY")} by {currentChannel.createdBy?.name}. This
                  is the very beginning of the {displayName} channel.
                </p>
              </div>
            )}
          </div>

          <div>
            {status === "LoadingFirstPage"
              ? null
              : Object.entries(groupedMessages).map(([date, messages], i) => {
                  return (
                    <div key={date} className={cn("border-t pt-4 pb-4", i === Object.keys(groupedMessages).length - 1 && "pb-0")}>
                      <div className="sticky top-0 z-10">
                        <div className="-top-[30px] absolute right-0 left-0 flex items-center justify-center">
                          <p className="rounded-full border bg-background px-3 py-1 text-center text-xs shadow-xs">
                            {dayjs(date).isSame(dayjs(), "day")
                              ? "Today"
                              : dayjs(date).isSame(dayjs().subtract(1, "day"), "day")
                                ? "Yesterday"
                                : dayjs(date).format("dddd, MMMM Do")}
                          </p>
                        </div>
                      </div>
                      {messages.map((message, index) => {
                        const isFirstMessageOfUser =
                          index === 0 ||
                          messages[index - 1]?.authorId !== message.authorId ||
                          (!!messages[index - 1] &&
                            new Date(message._creationTime).getTime() - new Date(messages[index - 1]!._creationTime).getTime() >
                              10 * 60 * 1000)
                        return <Message key={message._id} message={message} isFirstMessageOfUser={isFirstMessageOfUser} />
                      })}
                    </div>
                  )
                })}
          </div>

          <div ref={bottomSentinelRef} />
        </div>

        <MessageInput
          channelId={channelId!}
          isDisabled={!!currentChannel.archivedTime}
          lastMessageIdOfUser={lastMessageOfUser?._id}
        />
      </div>

      {!!currentThreadId && <ThreadSidebar threadId={currentThreadId} onClose={handleCloseThread} />}
    </div>
  )
}
