import { convexQuery } from "@convex-dev/react-query"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { useQueryClient } from "@tanstack/react-query"
import { useMutation, useQuery } from "convex/react"
import { useNavigate, useParams } from "react-router"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { NewChannel } from "./new-channel"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export function Sidebar() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()
  const channels = useQuery(api.channels.list)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const updateChannelOrder = useMutation(api.channels.updateOrder).withOptimisticUpdate((localStore, args) => {
    const currentValue = localStore.getQuery(api.channels.list, {})
    if (currentValue && args.channelOrders) {
      // Create a map of new orders
      const orderMap = new Map(args.channelOrders.map((order) => [order.channelId, order.order]))

      // Sort channels by new order
      const sortedChannels = [...currentValue].sort((a, b) => {
        const orderA = orderMap.get(a._id) ?? a._creationTime
        const orderB = orderMap.get(b._id) ?? b._creationTime
        return orderA - orderB
      })

      localStore.setQuery(api.channels.list, {}, sortedChannels)
    }
  })

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !channels) return

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) return

    // Create new order based on drag result
    const reorderedChannels = Array.from(channels)
    const [removed] = reorderedChannels.splice(sourceIndex, 1)
    reorderedChannels.splice(destinationIndex, 0, removed)

    // Generate new orders
    const channelOrders = reorderedChannels.map((channel, index) => ({
      channelId: channel._id,
      order: index,
    }))

    updateChannelOrder({ channelOrders })
  }

  return (
    <div className="w-50 p-4 pr-0">
      <div className="flex h-full flex-1 flex-col justify-between rounded-xl">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="channels">
            {(provided) => (
              <div className="flex-1 flex-col overflow-y-auto" {...provided.droppableProps} ref={provided.innerRef}>
                {channels?.map((channel, index) => (
                  <Draggable key={channel._id} draggableId={channel._id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "flex h-8 w-full cursor-pointer items-center rounded-md border px-2 py-1 text-left font-normal text-sm",
                          channelId === channel._id
                            ? "border-transparent bg-primary text-primary-foreground"
                            : snapshot.isDragging
                              ? "border-border bg-neutral-50 dark:bg-neutral-900/50"
                              : "border-transparent text-muted-foreground hover:bg-neutral-100 hover:dark:bg-black/80",
                        )}
                        onClick={() => {
                          if (!snapshot.isDragging) navigate(`/${channel._id}`)
                        }}
                        onMouseEnter={() => {
                          queryClient.fetchQuery(convexQuery(api.channels.get, { channelId: channel._id }))
                        }}
                      >
                        <div {...provided.dragHandleProps} className="flex flex-1 items-center gap-2">
                          {channel.dmUser ? (
                            <>
                              <Avatar className="size-5 rounded">
                                <AvatarImage src={channel.dmUser.image || undefined} />
                                <AvatarFallback className="size-5 rounded text-black text-xs dark:text-white">
                                  {channel.dmUser.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {channel.dmUser.name}
                            </>
                          ) : (
                            <>
                              <div className="w-5 text-center">#</div>
                              {channel.name.toLowerCase()}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <NewChannel />
      </div>
    </div>
  )
}
