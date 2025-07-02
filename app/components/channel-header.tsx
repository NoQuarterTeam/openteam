import { useMutation } from "convex/react"
import { BellIcon, BellOffIcon, EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Input } from "./ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

type ChannelData = NonNullable<typeof api.channels.get._returnType>

export function ChannelHeader({ channel }: { channel: ChannelData }) {
  const [isEditing, setIsEditing] = useState(false)
  const navigate = useNavigate()

  const archiveChannel = useMutation(api.channels.update)
  const updateChannel = useMutation(api.channels.update)
  const toggleMute = useMutation(api.channels.toggleMute).withOptimisticUpdate((localStore, args) => {
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
    localStore.setQuery(api.channels.get, { channelId: args.channelId }, { ...channelStore, isMuted: !channelStore.isMuted })
  })

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channel) return

    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string | undefined
    if (!name?.trim()) return

    try {
      await updateChannel({ channelId: channel._id, name: name.toLowerCase() })
      setIsEditing(false)
    } catch (e) {
      console.error(e)
      toast.error("Failed to save channel")
    }
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
          Save
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
              onClick={async () => {
                if (!channel) return
                if (confirm("Are you sure you want to archive this channel?")) {
                  try {
                    await archiveChannel({ channelId: channel._id, archivedTime: new Date().toISOString() })
                    navigate("/")
                  } catch (e) {
                    console.error(e)
                    toast.error("Failed to archive channel")
                  }
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
