import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { Image } from "expo-image"
import { router, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useEffect, useState } from "react"
import { ScrollView, TouchableOpacity, useColorScheme, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { toast } from "@/components/toaster"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"

export default function Page() {
  const router = useRouter()
  const { signOut } = useAuthActions()
  const me = useQuery(api.auth.me)
  const teams = useQuery(api.teams.myTeams)

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleGetInitialTeam = async () => {
      const teamId = await SecureStore.getItemAsync("selectedTeamId")
      if (teamId) router.navigate(`/${teamId}`)
      else setIsLoading(false)
    }
    handleGetInitialTeam()
  }, [])

  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  if (isLoading) return null

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{ gap: 8 }}>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <Image
              source={
                colorScheme === "dark"
                  ? require("../../../assets/images/logo-dark.png")
                  : require("../../../assets/images/logo-light.png")
              }
              style={{ width: 80, height: 80 }}
            />
          </View>
          {teams?.map((team) => (
            <TouchableOpacity
              key={team._id}
              style={{
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colorScheme === "dark" ? "#444" : "#eee",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
              onPress={() => {
                SecureStore.setItem("selectedTeamId", team._id)
                router.replace(`/${team._id}`, { withAnchor: false })
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {team.image ? (
                  <Image source={{ uri: team.image }} style={{ width: 32, height: 32, borderRadius: 4 }} />
                ) : (
                  <Text>{team.name[0]}</Text>
                )}
              </View>
              <Text style={{ fontSize: 16 }}>{team.name}</Text>
            </TouchableOpacity>
          ))}
          {teams && teams.length === 0 && <NewTeamForm />}
        </View>
      </ScrollView>

      <View style={{ gap: 16, padding: 16, borderTopWidth: 1, borderColor: colorScheme === "dark" ? "#444" : "#eee" }}>
        {me && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {me.image ? (
                <Image source={{ uri: me.image }} style={{ width: 36, height: 36, borderRadius: 4 }} />
              ) : (
                <Text>{me.name[0]}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>{me.name}</Text>
              <Text>{me.email}</Text>
            </View>
          </View>
        )}
        <Button onPress={() => signOut()}>Sign out</Button>
      </View>
    </View>
  )
}

function NewTeamForm() {
  const [name, setName] = useState("")
  const create = useMutation(api.teams.create)
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Create a team</Text>
      <Input value={name} onChangeText={setName} placeholder="Team name" />
      <Button
        disabled={!name.trim()}
        onPress={async () => {
          try {
            const teamId = await create({ name })
            SecureStore.setItem("selectedTeamId", teamId)
            router.replace(`/${teamId}`, { withAnchor: false })
          } catch (error) {
            if (error instanceof ConvexError) {
              toast({ title: "Error", message: error.data, type: "error" })
            } else {
              toast({ title: "Error", message: "Failed to create team", type: "error" })
            }
          }
        }}
      >
        Create
      </Button>
    </View>
  )
}
