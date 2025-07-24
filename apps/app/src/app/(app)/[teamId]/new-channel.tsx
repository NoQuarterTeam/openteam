import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation } from "convex/react"
import { ConvexError } from "convex/values"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import { Button, TextInput } from "react-native"
import { ModalView } from "@/components/modal-view"
import { toast } from "@/components/toaster"

export default function Page() {
  const [channelName, setChannelName] = useState("")
  const createChannel = useMutation(api.channels.create)
  const router = useRouter()
  const { teamId } = useLocalSearchParams<{ teamId: string }>()

  return (
    <ModalView title="Create channel">
      <TextInput
        autoCapitalize="none"
        autoFocus
        autoComplete="off"
        placeholder="Enter channel name"
        value={channelName}
        onChangeText={setChannelName}
      />
      <Button
        title="Create"
        disabled={!channelName.trim()}
        onPress={async () => {
          try {
            const channelId = await createChannel({ name: channelName.toLowerCase().trim(), teamId })
            router.replace(`/${teamId}/${channelId}`)
          } catch (error) {
            if (error instanceof ConvexError) {
              toast({ title: error.data, type: "error" })
            }
          }
        }}
      />
    </ModalView>
  )
}
