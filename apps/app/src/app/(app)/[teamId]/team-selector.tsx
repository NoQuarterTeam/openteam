import { api } from "@openteam/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { Button, Text, TouchableOpacity } from "react-native"
import { ModalView } from "@/components/modal-view"
import { DEFAULT_TEAM_KEY } from "@/lib/config"
export default function Page() {
  const router = useRouter()
  const { teamId } = useLocalSearchParams<{ teamId: string }>()
  const teams = useQuery(api.teams.myTeams)

  return (
    <ModalView title="Teams">
      {teams?.map((team) => (
        <TouchableOpacity
          key={team._id}
          onPress={() => {
            SecureStore.setItem(DEFAULT_TEAM_KEY, team._id)
            router.replace(`/${team._id}`, { withAnchor: false })
          }}
        >
          <Text>{team.name}</Text>
        </TouchableOpacity>
      ))}
      <Button onPress={() => router.push(`/${teamId}/new-team`)} title="Create new team" />
    </ModalView>
  )
}
