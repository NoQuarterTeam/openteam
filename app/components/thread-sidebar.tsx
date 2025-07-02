import { useQuery } from "convex/react"
import { XIcon } from "lucide-react"
import { Message } from "@/components/message"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MessageInput } from "./message-input"
import { Spinner } from "./ui/spinner"

interface ThreadSidebarProps {
  threadId: Id<"threads">
  onClose: () => void
}

export function ThreadSidebar({ threadId, onClose }: ThreadSidebarProps) {
  const threadData = useQuery(api.threads.get, { threadId })
  
  // Use paginated query for thread messages
  const paginatedMessages = useQuery(api.threads.listMessagesPaginated, { 
    threadId,
    paginationOpts: { numItems: 100, cursor: null } // Load more messages for threads initially
  })
  
  const messages = paginatedMessages?.page || []

  return (
    <div className="flex h-full w-96 flex-col rounded-lg border bg-background">
      {/* Thread Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Thread</h3>
          {!threadData && <Spinner className="size-4" />}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {threadData && (
        <>
          <div className="flex-1 overflow-y-auto">
            <Message message={threadData.parentMessage} isFirstMessageOfUser isParentMessage isThreadMessage />
            <div>
              {messages?.map((message, index) => {
                const isFirstMessageOfUser =
                  index === 0 ||
                  messages[index - 1]?.authorId !== message.authorId ||
                  new Date(message._creationTime).getTime() - new Date(messages[index - 1]!._creationTime).getTime() >
                    10 * 60 * 1000

                return <Message key={message._id} message={message} isFirstMessageOfUser={isFirstMessageOfUser} isThreadMessage />
              })}
            </div>
          </div>

          <MessageInput channelId={threadData.thread.channelId} threadId={threadId} isDisabled={false} />
        </>
      )}
    </div>
  )
}
