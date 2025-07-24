import { api } from "@openteam/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { router, useLocalSearchParams } from "expo-router"
import { PlusIcon } from "lucide-react-native"
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function Page() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>()
  const channels = useQuery(api.channels.list, { teamId })

  const insets = useSafeAreaInsets()

  const team = useQuery(api.teams.get, { teamId })

  if (!team) return null
  return (
    <View style={{ paddingTop: insets.top, paddingHorizontal: 16, flex: 1 }}>
      <View
        style={{
          gap: 8,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/${teamId}/team-selector`)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "lightgray",
          }}
        >
          {team.image ? (
            <Image source={{ uri: team.image }} style={{ width: 32, height: 32, borderRadius: 8 }} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{team.name[0]}</Text>
          )}
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>{team.name}</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 12, alignItems: "center", justifyContent: "space-between" }}>
          <Text>Channels</Text>
          <TouchableOpacity onPress={() => router.push(`/${teamId}/new-channel`)}>
            <PlusIcon size={16} color="black" />
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
