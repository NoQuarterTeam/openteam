import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useQuery, useQueryClient, useMutation as useTanstackMutation } from "@tanstack/react-query"
import { useQuery as useConvexQuery } from "convex/react"
import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { redirect, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Message } from "@/components/message"
import { MessageInput } from "@/components/message-input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

export default function Component() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)

  const currentChannel = useConvexQuery(api.channels.get, { channelId: channelId! })

  const { data: messages } = useQuery(convexQuery(api.messages.list, { channelId: channelId! }))

  const handleScroll = () => {
    if (!messagesContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10 // 10px threshold

    setIsUserScrolledUp(!isAtBottom)
  }

  useEffect(() => {
    if (messagesEndRef.current && !isUserScrolledUp) {
      messagesEndRef.current.scrollIntoView()
    }
  }, [messages?.length, isUserScrolledUp])

  if (currentChannel === null) return redirect("/")
  if (!currentChannel) return null
  return (
    <div className="flex flex-1 p-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
        <ChannelHeader key={currentChannel._id} channel={currentChannel} />

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-2" onScroll={handleScroll}>
          {messages?.map((message, index) => {
            const isFirstMessageOfUser =
              index === 0 ||
              messages[index - 1]?.authorId !== message.authorId ||
              (messages[index - 1] &&
                new Date(message._creationTime).getTime() - new Date(messages[index - 1]._creationTime).getTime() >
                  10 * 60 * 1000)

            return <Message key={message._id} message={message} isFirstMessageOfUser={isFirstMessageOfUser} />
          })}
          <div ref={messagesEndRef} />
        </div>

        <MessageInput currentChannel={currentChannel} />
      </div>
    </div>
  )
}

type Channel = Doc<"channels"> & { dmUser: Doc<"users"> | null }

function ChannelHeader({ channel }: { channel: Channel }) {
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
    <div className="flex items-center justify-between gap-2 border-b py-2 pr-2 pl-2">
      {channel.dmUser ? (
        <div className="flex items-center gap-2">
          <Avatar className="size-8 flex-shrink-0 rounded-lg">
            <AvatarImage src={channel.dmUser.image || undefined} />
            <AvatarFallback className="size-8 rounded-lg text-black dark:text-white">
              {channel.dmUser.name.charAt(0) || "U"}
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
