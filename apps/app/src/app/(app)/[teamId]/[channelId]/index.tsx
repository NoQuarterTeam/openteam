import { api } from "@openteam/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { Link, useLocalSearchParams } from "expo-router"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function Page() {
  const params = useLocalSearchParams<{ teamId: string; channelId: string }>()

  const channel = useQuery(api.channels.get, { channelId: params.channelId })
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: insets.top }}>
      <Link href="../">Back</Link>
      <Text>{channel?.name}</Text>
    </View>
  )
}
