import { useMutation, useQuery } from "convex/react"
import dayjs from "dayjs"
import { ChevronDownIcon, Edit2Icon, SmileIcon, SmilePlusIcon, TrashIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from "@/components/ui/emoji-picker"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { ExpandableTextarea } from "./expandable-textarea"
import { FilePill } from "./file-pill"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { WithState } from "./with-state"

type MessageData = (typeof api.messages.list._returnType)[number]

interface Props {
  message: MessageData
  isFirstMessageOfUser: boolean
}

export function Message({ message, isFirstMessageOfUser }: Props) {
  const user = useQuery(api.auth.loggedInUser)
  const [isMessageHovered, setIsMessageHovered] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const addReaction = useMutation(api.reactions.add).withOptimisticUpdate((localStore, args) => {
    if (!user) return
    const currentValue = localStore.getQuery(api.messages.list, { channelId: message.channelId })
    if (currentValue) {
      localStore.setQuery(
        api.messages.list,
        { channelId: message.channelId },
        currentValue.map((m) =>
          m._id === message._id
            ? {
                ...m,
                reactions: [
                  ...m.reactions,
                  {
                    ...args,
                    _id: crypto.randomUUID() as Id<"messageReactions">,
                    _creationTime: Date.now(),
                    userId: user._id,
                    user,
                  },
                ],
              }
            : m,
        ),
      )
    }
  })
  const removeReaction = useMutation(api.reactions.remove).withOptimisticUpdate((localStore, args) => {
    const currentValue = localStore.getQuery(api.messages.list, { channelId: message.channelId })
    if (currentValue) {
      localStore.setQuery(
        api.messages.list,
        { channelId: message.channelId },
        currentValue.map((m) =>
          m._id === message._id ? { ...m, reactions: m.reactions.filter((reaction) => reaction._id !== args.reactionId) } : m,
        ),
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
    const currentValue = localStore.getQuery(api.messages.list, { channelId: message.channelId })
    if (currentValue) {
      localStore.setQuery(
        api.messages.list,
        { channelId: message.channelId },
        currentValue.filter((m) => m._id !== message._id),
      )
    }
  })

  return (
    <div
      key={message._id}
      className="group flex gap-2 px-4 py-1.5 hover:bg-muted/50 dark:hover:bg-muted/10"
      onMouseEnter={() => {
        if (!isEditing) setIsMessageHovered(true)
      }}
      onMouseLeave={() => {
        if (!isPopoverOpen) setIsMessageHovered(false)
      }}
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
      <div className="relative h-min flex-1">
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
        {!isEditing && message.content && (
          <p
            className={cn(
              "wrap-break-word -my-[6px] whitespace-pre-line font-normal text-sm leading-7",
              message.temp && "opacity-70",
            )}
            dangerouslySetInnerHTML={{ __html: message.content.replace(/\n{2,}/g, "\n") }}
          />
        )}
        {isEditing && <MessageEditor message={message} onClose={() => setIsEditing(false)} />}
        {!isEditing && message.files && message.files.length > 0 && (
          <div>
            <WithState initialState={true}>
              {(state, setState) => (
                <>
                  <div className="flex items-center gap-0.5 py-1">
                    <p className="text-xs opacity-50">
                      {message.files[0] ? message.files[0].name : `${message.files.length} files`}
                    </p>
                    <Button variant="ghost" size="icon" className="size-4 rounded-sm" onClick={() => setState(!state)}>
                      <ChevronDownIcon className="size-3.5 opacity-50" />
                    </Button>
                  </div>
                  {state && (
                    <div className="flex flex-wrap gap-2">
                      {message.files[0] && <MessageFile file={message.files[0]} />}
                      {message.files.length > 1 &&
                        message.files.map((file) => <MessageFile key={file._id} file={file} className="h-14 w-14" />)}
                    </div>
                  )}
                </>
              )}
            </WithState>
          </div>
        )}

        {!isEditing && Object.entries(groupedReactions).length > 0 && (
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
                      className="h-[342px]"
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
        <div
          className={cn(
            "-top-4 absolute right-0 gap-0 rounded-lg border bg-background p-1 shadow-xs transition-opacity duration-200",
            isMessageHovered ? "flex" : "hidden",
          )}
        >
          <Popover modal open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" className="size-8" variant="ghost">
                <SmileIcon className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-full p-0" backdrop="transparent">
              <EmojiPicker
                className="h-[342px]"
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

          {message.author?._id === user?._id && (
            <Button
              size="icon"
              className="size-8"
              variant="ghost"
              onClick={() => {
                setIsEditing(true)
                setIsMessageHovered(false)
              }}
            >
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
              <TrashIcon className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

type MessageFileType = MessageData["files"][number]

function MessageFile({ file, className }: { file: MessageFileType; className?: string }) {
  return (
    <a href={file.url || "#"} target="_blank" rel="noopener noreferrer" className={cn("flex max-w-md shrink-0", className)}>
      {file.metadata?.contentType?.startsWith("image/") || file.url?.startsWith("blob:") ? (
        <div className="relative">
          <img
            src={file.url || "#"}
            alt={file.name}
            className="h-full w-full rounded-lg bg-neutral-50 object-cover dark:bg-neutral-700"
          />
        </div>
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
    const currentValue = localStore.getQuery(api.messages.list, { channelId: message.channelId })
    if (currentValue) {
      localStore.setQuery(
        api.messages.list,
        { channelId: message.channelId },
        currentValue.map((m) => (m._id === message._id ? { ...m, content: args.content } : m)),
      )
    }
  })

  const [input, setInput] = useState(message.content || "")

  const handleSubmit = () => {
    void updateMessage({ messageId: message._id, content: input })
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
