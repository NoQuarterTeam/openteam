import { useQuery } from "convex/react"
import { useEffect, useState } from "react"
import { Outlet, useNavigate, useParams } from "react-router"
import { ProfileModal } from "@/components/profile-modal"
import { Sidebar } from "@/components/sidebar"
import { SignOutButton } from "@/components/sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export default function Component() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()
  const navigate = useNavigate()
  const channels = useQuery(api.channels.list)
  const users = useQuery(api.users.list)
  const user = useQuery(api.auth.loggedInUser)
  const displayName = user?.name || user?.email

  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)

  const searchResults = useQuery(
    api.messages.search,
    searchQuery.trim() ? { query: searchQuery, channelId: channelId || undefined } : "skip",
  )
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setShowSearchResults(query.trim().length > 0)
  }

  const [open, setOpen] = useState(false)

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

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2 ">
          <h1 className="font-bold text-xl">OpenTeam</h1>
        </div>
        <div className="w-full max-w-2xl">
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            className="w-full"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback>{displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="pl-2">
                <p className="text-xs">{displayName}</p>
              </div>
              <DropdownMenuSeparator />
              <ProfileModal />
              <DropdownMenuSeparator />
              <SignOutButton />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex w-full flex-1 overflow-hidden">
        <Sidebar />

        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Channels, people, files..." />
          <CommandList className="py-2">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Channels">
              {channels?.map((channel) => (
                <CommandItem
                  key={channel._id}
                  onSelect={() => {
                    navigate(`/${channel._id}`)
                    setOpen(false)
                  }}
                >
                  # {channel.name.toLowerCase()}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="People">
              {users?.map((user) => (
                <CommandItem key={user._id}>{user.name}</CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        <Outlet />

        {showSearchResults && (
          <div className="fixed inset-20 z-50 overflow-hidden rounded-xl bg-background p-4 shadow-xl">
            <h3 className="mb-4 font-semibold text-lg text-neutral-700">Search Results for "{searchQuery}"</h3>
            {searchResults?.length === 0 ? (
              <p className="opacity-60">No messages found.</p>
            ) : (
              searchResults?.map((message) => (
                <div key={message._id} className="flex gap-3 rounded-lg bg-yellow-50 p-3">
                  <Avatar className="size-10 flex-shrink-0">
                    <AvatarImage src={message.author?.image || undefined} />
                    <AvatarFallback>{message.author?.name.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">{message.author?.name || "Unknown"}</span>
                      <span className="text-xs opacity-60">in #{message.channelName}</span>
                      <span className="text-xs opacity-60">{new Date(message._creationTime).toLocaleString()}</span>
                    </div>
                    <p className="text-neutral-800">{message.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
