import { useQuery } from "convex/react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"

dayjs.extend(relativeTime)

interface ThreadIndicatorProps {
  messageId: Id<"messages">
  channelId: Id<"channels">
  onOpenThread: (threadId: Id<"threads">) => void
}

export function ThreadIndicator({ messageId, channelId, onOpenThread }: ThreadIndicatorProps) {
  const channelThreads = useQuery(api.threads.listChannelThreads, { channelId })

  const threadInfo = channelThreads?.find((t) => t.parentMessageId === messageId)

  if (!threadInfo || threadInfo.replyCount === 0) return null

  return (
    <Button size="sm" className="-ml-1 mt-0.5 h-7 pl-1" variant="ghost" onClick={() => onOpenThread(threadInfo.threadId)}>
      <div className="flex items-center gap-0.5">
        {threadInfo.participants.map((p) => (
          <Avatar key={p._id} className="size-5 rounded-sm">
            <AvatarImage src={p.image || undefined} />
            <AvatarFallback className="size-5 rounded-sm">{p.name.charAt(0)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="font-medium text-blue-700 text-xs dark:text-blue-500">
        {threadInfo.replyCount} {threadInfo.replyCount === 1 ? "reply" : "replies"}
      </span>
      {threadInfo.lastReplyTime && (
        <span className="font-normal text-muted-foreground text-xs">Last reply {dayjs(threadInfo.lastReplyTime).fromNow()}</span>
      )}
    </Button>
  )
}
