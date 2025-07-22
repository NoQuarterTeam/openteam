import { api } from "@openteam/backend/convex/_generated/api"
import type { Id } from "@openteam/backend/convex/_generated/dataModel"
import { useQuery } from "convex/react"
import { useParams } from "react-router"

export function UsersTyping() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()
  const users = useQuery(api.userChannelTyping.getUsersTyping, channelId ? { channelId } : "skip") || []

  const count = users?.length || 0
  if (count === 0) return null

  if (count > 2) {
    return <p className="text-[10px] text-muted-foreground">Several users are typing</p>
  }
  if (count === 2) {
    return (
      <p className="text-[10px] text-muted-foreground">
        <b>{users[0]!.name}</b> and <b>{users[1]!.name}</b> are typing
      </p>
    )
  }

  return (
    <p className="text-[10px] text-muted-foreground">
      <b>{users[0]!.name}</b> is typing
    </p>
  )
}
