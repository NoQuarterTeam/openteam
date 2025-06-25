import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { useMutation } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { redirect, useParams } from "react-router"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

export default function Component() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()

  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: user } = useQuery(convexQuery(api.auth.loggedInUser, {}))
  const { data: currentChannel } = useQuery(convexQuery(api.channels.get, { channelId: channelId! }))
  const { data: messages } = useQuery(convexQuery(api.messages.list, { channelId: channelId! }))

  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate((localStore, args) => {
    const { channelId, content } = args
    if (!user) return
    const currentValue = localStore.getQuery(api.messages.list, { channelId })
    if (currentValue) {
      localStore.setQuery(api.messages.list, { channelId }, [
        ...(currentValue || []),
        {
          _id: crypto.randomUUID() as Id<"messages">,
          authorId: user._id,
          content,
          author: user,
          channelId,
          _creationTime: Date.now(),
          temp: true,
        },
      ])
    }
  })

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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2">
          {messages?.map((message, index) => {
            const isFirstMessageOfUser = index === 0 || messages[index - 1]?.authorId !== message.authorId

            return (
              <div key={message._id} className="flex gap-2 px-4 py-1.5 hover:bg-muted/50">
                <div className="pt-0">
                  {isFirstMessageOfUser && message.author ? (
                    <Avatar className="size-9 flex-shrink-0 rounded-lg">
                      <AvatarImage src={message.author.image || undefined} />
                      <AvatarFallback>{message.author.name.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-9 flex-shrink-0" />
                  )}
                </div>
                <div className="h-min flex-1">
                  {isFirstMessageOfUser ? (
                    <div className="flex items-center gap-2">
                      <span className="pb-1 font-semibold text-sm leading-3">{message.author?.name || "Unknown"}</span>
                      <span className="text-xs opacity-50">{new Date(message._creationTime).toLocaleTimeString()}</span>
                    </div>
                  ) : null}
                  <p className={cn("font-normal text-sm", message.temp && "opacity-70")}>{message.content}</p>
                </div>
              </div>
            )
          })}
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
