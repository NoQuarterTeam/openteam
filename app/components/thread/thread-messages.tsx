import { Message } from "@/components/message"
import type { api } from "@/convex/_generated/api"

type ThreadMessage = (typeof api.threads.listMessages._returnType)[number]

interface ThreadMessagesProps {
  messages: ThreadMessage[]
}

export function ThreadMessages({ messages }: ThreadMessagesProps) {
  return (
    <div>
      {messages.map((message, index) => {
        const isFirstMessageOfUser =
          index === 0 ||
          messages[index - 1]?.authorId !== message.authorId ||
          new Date(message._creationTime).getTime() - new Date(messages[index - 1]!._creationTime).getTime() > 10 * 60 * 1000

        return <Message key={message._id} message={message} isFirstMessageOfUser={isFirstMessageOfUser} isThreadMessage={true} />
      })}
    </div>
  )
}
