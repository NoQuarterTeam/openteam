import { api } from "@openteam/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { Button, Image, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { ModalView } from "@/components/modal-view"
import { DEFAULT_TEAM_KEY } from "@/lib/config"
export default function Page() {
  const router = useRouter()
  const { teamId } = useLocalSearchParams<{ teamId: string }>()
  const teams = useQuery(api.teams.myTeams)

  return (
    <ModalView title="Select a team" edges={["top", "bottom"]}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ gap: 8 }}>
          {teams?.map((team) => (
            <TouchableOpacity
              key={team._id}
              onPress={() => {
                SecureStore.setItem(DEFAULT_TEAM_KEY, team._id)
                router.replace(`/${team._id}`, { withAnchor: false })
              }}
              style={{
                padding: 8,
                borderWidth: 1,
                borderRadius: 12,
                borderColor: "lightgray",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
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
                  <Text>{team.name[0]}</Text>
                )}
              </View>
              <Text>{team.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <Button onPress={() => router.push(`/${teamId}/new-team`)} title="Create new team" />
    </ModalView>
  )
}
