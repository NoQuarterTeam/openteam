import { convexQuery } from "@convex-dev/react-query"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { NewChannel } from "./new-channel"
import { Button } from "./ui/button"

export function Sidebar() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()
  const { data: channels } = useQuery(convexQuery(api.channels.list, {}))
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return (
    <div className="w-50 p-4 pr-0">
      <div className="flex h-full flex-1 flex-col justify-between rounded-xl">
        <div className="flex-1 flex-col overflow-y-auto">
          {channels?.map((channel) => (
            <Button
              onMouseEnter={() => {
                queryClient.fetchQuery(convexQuery(api.channels.get, { channelId: channel._id }))
              }}
              className={cn(
                "h-8 w-full justify-start text-left font-normal",
                channelId !== channel._id && "text-muted-foreground",
              )}
              key={channel._id}
              onClick={() => navigate(`/${channel._id}`)}
              variant={channelId === channel._id ? "default" : "ghost"}
            >
              <div className="w-4">#</div>
              {channel.name.toLowerCase()}
            </Button>
          ))}
        </div>
        <NewChannel />
      </div>
    </div>
  )
}
