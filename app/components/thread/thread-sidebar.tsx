import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { XIcon } from "lucide-react"
import { Message } from "@/components/message"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { MessageInput } from "../message-input"
import { ThreadMessages } from "./thread-messages"

interface ThreadSidebarProps {
  threadId: Id<"threads">
  onClose: () => void
}

export function ThreadSidebar({ threadId, onClose }: ThreadSidebarProps) {
  const { data: threadData } = useQuery(convexQuery(api.threads.get, { threadId }))
  const { data: messages } = useQuery(convexQuery(api.threads.listMessages, { threadId }))

  return (
    <div className="flex h-full w-96 flex-col rounded-lg border bg-background">
      {/* Thread Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="font-semibold">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {threadData && (
        <>
          <div className="flex-1 overflow-y-auto">
            <Message message={threadData.parentMessage} isFirstMessageOfUser={true} isParentMessage={true} />
            <ThreadMessages messages={messages || []} />
          </div>

          <MessageInput channelId={threadData.thread.channelId} threadId={threadId} isDisabled={false} />
        </>
      )}
    </div>
  )
}
