import type { Id } from "@openteam/backend/convex/_generated/dataModel"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useNavigate, useParams } from "react-router"
import { Avatar } from "./ui/avatar"
import { Button } from "./ui/button"

dayjs.extend(relativeTime)

interface ThreadIndicatorProps {
  threadInfo: {
    parentMessageId: Id<"messages">
    replyCount: number
    lastReplyTime?: number
    participants: Array<{ _id: Id<"users">; name: string; image?: string | null }>
  }
}

export function ThreadIndicator({ threadInfo }: ThreadIndicatorProps) {
  const navigate = useNavigate()
  const { teamId, channelId } = useParams<{ teamId: Id<"teams">; channelId: Id<"channels"> }>()
  if (!threadInfo || threadInfo.replyCount === 0 || !teamId || !channelId) return null

  return (
    <Button
      size="sm"
      className="group -ml-1 mt-0.5 h-7 pl-1"
      variant="ghost"
      onClick={() => {
        navigate(`/${teamId}/${channelId}/${threadInfo.parentMessageId}`)
      }}
    >
      <div className="flex items-center gap-0.5">
        {threadInfo.participants.slice(0, 5).map((p) => (
          <Avatar key={p._id} image={p.image} name={p.name} className="size-5 rounded-sm" />
        ))}
      </div>
      <span className="font-medium text-blue-700 text-xs group-hover:underline dark:text-blue-500">
        {threadInfo.replyCount} {threadInfo.replyCount === 1 ? "reply" : "replies"}
      </span>
      {threadInfo.lastReplyTime && (
        <span className="font-normal text-muted-foreground text-xs">Last reply {dayjs(threadInfo.lastReplyTime).fromNow()}</span>
      )}
    </Button>
  )
}
