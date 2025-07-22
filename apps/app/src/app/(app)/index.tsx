import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@openteam/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { Text, TouchableOpacity } from "react-native"
import { Screen } from "@/components/screen"

export default function Page() {
  const { signOut } = useAuthActions()
  const teams = useQuery(api.teams.myTeams)
  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Hello World</Text>
      {teams?.map((team) => (
        <Text key={team._id}>{team.name}</Text>
      ))}
      <TouchableOpacity onPress={() => signOut()} style={{ padding: 10, backgroundColor: "black" }}>
        <Text style={{ color: "white", textAlign: "center" }}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  )
}
