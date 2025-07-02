import { useMutation, useQuery } from "convex/react"
import dayjs from "dayjs"
import { ChevronDownIcon, Edit2Icon, MessageSquareTextIcon, SmileIcon, SmilePlusIcon, TrashIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { renderMessageContent } from "@/lib/marked"
import { DEFAULT_PAGINATION_NUM_ITEMS } from "@/lib/pagination"
import { useEditMessage } from "@/lib/use-edit-message"
import { cn } from "@/lib/utils"
import { ExpandableTextarea } from "./expandable-textarea"
import { FilePill } from "./file-pill"
import { ThreadIndicator } from "./thread-indicator"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { WithState } from "./with-state"

type MessageData =
  | (typeof api.messages.list._returnType)["page"][number]
  | (typeof api.threads.listMessages._returnType)["page"][number]

interface Props {
  message: MessageData
  isFirstMessageOfUser: boolean
  isParentMessage?: boolean
  isThreadMessage?: boolean
}

export function Message({ message, isFirstMessageOfUser, isParentMessage = false, isThreadMessage = false }: Props) {
  const user = useQuery(api.auth.loggedInUser)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const createThread = useMutation(api.threads.create)
  const [_, setSearchParams] = useSearchParams()

  const handleCreateThread = async (messageId: Id<"messages">) => {
    try {
      const threadId = await createThread({ parentMessageId: messageId })
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

  const addReaction = useMutation(api.reactions.add).withOptimisticUpdate((localStore, args) => {
    if (!user) return

    const optimisticReaction = {
      ...args,
      _id: crypto.randomUUID() as Id<"messageReactions">,
      _creationTime: Date.now(),
      userId: user._id,
      user,
    }

    // Update paginated query
    const paginatedValue = localStore.getQuery(api.messages.list, {
      channelId: message.channelId,
      paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null },
    })
    if (paginatedValue) {
      localStore.setQuery(
        api.messages.list,
        {
          channelId: message.channelId,
          paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null },
        },
        {
          ...paginatedValue,
          page: paginatedValue.page.map((m: any) =>
            m._id === message._id ? { ...m, reactions: [...m.reactions, optimisticReaction as any] } : m,
          ),
        },
      )
    }
  })
  const removeReaction = useMutation(api.reactions.remove).withOptimisticUpdate((localStore, args) => {
    // Update paginated query
    const paginatedValue = localStore.getQuery(api.messages.list, {
      channelId: message.channelId,
      paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null },
    })
    if (paginatedValue) {
      localStore.setQuery(
        api.messages.list,
        {
          channelId: message.channelId,
          paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null },
        },
        {
          ...paginatedValue,
          page: paginatedValue.page.map((m) =>
            m._id === message._id ? { ...m, reactions: m.reactions.filter((reaction) => reaction._id !== args.reactionId) } : m,
          ),
        },
      )
    }
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

  const deleteMessage = useMutation(api.messages.deleteMessage).withOptimisticUpdate((localStore) => {
    // Update paginated query
    const paginatedValue = localStore.getQuery(api.messages.list, {
      channelId: message.channelId,
      paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null },
    })
    if (paginatedValue) {
      localStore.setQuery(
        api.messages.list,
        {
          channelId: message.channelId,
          paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null },
        },
        {
          ...paginatedValue,
          page: paginatedValue.page.filter((m) => m._id !== message._id),
        },
      )
    }
  })

  return (
    <div
      key={message._id}
      className={cn("group flex gap-2 px-4 ", isParentMessage ? "py-4" : "py-1.5 hover:bg-muted/50 dark:hover:bg-muted/30")}
    >
      <div>
        {isFirstMessageOfUser && message.author ? (
          <Avatar className="size-9 flex-shrink-0 rounded-lg">
            <AvatarImage src={message.author.image || undefined} className="object-cover" />
            <AvatarFallback className="size-9 rounded-lg text-black dark:text-white">
              {message.author.name.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-9 flex-shrink-0" />
        )}
      </div>
      <div className="relative w-full">
        {isFirstMessageOfUser ? (
          <div className="flex gap-2 pb-1.5">
            <span className="font-semibold text-sm leading-4">{message.author?.name || "Unknown"}</span>
            <span className="text-xs leading-4 opacity-50">{dayjs(message._creationTime).format("DD/MM HH:mm")}</span>
          </div>
        ) : (
          <p className="-left-10 absolute top-0 hidden text-xs opacity-50 group-hover:block">
            {dayjs(message._creationTime).format("HH:mm")}
          </p>
        )}
        {editMessageId === message._id ? (
          <MessageEditor message={message} onClose={() => setEditMessageId(null)} />
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
                  "[&_code]:!py-2 [&_code]:!px-3 [&_code]:my-1 [&_code]:block [&_code]:rounded-md [&_code]:border [&_code]:bg-muted [&_code]:font-mono",
                  "[&_blockquote]:border-muted-foreground/20 [&_blockquote]:border-l-4 [&_blockquote]:pl-2",
                  message.temp && "opacity-70",
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
                          {message.files[0] ? message.files[0].name : `${message.files.length} files`}
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
                        <>
                          {message.files.length === 1 && <MessageFile file={message.files[0]!} />}
                          {message.files.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                              {message.files.map((file) => (
                                <MessageFile key={file._id} file={file} className="h-14 w-14" />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </WithState>
              </div>
            )}
            {Object.entries(groupedReactions).length > 0 && (
              <div className="flex items-center gap-1 pt-1">
                {Object.entries(groupedReactions).map(([content, { count, reactions }]) => (
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => {
                      if (!user) return
                      const existingReaction = message.reactions.find((r) => r.content === content && r.userId === user._id)
                      if (existingReaction) {
                        removeReaction({ reactionId: existingReaction._id })
                      } else {
                        addReaction({ messageId: message._id, content })
                      }
                    }}
                    key={content}
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
                              removeReaction({ reactionId: existingReaction._id })
                            } else {
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
            "-top-4 pointer-events-none absolute right-0 gap-0 rounded-lg border bg-background p-1 opacity-0 shadow-xs transition-opacity duration-200",
            editMessageId === message._id ? "" : "group-hover:pointer-events-auto group-hover:opacity-100",
          )}
        >
          {message.author?._id === user?._id && (
            <Button size="icon" className="size-8" variant="ghost" onClick={() => setEditMessageId(message._id)}>
              <Edit2Icon className="size-3.5" />
            </Button>
          )}
          {message.author?._id === user?._id && (
            <Button
              size="icon"
              className="size-8"
              variant="ghost"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this message?")) {
                  deleteMessage({ messageId: message._id })
                }
              }}
            >
              <TrashIcon className="size-3.5" />
            </Button>
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
                    removeReaction({ reactionId: existingReaction._id })
                  } else {
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
}

type MessageFileType = MessageData["files"][number]

function MessageFile({ file, className }: { file: MessageFileType; className?: string }) {
  const isImage = file.metadata?.contentType?.startsWith("image/") || file.url?.startsWith("blob:")
  return (
    <a
      href={file.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("flex shrink-0", isImage && "h-[200px]", className)}
    >
      {isImage ? (
        <img src={file.url || "#"} alt={file.name} className="h-full rounded-lg object-cover" />
      ) : (
        <div className="relative">
          <FilePill name={file.name} />
        </div>
      )}
    </a>
  )
}

function MessageEditor({ message, onClose }: { message: MessageData; onClose: () => void }) {
  const updateMessage = useMutation(api.messages.update).withOptimisticUpdate((localStore, args) => {
    if (message.threadId) {
      // Update thread messages (paginated query)
      const paginatedThreadMessages = localStore.getQuery(api.threads.listMessages, {
        threadId: message.threadId,
        paginationOpts: { numItems: 100, cursor: null },
      })
      if (paginatedThreadMessages) {
        localStore.setQuery(
          api.threads.listMessages,
          {
            threadId: message.threadId,
            paginationOpts: { numItems: 100, cursor: null },
          },
          {
            ...paginatedThreadMessages,
            page: paginatedThreadMessages.page.map((m) => (m._id === message._id ? { ...m, content: args.content } : m)),
          },
        )
      }
    } else {
      // Update channel messages (paginated query)
      const paginatedValue = localStore.getQuery(api.messages.list, {
        channelId: message.channelId,
        paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null },
      })
      if (paginatedValue) {
        localStore.setQuery(
          api.messages.list,
          { channelId: message.channelId, paginationOpts: { numItems: DEFAULT_PAGINATION_NUM_ITEMS, cursor: null } },
          {
            ...paginatedValue,
            page: paginatedValue.page.map((m) => (m._id === message._id ? { ...m, content: args.content } : m)),
          },
        )
      }
    }
  })

  const [input, setInput] = useState(message.content || "")

  const handleSubmit = async () => {
    await updateMessage({ messageId: message._id, content: input })
    onClose()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <div className="space-y-2 rounded-lg border bg-background p-2">
      <ExpandableTextarea
        placeholder="Edit message"
        onChange={(event) => setInput(event.target.value)}
        defaultValue={message.content}
        rows={1}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            handleSubmit()
          }
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          Save
        </Button>
      </div>
    </div>
  )
}
