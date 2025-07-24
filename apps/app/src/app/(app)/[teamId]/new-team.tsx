import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation } from "convex/react"
import { ConvexError } from "convex/values"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Button, TextInput } from "react-native"
import { ModalView } from "@/components/modal-view"
import { toast } from "@/components/toaster"

export default function Page() {
  const [teamName, setTeamName] = useState("")
  const createTeam = useMutation(api.teams.create)
  const router = useRouter()

  return (
    <ModalView title="Create team">
      <TextInput
        autoCapitalize="none"
        autoFocus
        autoComplete="off"
        placeholder="Enter team name"
        value={teamName}
        onChangeText={setTeamName}
      />
      <Button
        title="Create"
        disabled={!teamName.trim()}
        onPress={async () => {
          try {
            const teamId = await createTeam({ name: teamName.toLowerCase().trim() })
            router.replace(`/${teamId}`)
            setTeamName("")
          } catch (error) {
            if (error instanceof ConvexError) {
              toast({ title: error.data, type: "error" })
            } else {
              toast({ title: "Failed to create team", type: "error" })
            }
          }
        }}
      />
    </ModalView>
  )
}
