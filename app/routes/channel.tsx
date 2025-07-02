import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useQuery, useQueryClient, useMutation as useTanstackMutation } from "@tanstack/react-query"
import { useMutation } from "convex/react"
import { BellIcon, BellOffIcon, EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { redirect, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Message } from "@/components/message"
import { MessageInput } from "@/components/message-input"
import { ThreadSidebar } from "@/components/thread-sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useRecentChannels } from "@/lib/use-recent-channels"
import { useThreadStore } from "@/lib/use-thread-store"
import { cn } from "@/lib/utils"

export default function Component() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const [isUserScrolledTowardOlder, setIsUserScrolledTowardOlder] = useState(false)
  const addChannel = useRecentChannels((s) => s.addChannel)
  const { currentThreadId, isOpen, closeThread } = useThreadStore()

  const { data: currentChannel } = useQuery(convexQuery(api.channels.get, { channelId: channelId! }))

  // For now, use the original list query until we implement full pagination
  const { data: messages } = useQuery(convexQuery(api.messages.list, { channelId: channelId! }))

  // TODO: Implement intersection observer for pagination when ready

  const handleScroll = () => {
    if (!messagesContainerRef.current) return

    const { scrollTop } = messagesContainerRef.current
    
    const isScrolledTowardOlder = scrollTop > 100
    
    setIsUserScrolledTowardOlder(isScrolledTowardOlder)
  }

  const markAsRead = useMutation(api.channels.markAsRead)

  useEffect(() => {
    if (isUserScrolledTowardOlder) return
    
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0
    }
  }, [messages?.length, isUserScrolledTowardOlder])

  useEffect(() => {
    if (!channelId) return
    closeThread()
    addChannel(channelId)
    void markAsRead({ channelId })
  }, [channelId])

  if (currentChannel === null) return redirect("/")
  if (!currentChannel) return null
  
  return (
    <div className="flex flex-1 p-4">
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-xs transition-all",
          isOpen ? "mr-2" : "",
        )}
      >
        <ChannelHeader key={currentChannel._id} channel={currentChannel} />

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-none py-2" onScroll={handleScroll}>
          <div className="flex min-h-[500px] flex-col-reverse">
            <div ref={topSentinelRef} className="h-1" />
            
            {/* TODO: Add loading indicator for pagination */}
            
            {messages?.map((message, index) => {
              const isFirstMessageOfUser =
                index === 0 ||
                messages[index - 1]?.authorId !== message.authorId ||
                (!!messages[index - 1] &&
                  new Date(message._creationTime).getTime() - new Date(messages[index - 1]!._creationTime).getTime() >
                    10 * 60 * 1000)
              return <Message key={message._id} message={message} isFirstMessageOfUser={isFirstMessageOfUser} />
            })}
          </div>
        </div>

        <MessageInput channelId={channelId!} isDisabled={!!currentChannel.archivedTime} />
      </div>

      {isOpen && currentThreadId && (
        <div className="w-96 flex-shrink-0">
          <ThreadSidebar threadId={currentThreadId} onClose={closeThread} />
        </div>
      )}
    </div>
  )
}

type ChannelData = NonNullable<typeof api.channels.get._returnType>

function ChannelHeader({ channel }: { channel: ChannelData }) {
  const [isEditing, setIsEditing] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const archiveChannel = useTanstackMutation({
    mutationFn: useConvexMutation(api.channels.update),
    onSuccess: () => {
      navigate("/")
      queryClient.invalidateQueries(convexQuery(api.channels.list, {}))
    },
    onError: (e) => {
      console.error(e)
      toast.error("Failed to archive channel")
    },
  })

  const updateChannel = useTanstackMutation({
    mutationFn: useConvexMutation(api.channels.update),
    onSuccess: () => {
      setIsEditing(false)
    },
    onError: (e) => {
      console.error(e)
      toast.error("Failed to save channel")
    },
  })

  const toggleMute = useConvexMutation(api.channels.toggleMute).withOptimisticUpdate((localStore, args) => {
    const currentValue = localStore.getQuery(api.channels.list, {})
    if (currentValue) {
      localStore.setQuery(
        api.channels.list,
        {},
        currentValue.map((c) => (c._id === args.channelId ? { ...c, isMuted: !c.isMuted } : c)),
      )
    }
    const channelStore = localStore.getQuery(api.channels.get, { channelId: args.channelId })
    if (!channelStore) return null
    localStore.setQuery(api.channels.get, { channelId: args.channelId }, { ...channel, isMuted: !channel.isMuted })
  })

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channel) return

    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string | undefined
    if (!name?.trim()) return
    updateChannel.mutate({ channelId: channel._id, name: name.toLowerCase() })
  }
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 250)
    }
  }, [isEditing])
  return (
    <div className="flex h-13 items-center justify-between gap-2 border-b px-2">
      <div className="flex items-center gap-2">
        {channel.dmUser ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-8 flex-shrink-0 rounded-lg">
              <AvatarImage src={channel.dmUser.image || undefined} className="object-cover" />
              <AvatarFallback className="size-8 rounded-lg text-black dark:text-white">
                {channel.dmUser.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className={cn("font-medium text-lg", isEditing && "hidden")}>{channel.dmUser.name}</p>
          </div>
        ) : (
          <div className={cn("flex items-center gap-2 pl-2 font-medium text-lg", isEditing && "hidden")}>
            <p>#</p>
            <p>
              {channel.name.toLowerCase()} {channel.archivedTime && "(Archived)"}
            </p>
          </div>
        )}
        {channel.isMuted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => void toggleMute({ channelId: channel._id })}>
                <BellOffIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Muted</TooltipContent>
          </Tooltip>
        )}
      </div>
      <form onSubmit={handleSaveChannel} className={cn("flex items-center gap-2", isEditing ? "flex" : "hidden")}>
        <Input name="name" ref={inputRef} defaultValue={channel.name || ""} />
        <Button type="submit" className="w-20">
          {updateChannel.isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" className="w-20" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      </form>

      {!channel.dmUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!!channel?.archivedTime}>
            <Button variant="ghost" size="icon">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void toggleMute({ channelId: channel._id })}>
              <BellIcon />
              {channel.isMuted ? "Unmute" : "Mute"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!channel) return
                if (confirm("Are you sure you want to archive this channel?")) {
                  archiveChannel.mutate({ channelId: channel._id, archivedTime: new Date().toISOString() })
                }
              }}
            >
              <Trash2Icon />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
