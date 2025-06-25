import { useQuery } from "convex/react"
import { useState } from "react"
import { Outlet, useParams } from "react-router"
import { Sidebar } from "@/components/sidebar"
import { SignOutButton } from "@/components/sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export default function Component() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()

  const user = useQuery(api.auth.loggedInUser)
  const displayName = user?.name || user?.email || "User"

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

  if (!user) return null
  return (
    <div className="flex h-screen flex-col bg-gray-50/50">
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
              <Button variant="ghost" className="pl-2">
                <Avatar className="size-6">
                  <AvatarImage src={user?.image} />
                  <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                {displayName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOutButton />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex w-full flex-1 overflow-hidden">
        <Sidebar />

        <Outlet />

        {showSearchResults && (
          <div className="fixed inset-20 z-50 overflow-hidden rounded-xl bg-background p-4 shadow-xl">
            <h3 className="mb-4 font-semibold text-gray-700 text-lg">Search Results for "{searchQuery}"</h3>
            {searchResults?.length === 0 ? (
              <p className="text-gray-500">No messages found.</p>
            ) : (
              searchResults?.map((message) => (
                <div key={message._id} className="flex gap-3 rounded-lg bg-yellow-50 p-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-300">
                    {message.author.avatarUrl ? (
                      <img
                        src={message.author.avatarUrl}
                        alt={message.author.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-semibold text-gray-600 text-sm">{message.author.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{message.author.name}</span>
                      <span className="text-gray-500 text-xs">in #{message.channelName}</span>
                      <span className="text-gray-500 text-xs">{new Date(message._creationTime).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-800">{message.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />} */}
    </div>
  )
}
