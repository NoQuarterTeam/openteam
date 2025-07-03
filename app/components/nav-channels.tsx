import { convexQuery } from "@convex-dev/react-query"
import { DragDropContext, Draggable, Droppable, type DropResult, type Id } from "@hello-pangea/dnd"
import { useQueryClient } from "@tanstack/react-query"
import { useMutation, useQuery } from "convex/react"
import { useNavigate, useParams } from "react-router"
import { api } from "@/convex/_generated/api"
import { useIsMobile } from "@/lib/use-mobile"
import { cn } from "@/lib/utils"
import { NewChannel } from "./new-channel"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, useSidebar } from "./ui/sidebar"

export function NavChannels() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()
  const channels = useQuery(api.channels.list)
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
    reorderedChannels.splice(destinationIndex, 0, removed!)

    // Generate new orders
    const channelOrders = reorderedChannels.map((channel, index) => ({ channelId: channel._id, order: index }))

    void updateChannelOrder({ channelOrders })
  }

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>Channels</SidebarGroupLabel>
        <NewChannel />
      </div>
      <SidebarGroupContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="channels">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-0">
                {channels?.map((channel, index) => (
                  <ChannelItem key={channel._id} channel={channel} index={index} isActive={channelId === channel._id} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

type ChannelData = NonNullable<typeof api.channels.list._returnType>[number]

interface ChannelItemProps {
  channel: ChannelData
  index: number
  isActive: boolean
}

function ChannelItem({ channel, index, isActive }: ChannelItemProps) {
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const isMobile = useIsMobile()
  const sidebar = useSidebar()

  const onChannelClick = () => {
    navigate(`/${channel._id}`)
    if (isMobile) sidebar.setOpenMobile(false)
  }

  return (
    <Draggable draggableId={channel._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => {
            if (!snapshot.isDragging) onChannelClick()
          }}
          onMouseEnter={() => {
            queryClient.prefetchQuery(convexQuery(api.channels.get, { channelId: channel._id }))
          }}
          className={cn(
            "flex h-8 w-full cursor-pointer items-center justify-between rounded-md border px-2 py-1 pr-3 text-left font-normal text-sm",
            isActive
              ? "border-transparent bg-primary text-primary-foreground"
              : snapshot.isDragging
                ? "border-border bg-neutral-50 dark:bg-neutral-900"
                : "border-transparent text-muted-foreground hover:bg-neutral-100 hover:dark:bg-black/80",
          )}
        >
          <div className="flex items-center justify-center gap-2">
            {channel.dmUser ? (
              <>
                <Avatar className="size-5 rounded">
                  <AvatarImage src={channel.dmUser.image || undefined} className="object-cover" />
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

          {/* Unread count */}
          {!isActive && channel.unreadCount > 0 && (
            <p className="text-xs">
              {channel.unreadCount}
              {channel.unreadCount > 100 && "+"}
            </p>
          )}
        </div>
      )}
    </Draggable>
  )
}
