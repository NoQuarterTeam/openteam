import { useQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { Outlet, useNavigate, useParams } from "react-router"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandCenter } from "@/components/command-center"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useNotifications } from "@/lib/notifications"

export default function Component() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip")

  if (!team) return null
  return (
    <SidebarProvider className="h-svh w-screen">
      <AppSidebar />

      <SidebarInset>
        <Outlet />
      </SidebarInset>

      <NotificationHandler />
      <CommandCenter />
    </SidebarProvider>
  )
}

function NotificationHandler() {
  const { channelId, teamId } = useParams<{ channelId: Id<"channels">; teamId: Id<"teams"> }>()

  const channels = useQuery(api.channels.list, teamId ? { teamId } : "skip")
  const user = useQuery(api.auth.me)
  const navigate = useNavigate()
  const { sendNotification, requestPermission, isSupported } = useNotifications()

  const previousChannelsRef = useRef<typeof channels | undefined>(undefined)
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
      if (channelId === channel._id) continue

      // Skip if channel is muted
      if (channel.isMuted) continue

      // Check if unread count increased (new message)
      if (previousChannel && channel.unreadCount > previousChannel.unreadCount) {
        const channelDisplayName = channel.dmUser ? channel.dmUser.name : `#${channel.name}`

        // For DMs, show the sender's name as the title
        // For channels, show the channel name as the title
        const title = channel.dmUser ? `${channel.dmUser.name} sent you a message` : `New message in ${channelDisplayName}`

        const body = "Click to view the conversation"

        sendNotification({
          title,
          body,
          channelId: channel._id,
          icon: channel.dmUser ? channel.dmUser.image || undefined : undefined,
          onClick: () => navigate(`/${channel.teamId}/${channel._id}`),
        })
      }
    }

    previousChannelsRef.current = channels
  }, [channels, user, channelId, sendNotification])

  return null
}
