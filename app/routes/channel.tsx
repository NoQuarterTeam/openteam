import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { useMutation } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { redirect, useParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export default function Component() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()

  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: currentChannel } = useQuery(convexQuery(api.channels.get, { channelId: channelId! }))
  const { data: messages } = useQuery(convexQuery(api.messages.list, { channelId: channelId! }))

  const sendMessage = useMutation(api.messages.send)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !channelId) return
    try {
      void sendMessage({ channelId, content: newMessage.trim() })
      setNewMessage("")
    } catch {
      toast.error("Failed to send message")
    }
  }

  if (currentChannel === null) return redirect("/")

  return (
    <div className="flex flex-1 p-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
        <div className="border-b p-4 py-2 font-medium text-lg"># {currentChannel?.name.toLowerCase()}</div>

        {/* Messages Area */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages?.map((message) => (
            <div key={message._id} className="flex gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-300">
                {message.author.avatarUrl ? (
                  <img src={message.author.avatarUrl} alt={message.author.name} className="h-10 w-10 rounded-full object-cover" />
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
        </div>

        {/* Message Input */}

        <div className="border-t bg-background p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              disabled={!currentChannel}
              type="text"
              placeholder={`Message`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
