import { useQuery } from "convex/react"
import { FileIcon, PlusIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useRecentChannels } from "@/lib/use-recent-channels"
import { NewChannelForm } from "./new-channel"
import { Avatar } from "./ui/avatar"
import { Button } from "./ui/button"
import { CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { WithState } from "./with-state"

export function CommandCenter() {
  const navigate = useNavigate()
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const channels = useQuery(api.channels.list, teamId ? { teamId } : "skip") || []
  const [search, setSearch] = useState("")
  const recentChannelIds = useRecentChannels((s) => s.channels)
  const [open, setOpen] = useState(false)

  const files = useQuery(api.files.search, search ? { query: search } : "skip")

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const recentChannels = recentChannelIds.map((id) => channels.find((c) => c._id === id)).filter(Boolean)
  // switch first and second from recentChannels
  if (recentChannels[1]) {
    const secondItem = recentChannels[1]
    recentChannels[1] = recentChannels[0]!
    recentChannels[0] = secondItem
  }
  const otherChannels = channels.filter((c) => !recentChannelIds.find((id) => id === c._id))
  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Channels, people, files..." value={search} onValueChange={setSearch} />
        <CommandList className="py-2">
          <CommandGroup heading="Channels">
            {[...recentChannels, ...otherChannels].map((channel) => (
              <CommandItem
                key={channel._id}
                onSelect={async () => {
                  setTimeout(() => {
                    setOpen(false)
                  }, 100)
                  navigate(`/${channel.teamId}/${channel._id}`)
                }}
              >
                {channel.dmUser ? (
                  <>
                    <Avatar image={channel.dmUser.image} name={channel.dmUser.name} className="size-5 rounded" />
                    <p>{channel.dmUser.name}</p>
                  </>
                ) : (
                  <>
                    <p className="w-5 text-center">#</p>
                    <p>{channel.name.toLowerCase()}</p>
                  </>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
          <WithState initialState={false}>
            {(state, setState) => (
              <CommandGroup heading="Actions">
                <Popover open={state} onOpenChange={setState}>
                  <PopoverTrigger asChild>
                    <CommandItem onSelect={() => setState(true)}>
                      <PlusIcon className="size-4" />
                      New channel
                    </CommandItem>
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <NewChannelForm
                      onClose={() => {
                        setState(false)
                        setOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <CommandItem onSelect={() => navigate("/create-team")}>
                  <PlusIcon className="size-4" />
                  New team
                </CommandItem>
              </CommandGroup>
            )}
          </WithState>
          <div className="px-2">
            {files && files?.length > 0 && <p className="pt-2 pb-1 pl-2 font-medium text-muted-foreground text-xs">Files</p>}
            {files?.map((file) => (
              <Button
                variant="ghost"
                className="h-11 w-full justify-start rounded-sm pl-2 font-normal"
                key={file._id}
                onClick={() => {
                  if (!file.url) return
                  window.open(file.url, "_blank")
                }}
              >
                <div className="flex w-5 items-center justify-center">
                  <FileIcon className="size-4" />
                </div>
                <p className="truncate">{file.name}</p>
              </Button>
            ))}
          </div>
        </CommandList>
      </CommandDialog>
    </>
  )
}
