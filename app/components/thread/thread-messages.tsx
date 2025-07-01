import { Message } from "@/components/message"
import type { api } from "@/convex/_generated/api"

type ThreadMessage = (typeof api.threads.listMessages._returnType)[number]

interface ThreadMessagesProps {
  messages: ThreadMessage[]
}

export function ThreadMessages({ messages }: ThreadMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p className="mb-1 font-medium">No replies yet</p>
          <p className="text-sm">Be the first to reply to this thread!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2">
      {messages.map((message, index) => {
        const isFirstMessageOfUser = 
          index === 0 || 
          messages[index - 1]?.authorId !== message.authorId ||
          (new Date(message._creationTime).getTime() - 
           new Date(messages[index - 1]!._creationTime).getTime() > 10 * 60 * 1000)
        
        return (
          <Message
            key={message._id}
            message={message}
            isFirstMessageOfUser={isFirstMessageOfUser}
            isThreadMessage={true}
          />
        )
      })}
    </div>
  )
}