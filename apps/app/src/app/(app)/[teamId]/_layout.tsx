import { Stack } from "expo-router"

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "white" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[channelId]" />
      <Stack.Screen name="select-team" options={{ presentation: "modal" }} />
      <Stack.Screen name="new-team" options={{ presentation: "modal" }} />
      <Stack.Screen name="new-channel" options={{ presentation: "modal" }} />
    </Stack>
  )
}
