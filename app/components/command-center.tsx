import { useQuery } from "convex/react"
import { FileIcon, SearchIcon } from "lucide-react"
import * as React from "react"
import { useNavigate } from "react-router"
import { api } from "@/convex/_generated/api"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

export function CommandCenter() {
  const navigate = useNavigate()
  const channels = useQuery(api.channels.list)
  const [search, setSearch] = React.useState("")

  const [open, setOpen] = React.useState(false)

  const files = useQuery(api.uploads.search, search ? { query: search } : "skip")

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" className="h-8 w-full font-normal" onClick={() => setOpen(true)}>
            <SearchIcon className="size-3.5" />
            Find
          </Button>
        </TooltipTrigger>
        <TooltipContent className="!py-0 px-2.5">
          <div className="flex items-center gap-1">
            <kbd className="text-lg">⌘</kbd>
            <kbd className="text-sm">K</kbd>
          </div>
        </TooltipContent>
      </Tooltip>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Channels, people, files..." value={search} onValueChange={setSearch} />
        <CommandList className="py-2">
          <CommandGroup heading="Channels">
            {channels?.map((channel) => (
              <CommandItem
                key={channel._id}
                onSelect={async () => {
                  setTimeout(() => {
                    setOpen(false)
                  }, 100)
                  navigate(`/${channel._id}`)
                }}
              >
                {channel.dmUser ? (
                  <>
                    <Avatar className="size-5 rounded">
                      <AvatarImage src={channel.dmUser.image || undefined} />
                      <AvatarFallback className="size-5 rounded text-black text-xs dark:text-white">
                        {channel.dmUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
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
