import * as Notifications from "expo-notifications"
import { useLocalSearchParams, useRouter } from "expo-router"
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
  parentMessageId: string | undefined
  channelId: string
  teamId: string
}

export function useNotifications() {
  const router = useRouter()
  const { teamId, channelId, messageId } = useLocalSearchParams<{
    teamId: string
    channelId: string
    messageId: string
  }>()

  useEffect(() => {
    let isMounted = true

    async function handleRedirect({ request }: Notifications.Notification) {
      const data = request.content.data as NotificationData
      const notificationType = data?.type
      switch (notificationType) {
        case "NEW_MESSAGE": {
          if (teamId !== data.teamId) {
            // Push team
            router.replace(`/${data.teamId}`)
          } else {
            router.dismissTo(`/${data.teamId}`)
          }
          // Push channel
          if (channelId !== data.channelId) {
            router.push(`/${data.teamId}/${data.channelId}`)
          }
          // Push thread (message) if present
          if (data.parentMessageId && data.parentMessageId !== messageId) {
            router.push(`/${data.teamId}/${data.channelId}/${data.parentMessageId}`)
          }
          break
        }
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
