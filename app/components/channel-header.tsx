import { useMutation } from "convex/react"
import { BellIcon, BellOffIcon, EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import posthog from "posthog-js"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { Avatar } from "./ui/avatar"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Input } from "./ui/input"
import { SidebarTrigger } from "./ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

type ChannelData = NonNullable<typeof api.channels.get._returnType>

export function ChannelHeader({ channel }: { channel: ChannelData }) {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const [isEditing, setIsEditing] = useState(false)
  const navigate = useNavigate()

  const archiveChannel = useMutation(api.channels.update)
  const updateChannel = useMutation(api.channels.update)
  const toggleMute = useMutation(api.channels.toggleMute).withOptimisticUpdate((localStore, args) => {
    if (!teamId) return
    const currentValue = localStore.getQuery(api.channels.list, { teamId })
    if (currentValue) {
      localStore.setQuery(
        api.channels.list,
        { teamId },
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
      posthog.capture("channel_name_updated", { channelId: channel._id, teamId })
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
      requestAnimationFrame(() => {
        inputRef.current?.select()
      })
    }
  }, [isEditing])
  return (
    <div className="flex h-13 items-center justify-between gap-2 border-b px-2">
      <div className="flex items-center gap-1">
        <div className="flex w-13 items-center justify-center overflow-hidden border-r pr-1">
          <SidebarTrigger />
        </div>
        {isEditing ? (
          <form onSubmit={handleSaveChannel} className={cn("flex items-center gap-1", isEditing ? "flex" : "hidden")}>
            <Input
              name="name"
              ref={inputRef}
              defaultValue={channel.name || ""}
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsEditing(false)
                  e.preventDefault()
                }
              }}
            />
            <Button type="submit" className="h-9 md:w-20">
              Save
            </Button>
            <Button type="button" variant="outline" className="h-9 md:w-20" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <>
            {channel.dmUser ? (
              <div className="flex items-center gap-2 pl-2">
                <Avatar image={channel.dmUser.image} name={channel.dmUser.name} className="size-8 flex-shrink-0 rounded-md" />
                <p className="font-medium text-lg">{channel.dmUser.name}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 font-medium text-lg">
                <p>#</p>
                <p>
                  {channel.name.toLowerCase()} {channel.archivedTime && "(Archived)"}
                </p>
              </div>
            )}
            {channel.isMuted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 md:size-8"
                    onClick={() => {
                      posthog.capture("channel_unmuted", { channelId: channel._id, teamId })
                      void toggleMute({ channelId: channel._id })
                    }}
                  >
                    <BellOffIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Muted</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!!channel?.archivedTime}>
          <Button variant="ghost" size="icon" className="size-7 md:size-8">
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuItem
            onClick={() => {
              posthog.capture(channel.isMuted ? "channel_unmuted" : "channel_muted", { channelId: channel._id, teamId })
              void toggleMute({ channelId: channel._id })
            }}
          >
            <BellIcon />
            {channel.isMuted ? "Unmute" : "Mute"}
          </DropdownMenuItem>
          {!channel.dmUser && (
            <>
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  if (!channel) return
                  if (confirm("Are you sure you want to archive this channel?")) {
                    try {
                      posthog.capture("channel_archived", { channelId: channel._id, teamId })
                      navigate(`/${teamId}`)
                      await archiveChannel({ channelId: channel._id, archivedTime: new Date().toISOString() })
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
