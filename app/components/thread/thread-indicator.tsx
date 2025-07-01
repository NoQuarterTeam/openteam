import { useQuery } from "convex/react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { MessageSquareIcon } from "lucide-react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

dayjs.extend(relativeTime)

interface ThreadIndicatorProps {
  messageId: Id<"messages">
  channelId: Id<"channels">
  onOpenThread: (threadId: Id<"threads">) => void
}

export function ThreadIndicator({ messageId, channelId, onOpenThread }: ThreadIndicatorProps) {
  const channelThreads = useQuery(api.threads.listChannelThreads, { channelId })
  
  const threadInfo = channelThreads?.find(t => t.parentMessageId === messageId)
  
  if (!threadInfo || threadInfo.replyCount === 0) return null
  
  return (
    <button
      onClick={() => onOpenThread(threadInfo.threadId)}
      className="mt-1 flex items-center gap-2 rounded px-2 py-1 text-xs bg-muted hover:bg-muted/80 transition-colors"
    >
      <MessageSquareIcon className="size-3" />
      <span>
        {threadInfo.replyCount} {threadInfo.replyCount === 1 ? "reply" : "replies"}
      </span>
      {threadInfo.lastReplyTime && (
        <span className="text-muted-foreground">
          Last reply {dayjs(threadInfo.lastReplyTime).fromNow()}
        </span>
      )}
    </button>
  )
}