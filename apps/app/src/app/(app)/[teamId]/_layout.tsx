import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation } from "convex/react"
import { Stack } from "expo-router"
import { useEffect } from "react"
import { useColorScheme } from "react-native"
import { getPushToken } from "@/lib/get-push-token"
import { useNotifications } from "@/lib/use-notifications"

export default function Layout() {
  const colorScheme = useColorScheme()
  useNotifications()
  const savePushNotificationToken = useMutation(api.pushNotifications.saveToken)

  useEffect(() => {
    function registerPushNotificationToken() {
      getPushToken().then((token) => savePushNotificationToken({ token }))
    }
    registerPushNotificationToken()
  }, [])
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colorScheme === "dark" ? "#000" : "#fff" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[channelId]" />
      <Stack.Screen name="select-team" options={{ presentation: "modal" }} />
      <Stack.Screen name="new-team" options={{ presentation: "modal" }} />
      <Stack.Screen name="new-channel" options={{ presentation: "modal" }} />
      <Stack.Screen name="profile" options={{ presentation: "modal" }} />
    </Stack>
  )
}
