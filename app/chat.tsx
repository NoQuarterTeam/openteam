import { useMutation, useQuery } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { ProfileModal } from "./ProfileModal"
import { SignOutButton } from "./sign-out-button"

export function ChatApp() {
  const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [showProfile, setShowProfile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const channels = useQuery(api.channels.list)
  const messages = useQuery(api.messages.list, selectedChannelId ? { channelId: selectedChannelId } : "skip")
  const searchResults = useQuery(
    api.messages.search,
    searchQuery.trim()
      ? {
          query: searchQuery,
          channelId: selectedChannelId || undefined,
        }
      : "skip",
  )
  const currentChannel = useQuery(api.channels.get, selectedChannelId ? { channelId: selectedChannelId } : "skip")
  const profile = useQuery(api.profiles.get)
  const user = useQuery(api.auth.loggedInUser)

  const createChannel = useMutation(api.channels.create)
  const sendMessage = useMutation(api.messages.send)

  // Auto-select first channel
  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0]._id)
    }
  }, [channels, selectedChannelId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !showSearchResults) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, showSearchResults])

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return

    try {
      const channelId = await createChannel({ name: newChannelName.trim() })
      setSelectedChannelId(channelId)
      setNewChannelName("")
      setShowCreateChannel(false)
      toast.success("Channel created!")
    } catch {
      toast.error("Failed to create channel")
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChannelId) return

    try {
      await sendMessage({
        channelId: selectedChannelId,
        content: newMessage.trim(),
      })
      setNewMessage("")
    } catch {
      toast.error("Failed to send message")
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setShowSearchResults(query.trim().length > 0)
  }

  const displayName = profile?.name || user?.name || user?.email || "User"

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-xl">OpenTeam</h1>
        </div>

        {/* Search Bar */}
        <div className="mx-8 max-w-md flex-1">
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => setShowProfile(true)} variant="ghost">
            {displayName}
          </Button>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex w-64 flex-col bg-gray-100">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Channels</h2>
              <Button type="button" onClick={() => setShowCreateChannel(true)} size="icon" title="Create channel">
                +
              </Button>
            </div>

            {showCreateChannel && (
              <form onSubmit={handleCreateChannel} className="mb-4">
                <Input
                  type="text"
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <Button type="submit" size="sm">
                    Create
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreateChannel(false)
                      setNewChannelName("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="flex-1 flex-col gap-2 overflow-y-auto p-4">
            {channels?.map((channel) => (
              <Button
                type="button"
                className="w-full justify-start text-left"
                key={channel._id}
                onClick={() => {
                  setSelectedChannelId(channel._id)
                  setShowSearchResults(false)
                  setSearchQuery("")
                }}
                variant={selectedChannelId === channel._id ? "default" : "ghost"}
              >
                # {channel.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Messages Area */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {showSearchResults ? (
              // Search Results
              <div>
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
                          <span className="font-semibold text-gray-600 text-sm">
                            {message.author.name.charAt(0).toUpperCase()}
                          </span>
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
            ) : (
              // Regular Messages
              <>
                {messages?.map((message) => (
                  <div key={message._id} className="flex gap-3">
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
                        <span className="text-gray-500 text-xs">{new Date(message._creationTime).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-800">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          {selectedChannelId && !showSearchResults && (
            <div className="border-t bg-white p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  type="text"
                  placeholder={`Message #${currentChannel?.name || "channel"}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  Send
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  )
}
