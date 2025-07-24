import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { router, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useEffect, useState } from "react"
import { Button, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Screen } from "@/components/screen"
import { toast } from "@/components/toaster"

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

  if (isLoading) return null

  return (
    <Screen>
      <ScrollView style={{ flex: 1, paddingTop: 16 }}>
        <View style={{ gap: 8 }}>
          {teams?.map((team) => (
            <TouchableOpacity
              key={team._id}
              style={{
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "lightgray",
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
                  backgroundColor: "lightgray",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {team.image ? (
                  <Image source={{ uri: team.image }} style={{ width: 24, height: 24 }} />
                ) : (
                  <Text>{team.name[0]}</Text>
                )}
              </View>
              <Text style={{ color: "black", textAlign: "center" }}>{team.name}</Text>
            </TouchableOpacity>
          ))}
          {teams && teams.length === 0 && <NewTeamForm />}
        </View>
      </ScrollView>

      <View style={{ gap: 16 }}>
        {me && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                backgroundColor: "lightgray",
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
        <TouchableOpacity onPress={() => signOut()} style={{ padding: 10, backgroundColor: "black", borderRadius: 4 }}>
          <Text style={{ color: "white", textAlign: "center" }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

function NewTeamForm() {
  const [name, setName] = useState("")
  const create = useMutation(api.teams.create)
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Create a team</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Team name" />
      <Button
        title="Create"
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
      />
    </View>
  )
}
