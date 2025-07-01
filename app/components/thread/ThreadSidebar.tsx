import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { XIcon } from "lucide-react"
import { Message } from "@/components/message"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { ThreadMessages } from "./ThreadMessages"
import { ThreadMessageInput } from "./ThreadMessageInput"

interface ThreadSidebarProps {
  threadId: Id<"threads">
  onClose: () => void
}

export function ThreadSidebar({ threadId, onClose }: ThreadSidebarProps) {
  const { data: threadData } = useQuery(convexQuery(api.threads.get, { threadId }))
  const { data: messages } = useQuery(convexQuery(api.threads.listMessages, { threadId }))

  if (!threadData) {
    return (
      <div className="flex h-full w-96 flex-col rounded-lg border bg-background">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Loading...</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">Loading thread...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-96 flex-col rounded-lg border bg-background">
      {/* Thread Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="border-b bg-muted/30 p-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Started a thread</div>
        <Message 
          message={threadData.parentMessage} 
          isFirstMessageOfUser={true} 
          isParentMessage={true}
        />
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto">
        <ThreadMessages messages={messages || []} />
      </div>

      {/* Thread Input */}
      <ThreadMessageInput threadId={threadId} />
    </div>
  )
}