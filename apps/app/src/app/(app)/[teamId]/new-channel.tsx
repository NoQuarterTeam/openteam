import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation } from "convex/react"
import { ConvexError } from "convex/values"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import { ModalView } from "@/components/modal-view"
import { toast } from "@/components/toaster"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Page() {
  const [channelName, setChannelName] = useState("")
  const createChannel = useMutation(api.channels.create)
  const router = useRouter()
  const { teamId } = useLocalSearchParams<{ teamId: string }>()

  return (
    <ModalView title="New channel">
      <View style={{ gap: 12 }}>
        <Input
          autoCapitalize="none"
          autoFocus
          autoComplete="off"
          placeholder="Enter channel name"
          value={channelName}
          onChangeText={setChannelName}
        />
        <Button
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
        >
          Create
        </Button>
      </View>
    </ModalView>
  )
}
