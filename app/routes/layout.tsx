import { Outlet, useParams } from "react-router"
import { useQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Sidebar } from "@/components/sidebar"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useNotifications } from "@/lib/notifications"

export default function Component() {
  return (
    <div className="flex h-screen flex-col">
      <Nav />

      <div className="flex w-full flex-1 overflow-hidden">
        <Sidebar />
        <NotificationHandler />
        <Outlet />
      </div>
    </div>
  )
}

function NotificationHandler() {
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()
  const channels = useQuery(api.channels.list)
  const user = useQuery(api.auth.loggedInUser)
  const { sendNotification, requestPermission, isSupported } = useNotifications()
  
  const previousChannelsRef = useRef<typeof channels>()
  const isInitialLoad = useRef(true)

  // Request notification permission on app load
  useEffect(() => {
    if (isSupported && user) {
      requestPermission()
    }
  }, [isSupported, user, requestPermission])

  // Listen for new messages in channels and send notifications
  useEffect(() => {
    if (!channels || !user || isInitialLoad.current) {
      previousChannelsRef.current = channels
      isInitialLoad.current = false
      return
    }

    const previousChannels = previousChannelsRef.current
    if (!previousChannels) {
      previousChannelsRef.current = channels
      return
    }

    // Check for channels with increased unread count
    for (const channel of channels) {
      const previousChannel = previousChannels.find((prev: typeof channel) => prev._id === channel._id)
      
      // Skip if this is the current channel (user is actively viewing it)
      if (channelId === channel._id) {
        continue
      }

      // Skip if channel is muted
      if (channel.isMuted) {
        continue
      }

      // Check if unread count increased (new message)
      if (previousChannel && channel.unreadCount > previousChannel.unreadCount) {
        const isDirectMessage = !!channel.dmUser
        const channelDisplayName = isDirectMessage 
          ? channel.dmUser.name 
          : `#${channel.name}`

        // For DMs, show the sender's name as the title
        // For channels, show the channel name as the title
        const title = isDirectMessage 
          ? `${channel.dmUser.name} sent you a message`
          : `New message in ${channelDisplayName}`

        const body = isDirectMessage
          ? "Click to view the conversation"
          : "Click to view the channel"

        sendNotification({
          title,
          body,
          channelId: channel._id,
          channelName: channelDisplayName,
          authorName: isDirectMessage ? channel.dmUser.name : "Channel",
          icon: isDirectMessage ? channel.dmUser.image || undefined : undefined,
        })
      }
    }

    previousChannelsRef.current = channels
  }, [channels, user, channelId, sendNotification])

  return null
}
