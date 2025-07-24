import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { router, useLocalSearchParams, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { PlusIcon } from "lucide-react-native"
import { useState } from "react"
import { Button, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ModalView } from "@/components/modal-view"
import { toast } from "@/components/toaster"
import { DEFAULT_TEAM_KEY } from "@/lib/config"

export default function Page() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>()
  const channels = useQuery(api.channels.list, { teamId })

  const insets = useSafeAreaInsets()

  const team = useQuery(api.teams.get, { teamId })
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false)

  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false)
  const createChannel = useMutation(api.channels.create)
  const [channelName, setChannelName] = useState("")
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
          onPress={() => setIsTeamSelectorOpen(true)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "lightgray",
          }}
        >
          {team.image ? <Image source={{ uri: team.image }} style={{ width: 24, height: 24 }} /> : <Text>{team.name[0]}</Text>}
        </TouchableOpacity>
        <Text>{team.name}</Text>
      </View>
      <Modal presentationStyle="pageSheet" visible={isTeamSelectorOpen} onRequestClose={() => setIsTeamSelectorOpen(false)}>
        <TeamSelector onClose={() => setIsTeamSelectorOpen(false)} />
      </Modal>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 16, alignItems: "center", justifyContent: "space-between" }}>
          <Text>Channels</Text>
          <TouchableOpacity onPress={() => setIsCreateChannelModalOpen(true)}>
            <PlusIcon size={16} color="black" />
          </TouchableOpacity>

          <Modal
            presentationStyle="pageSheet"
            visible={isCreateChannelModalOpen}
            onDismiss={() => {
              setIsCreateChannelModalOpen(false)
              setChannelName("")
            }}
            onRequestClose={() => {
              setIsCreateChannelModalOpen(false)
              setChannelName("")
            }}
          >
            <ModalView
              title="Create channel"
              onBack={() => {
                setIsCreateChannelModalOpen(false)
                setChannelName("")
              }}
            >
              <TextInput placeholder="Enter channel name" value={channelName} onChangeText={setChannelName} />
              <Button
                title="Create"
                onPress={async () => {
                  try {
                    setIsCreateChannelModalOpen(false)
                    const channelId = await createChannel({ name: channelName.toLowerCase().trim(), teamId })
                    router.push(`/${teamId}/${channelId}`)
                    setChannelName("")
                  } catch (error) {
                    setIsCreateChannelModalOpen(true)
                    if (error instanceof ConvexError) {
                      toast({ title: error.data, type: "error" })
                    }
                  }
                }}
              />
            </ModalView>
          </Modal>
        </View>
        <View style={{ gap: 8 }}>
          {channels?.map((channel) => (
            <TouchableOpacity
              key={channel._id}
              style={{ padding: 8, borderRadius: 4, backgroundColor: "lightgray" }}
              onPress={() => {
                router.push(`/${teamId}/${channel._id}`)
              }}
            >
              <Text>{channel.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

function TeamSelector({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const teams = useQuery(api.teams.myTeams)
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const createTeam = useMutation(api.teams.create)

  return (
    <ModalView onBack={onClose} title="Teams">
      {teams?.map((team) => (
        <TouchableOpacity
          key={team._id}
          onPress={() => {
            SecureStore.setItem(DEFAULT_TEAM_KEY, team._id)
            router.push(`/${team._id}`)
            setTeamName("")
            onClose()
          }}
        >
          <Text>{team.name}</Text>
        </TouchableOpacity>
      ))}
      <Button onPress={() => setIsCreateTeamModalOpen(true)} title="Create new team" />

      <Modal
        presentationStyle="pageSheet"
        visible={isCreateTeamModalOpen}
        onRequestClose={() => {
          setIsCreateTeamModalOpen(false)
        }}
      >
        <ModalView title="Create Team" onBack={() => setIsCreateTeamModalOpen(false)}>
          <TextInput
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Enter team name"
            style={{ borderWidth: 1, borderColor: "gray", padding: 8, borderRadius: 4 }}
          />
          <Button
            onPress={async () => {
              const teamId = await createTeam({ name: teamName })
              SecureStore.setItem(DEFAULT_TEAM_KEY, teamId)
              router.push(`/${teamId}`)
              setIsCreateTeamModalOpen(false)
              setTeamName("")
              onClose()
            }}
            title="Create"
          />
        </ModalView>
      </Modal>
    </ModalView>
  )
}
