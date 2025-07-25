import { Stack } from "expo-router"
import { useColorScheme } from "react-native"

export default function Layout() {
  const colorScheme = useColorScheme()
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
