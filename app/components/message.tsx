import { optimisticallyUpdateValueInPaginatedQuery, useMutation, useQuery } from "convex/react"
import dayjs from "dayjs"
import { ChevronDownIcon, Edit2Icon, MessageSquareTextIcon, SmileIcon, SmilePlusIcon, TrashIcon } from "lucide-react"
import posthog from "posthog-js"
import { memo, useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { OptimisticStatus } from "@/convex/optimistic"
import { renderMessageContent } from "@/lib/marked"
import { useEditMessage } from "@/lib/use-edit-message"
import { useIsMobile } from "@/lib/use-mobile"
import { cn } from "@/lib/utils"
import { ExpandableTextarea } from "./expandable-textarea"
import { FileDisplay } from "./file-display"
import { ThreadIndicator } from "./thread-indicator"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { WithState } from "./with-state"

type MessageData =
  | (typeof api.messages.list._returnType)["page"][number]
  | (typeof api.threads.listMessages._returnType)["page"][number]

interface Props {
  message: MessageData
  isFirstMessageOfUser: boolean
  isThreadParentMessage?: boolean
  isThreadMessage?: boolean
}

export const Message = memo(function _Message({
  message,
  isFirstMessageOfUser,
  isThreadParentMessage = false,
  isThreadMessage = false,
}: Props) {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const user = useQuery(api.auth.me)
  const isMobile = useIsMobile()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isToolbarVisible, setIsToolbarVisible] = useState(false)
  const createThread = useMutation(api.threads.create)
  const [_, setSearchParams] = useSearchParams()

  const handleCreateThread = async (messageId: Id<"messages">) => {
    try {
      const threadId = await createThread({ parentMessageId: messageId })
      posthog.capture("thread_created", { channelId: message.channelId, teamId })
      setSearchParams((searchParams) => {
        searchParams.set("threadId", threadId)
        return searchParams
      })
    } catch (error) {
      console.error("Failed to create thread:", error)
    }
  }

  const editMessageId = useEditMessage((s) => s.messageId)
  const setEditMessageId = useEditMessage((s) => s.setMessageId)

  // Handle toolbar visibility for mobile
  const handleMessageClick = () => {
    if (isMobile) {
      setIsToolbarVisible(!isToolbarVisible)
    }
  }

  // Hide toolbar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isToolbarVisible) return

    const handleClickOutside = () => {
      setIsToolbarVisible(false)
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [isMobile, isToolbarVisible])

  const addReaction = useMutation(api.reactions.add).withOptimisticUpdate((localStore, args) => {
    if (!user) return

    optimisticallyUpdateValueInPaginatedQuery(localStore, api.messages.list, { channelId: message.channelId }, (currentValue) => {
      if (message._id === currentValue._id) {
        return {
          ...currentValue,
          reactions: [
            ...currentValue.reactions,
            {
              ...args,
              messageId: message._id,
              _id: crypto.randomUUID() as Id<"messageReactions">,
              _creationTime: Date.now(),
              userId: user._id,
              user,
            },
          ],
        }
      }
      return currentValue
    })
  })

  const removeReaction = useMutation(api.reactions.remove).withOptimisticUpdate((localStore, args) => {
    optimisticallyUpdateValueInPaginatedQuery(localStore, api.messages.list, { channelId: message.channelId }, (currentValue) => {
      if (message._id === currentValue._id) {
        return {
          ...currentValue,
          reactions: currentValue.reactions.filter((reaction) => reaction._id !== args.reactionId),
        }
      }
      return currentValue
    })
  })

  const remove = useMutation(api.messages.remove).withOptimisticUpdate((localStore) => {
    optimisticallyUpdateValueInPaginatedQuery(localStore, api.messages.list, { channelId: message.channelId }, (currentValue) => {
      if (message._id === currentValue._id) {
        return { ...currentValue, optimisticStatus: "deleted" as OptimisticStatus }
      }
      return currentValue
    })
  })

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

  const onlyFullsizeAbleFiles = message.files?.every(
    (f) =>
      f.metadata?.contentType?.startsWith("image/") ||
      f.previewContentType?.startsWith("image/") ||
      f.metadata?.contentType?.startsWith("video/") ||
      f.previewContentType?.startsWith("video/"),
  )

  return (
    <div
      className={cn(
        "group flex gap-2 px-4 transition-opacity duration-200",
        isThreadParentMessage
          ? "border-b bg-yellow-50 py-4 dark:bg-yellow-800/10"
          : "py-1.5 hover:bg-muted/50 dark:hover:bg-muted/30",
        message.optimisticStatus === "deleted" && "opacity-0",
      )}
      onClick={isMobile ? handleMessageClick : undefined}
    >
      <div className="shrink-0">
        {isFirstMessageOfUser && message.author ? (
          message.author.image ? (
            <img src={message.author.image || undefined} className="size-9 rounded-lg object-cover" alt={message.author.name} />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
              {message.author.name.charAt(0)}
            </div>
          )
        ) : (
          <div className="w-9" />
        )}
      </div>
      <div className="relative w-full">
        {isFirstMessageOfUser ? (
          <div className="flex gap-2 pb-1.5">
            <span className="font-semibold text-sm leading-4">{message.author?.name || "Unknown"}</span>
            <span className="text-xs leading-4 opacity-50">{dayjs(message._creationTime).format("HH:mm")}</span>
          </div>
        ) : (
          <p className="-left-10 absolute top-0 hidden text-xs opacity-50 group-hover:block">
            {dayjs(message._creationTime).format("HH:mm")}
          </p>
        )}
        {editMessageId === message._id ? (
          <MessageEditor message={message} />
        ) : (
          <>
            {message.content && (
              <div
                className={cn(
                  "-my-[6px] font-normal text-sm leading-7",
                  "[&_a]:text-blue-500 [&_a]:underline hover:[&_a]:text-blue-600",
                  "[&_h1]:font-semibold [&_h1]:text-xl [&_h1]:leading-10",
                  "[&_h2]:font-semibold [&_h2]:text-lg [&_h2]:leading-10",
                  "[&_h3]:font-semibold [&_h3]:text-base",
                  "[&_h4]:font-semibold [&_h4]:text-sm",
                  "[&_h5]:font-semibold [&_h5]:text-xs",
                  "[&_h6]:font-semibold [&_h6]:text-xs",
                  "[&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-4",
                  "[&_ol]:m-0 [&_ol]:list-decimal [&_ol]:pl-4",
                  "[&_pre]:!inline-grid [&_pre]:!bg-transparent [&_pre]:w-full [&_pre]:py-1",
                  // Code blocks WITH hljs (syntax highlighted)
                  "[&_code.hljs]:!py-2 [&_code.hljs]:!px-3 [&_code.hljs]:!bg-neutral-900 [&_code.hljs]:!text-white [&_code.hljs]:my-1 [&_code.hljs]:block [&_code.hljs]:rounded-md [&_code.hljs]:border [&_code.hljs]:font-mono [&_code.hljs]:shadow-sm",
                  // Code blocks WITHOUT hljs (plain code)
                  "[&_code:not(.hljs)]:!py-0.5 [&_code:not(.hljs)]:!px-1.5 [&_code:not(.hljs)]:!bg-neutral-100 [&_code:not(.hljs)]:!border [&_code:not(.hljs)]:my-0.5 [&_code:not(.hljs)]:inline [&_code:not(.hljs)]:rounded-sm [&_code:not(.hljs)]:font-mono [&_code:not(.hljs)]:text-neutral-800 [&_code:not(.hljs)]:text-sm",
                  "dark:[&_code:not(.hljs)]:!bg-neutral-700 dark:[&_code:not(.hljs)]:!text-neutral-200",
                  // Blockquotes
                  "[&_blockquote]:border-muted-foreground/20 [&_blockquote]:border-l-4 [&_blockquote]:pl-2",
                  "[&_img]:max-w-md [&_img]:rounded-lg [&_img]:object-contain",
                  "[&_table]:w-full [&_table]:rounded-lg [&_table]:border [&_table]:shadow-xs",
                  "[&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold",
                  "[&_td]:p-2 [&_td]:text-sm",
                  "[&_tr]:border-b",
                  "[&_tr:last-child]:border-b-0",
                  message.optimisticStatus === "created" && "opacity-70",
                )}
                dangerouslySetInnerHTML={{ __html: renderMessageContent(message.content) }}
              />
            )}
            {message.files && message.files.length > 0 && (
              <div>
                <WithState initialState={true}>
                  {(isImageOpen, setIsImageOpen) => (
                    <>
                      <div className="flex items-center gap-0.5 py-1">
                        <p className="text-xs opacity-50">
                          {message.files.length === 1 ? message.files[0]!.name : `${message.files.length} files`}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4 rounded-sm"
                          onClick={() => setIsImageOpen(!isImageOpen)}
                        >
                          <ChevronDownIcon className="size-3.5 opacity-50" />
                        </Button>
                      </div>
                      {isImageOpen && message.files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.files.map((file) => (
                            <FileDisplay
                              key={file._id}
                              file={file}
                              variant="message"
                              fullSize={onlyFullsizeAbleFiles}
                              channelId={message.channelId}
                              messageId={message._id}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </WithState>
              </div>
            )}
            {/* Reactions */}
            {Object.entries(groupedReactions).length > 0 && (
              <div className="flex items-center gap-1 pt-1">
                {Object.entries(groupedReactions).map(([content, { count, reactions }]) => (
                  <Tooltip key={content}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={!user}
                        onClick={() => {
                          if (!user) return
                          const existingReaction = message.reactions.find((r) => r.content === content && r.userId === user._id)
                          if (existingReaction) {
                            posthog.capture("reaction_removed", { channelId: message.channelId, teamId })
                            removeReaction({ reactionId: existingReaction._id })
                          } else {
                            posthog.capture("reaction_added", { channelId: message.channelId, teamId })
                            addReaction({ messageId: message._id, content })
                          }
                        }}
                        className={cn(
                          "flex h-6 items-center justify-center rounded-full border bg-background px-1 py-0.5 font-normal text-xs",
                          reactions.some((r) => r.userId === user?._id)
                            ? "border-blue-500 hover:bg-blue-500/10"
                            : "hover:border-black dark:hover:border-white",
                        )}
                      >
                        <span>{content}</span>
                        <span className="min-w-4">{count}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[400px]">
                      {reactions.map((r) => r.user.name).join(", ")} reacted
                    </TooltipContent>
                  </Tooltip>
                ))}

                <WithState initialState={false}>
                  {(state, setState) => (
                    <Popover modal open={state} onOpenChange={setState}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex h-6 w-8 items-center justify-center rounded-full border bg-muted py-0.5 font-normal text-xs hover:border-black dark:hover:border-white"
                        >
                          <SmilePlusIcon className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-full p-0" backdrop="transparent">
                        <EmojiPicker
                          className="h-[340px]"
                          onEmojiSelect={({ emoji }) => {
                            if (!user) return
                            const existingReaction = message.reactions.find((r) => r.content === emoji && r.userId === user._id)
                            if (existingReaction) {
                              posthog.capture("reaction_removed", { channelId: message.channelId, teamId })
                              removeReaction({ reactionId: existingReaction._id })
                            } else {
                              posthog.capture("reaction_added", { channelId: message.channelId, teamId })
                              addReaction({ messageId: message._id, content: emoji })
                            }
                            setState(false)
                          }}
                        >
                          <EmojiPickerSearch />
                          <EmojiPickerContent />
                          <EmojiPickerFooter />
                        </EmojiPicker>
                      </PopoverContent>
                    </Popover>
                  )}
                </WithState>
              </div>
            )}
            {/* Thread Indicator */}
            {!isThreadMessage && "threadInfo" in message && message.threadInfo && message.threadInfo.replyCount > 0 && (
              <ThreadIndicator
                threadInfo={message.threadInfo}
                onOpenThread={() =>
                  setSearchParams((searchParams) => {
                    searchParams.set("threadId", message.threadInfo!.threadId)
                    return searchParams
                  })
                }
              />
            )}
          </>
        )}

        <div
          className={cn(
            "-top-4 absolute right-0 flex items-center gap-0 rounded-lg border bg-background p-1 shadow-xs transition-opacity duration-200",
            editMessageId === message._id
              ? "pointer-events-none opacity-0"
              : isMobile
                ? isToolbarVisible
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
                : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {message.author?._id === user?._id && (
            <>
              <Button size="icon" className="size-8" variant="ghost" onClick={() => setEditMessageId(message._id)}>
                <Edit2Icon className="size-3.5" />
              </Button>
              <Button
                size="icon"
                className="size-8"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this message?")) {
                    posthog.capture("message_deleted", { channelId: message.channelId, teamId })
                    remove({ messageId: message._id })
                  }
                }}
              >
                <TrashIcon className="size-3.5" />
              </Button>
              <div className="h-4 w-px bg-muted" />
            </>
          )}

          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" className="size-8" variant="ghost">
                <SmileIcon className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-full p-0" backdrop="transparent">
              <EmojiPicker
                className="h-[340px]"
                onEmojiSelect={({ emoji }) => {
                  if (!user) return
                  const existingReaction = message.reactions.find((r) => r.content === emoji && r.userId === user._id)
                  if (existingReaction) {
                    posthog.capture("reaction_removed", { channelId: message.channelId, teamId })
                    removeReaction({ reactionId: existingReaction._id })
                  } else {
                    posthog.capture("reaction_added", { channelId: message.channelId, teamId })
                    addReaction({ messageId: message._id, content: emoji })
                  }
                  setIsPopoverOpen(false)
                }}
              >
                <EmojiPickerSearch />
                <EmojiPickerContent />
                <EmojiPickerFooter />
              </EmojiPicker>
            </PopoverContent>
          </Popover>

          {!isThreadMessage && (
            <Button size="icon" className="size-8" variant="ghost" onClick={() => handleCreateThread(message._id)}>
              <MessageSquareTextIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

function MessageEditor({ message }: { message: MessageData }) {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const updateMessage = useMutation(api.messages.update).withOptimisticUpdate((localStore, args) => {
    if (message.threadId) {
      optimisticallyUpdateValueInPaginatedQuery(
        localStore,
        api.threads.listMessages,
        { threadId: message.threadId },
        (currentValue) => {
          if (message._id === currentValue._id) {
            return {
              ...currentValue,
              content: args.content,
            }
          }
          return currentValue
        },
      )
    } else {
      optimisticallyUpdateValueInPaginatedQuery(
        localStore,
        api.messages.list,
        { channelId: message.channelId },
        (currentValue) => {
          if (message._id === currentValue._id) {
            return {
              ...currentValue,
              content: args.content,
            }
          }
          return currentValue
        },
      )
    }
  })

  const [input, setInput] = useState(message.content || "")
  const setEditMessageId = useEditMessage((s) => s.setMessageId)

  const onClose = () => setEditMessageId(null)

  const formRef = useRef<HTMLFormElement>(null)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    formRef.current?.reset()
    onClose()
    posthog.capture("message_edited", { channelId: message.channelId, teamId })
    await updateMessage({ messageId: message._id, content: input })
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef} className="space-y-2 rounded-lg border bg-background p-2">
      <ExpandableTextarea
        placeholder="Edit message"
        onChangeValue={setInput}
        value={input}
        onEscape={onClose}
        onSubmitMobile={() => {
          formRef.current?.requestSubmit()
        }}
        defaultValue={message.content}
        rows={1}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" type="submit">
          Save
        </Button>
      </div>
    </form>
  )
}
