import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@openteam/backend/convex/_generated/api"
import { useQuery } from "convex/react"
import { useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { Image, Text, TouchableOpacity, View } from "react-native"
import { Screen } from "@/components/screen"

export default function Page() {
  const router = useRouter()
  const { signOut } = useAuthActions()
  const me = useQuery(api.auth.me)
  const teams = useQuery(api.teams.myTeams)

  // const [isLoading, setIsLoading] = useState(true)

  // useEffect(() => {
  //   const handleGetInitialTeam = async () => {
  //     const teamId = await SecureStore.getItemAsync("selectedTeamId")
  //     if (teamId) router.navigate(`/${teamId}`)
  //     else setIsLoading(false)
  //   }
  //   handleGetInitialTeam()
  // }, [])

  // if (isLoading)
  //   return (
  //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //       <ActivityIndicator />
  //     </View>
  //   )

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Select a team</Text>
      {teams?.map((team) => (
        <TouchableOpacity
          key={team._id}
          style={{ padding: 10, backgroundColor: "black" }}
          onPress={() => {
            SecureStore.setItem("selectedTeamId", team._id)
            router.replace(`/${team._id}`, { withAnchor: false })
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>{team.name}</Text>
        </TouchableOpacity>
      ))}

      {me && (
        <View>
          <Text>{me.name}</Text>
          <Image source={{ uri: me.image }} style={{ width: 100, height: 100, borderRadius: 50 }} />
        </View>
      )}
      <TouchableOpacity onPress={() => signOut()} style={{ padding: 10, marginTop: 24, backgroundColor: "black" }}>
        <Text style={{ color: "white", textAlign: "center" }}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  )
}
