import * as Notifications from "expo-notifications"
import { useRouter } from "expo-router"
import { useEffect } from "react"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

type NotificationData = {
  type: "NEW_MESSAGE"
  messageId: string | undefined
  channelId: string
  teamId: string
}

export function useNotifications() {
  const router = useRouter()
  useEffect(() => {
    let isMounted = true

    function handleRedirect({ request }: Notifications.Notification) {
      const data = request.content.data as NotificationData
      const notificationType = data?.type
      switch (notificationType) {
        case "NEW_MESSAGE":
          router.push(`/${data.teamId}/${data.channelId}${data.messageId ? `/${data.messageId}` : ""}`, { withAnchor: false })
          break
        default:
          notificationType satisfies never
          break
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response?.notification) return

      handleRedirect(response?.notification)
    })

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleRedirect(response.notification)
    })

    return () => {
      isMounted = false
      subscription.remove()
    }
  }, [])
}
