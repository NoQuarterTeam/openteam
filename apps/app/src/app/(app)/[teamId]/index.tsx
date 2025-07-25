import { api } from "@openteam/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { router, useLocalSearchParams } from "expo-router"
import { PlusIcon } from "lucide-react-native"
import { Image, ScrollView, TouchableOpacity, useColorScheme, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/ui/text"

export default function Page() {
  const user = useQuery(api.auth.me)
  const colorScheme = useColorScheme()
  const { teamId } = useLocalSearchParams<{ teamId: string }>()
  const channels = useQuery(api.channels.list, { teamId })

  const insets = useSafeAreaInsets()

  const team = useQuery(api.teams.get, { teamId })

  if (!team) return null
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flex: 1 }}>
      <View style={{ gap: 8, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ gap: 8, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.push(`/${teamId}/select-team`)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
            }}
          >
            {team.image ? (
              <Image source={{ uri: team.image }} style={{ width: 36, height: 36, borderRadius: 8 }} />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>{team.name[0]}</Text>
            )}
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>{team.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/${teamId}/profile`)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
          }}
        >
          {user?.image ? (
            <Image source={{ uri: user.image }} style={{ width: 36, height: 36, borderRadius: 8 }} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{user?.name?.[0]}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 12, alignItems: "center", justifyContent: "space-between" }}>
          <Text>Channels</Text>
          <TouchableOpacity onPress={() => router.push(`/${teamId}/new-channel`)}>
            <PlusIcon size={16} color={colorScheme === "dark" ? "#fff" : "#000"} />
          </TouchableOpacity>
        </View>
        <View style={{ gap: 8 }}>
          {channels?.map((channel) => (
            <TouchableOpacity
              key={channel._id}
              style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 12 }}
              onPress={() => {
                router.push(`/${teamId}/${channel._id}`)
              }}
            >
              <Text>#</Text>
              <Text>{channel.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
