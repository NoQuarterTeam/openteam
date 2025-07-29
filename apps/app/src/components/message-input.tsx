import { api } from "@openteam/backend/convex/_generated/api"
import { Id } from "@openteam/backend/convex/_generated/dataModel"
import { insertAtPosition, useMutation, useQuery } from "convex/react"
import * as Crypto from "expo-crypto"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams } from "expo-router"
import { ArrowRightIcon, FileIcon, ImageIcon, PlusIcon } from "lucide-react-native"
import { useCallback, useRef, useState } from "react"
import { ScrollView, TextInput, TouchableOpacity, useColorScheme, View } from "react-native"
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet"
import { FileDisplay } from "./file-display"
import { toast } from "./toaster"
import { Button } from "./ui/button"

export function MessageInput({ onFocus }: { onFocus?: () => void }) {
  const colorScheme = useColorScheme()
  const params = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels">; messageId: Id<"messages"> }>()
  const user = useQuery(api.auth.me)
  const [filePreviews, setFilePreviews] = useState<
    { name: string; type: string; url: string; id: Id<"files">; storageId: Id<"_storage"> }[]
  >([])
  const [tempMessageId, setTempMessageId] = useState<string | null>(Crypto.randomUUID())

  const [message, setMessage] = useState("")
  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate((localStore, args) => {
    const { content } = args
    if (!user) return

    const messageId = Crypto.randomUUID() as Id<"messages">
    insertAtPosition({
      paginatedQuery: api.messages.list,
      argsToMatch: { channelId: params.channelId, messageId: args.parentMessageId },
      sortOrder: "desc",
      sortKeyFromItem: (item) => item._creationTime,
      localQueryStore: localStore,
      item: {
        _id: messageId,
        authorId: user._id,
        content,
        author: user,
        channelId: params.channelId,
        parentMessageId: args.parentMessageId,
        _creationTime: Date.now(),
        optimisticStatus: "created",
        reactions: [],
        threadInfo: null,
        files:
          filePreviews.map(({ name, type, url, id }) => ({
            _id: Crypto.randomUUID() as Id<"files">,
            name,
            previewId: id,
            previewContentType: type,
            previewUrl: url,
            _creationTime: Date.now(),
            messageId,
            url: null,
            metadata: null,
            storageId: undefined,
          })) || [],
      },
    })
  })

  const actionSheetRef = useRef<ActionSheetRef>(null)

  const handleSend = async () => {
    if (!message.trim() && filePreviews.length === 0) return
    setMessage("")
    setFilePreviews([])
    await sendMessage({ channelId: params.channelId, content: message.trim(), tempMessageId, parentMessageId: params.messageId })
    setTempMessageId(Crypto.randomUUID())
  }

  const removeFile = useMutation(api.files.remove)

  const handleRemoveFile = (id: Id<"files">) => {
    void removeFile({ id })
    setFilePreviews((prev) => prev.filter((p) => p.id !== id))
  }

  const createFilePreviews = useMutation(api.files.createFilePreviews)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const updateFile = useMutation(api.files.update)

  const handleSelectFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
    })
    if (!result.assets) return
    actionSheetRef.current?.hide()

    let newPreviews: { name: string; type: string; url: string; id: Id<"files">; storageId: Id<"_storage"> }[] =
      result.assets.map((asset) => ({
        name: asset.name,
        type: asset.mimeType,
        id: Crypto.randomUUID() as Id<"files">, // tempId
        url: asset.uri,
        storageId: null,
      }))

    const createdFiles = await createFilePreviews({
      previewMessageId: tempMessageId,
      previews: newPreviews.map(({ name, type, url, id }) => ({
        url,
        previewId: id,
        name,
        contentType: type,
      })),
    })

    newPreviews = newPreviews.map((p) => ({ ...p, id: createdFiles.find((c) => c.previewId === p.id)!.id }))
    setFilePreviews((prev) => [...prev, ...newPreviews])

    const results = await Promise.allSettled(
      newPreviews.map(async (preview) => {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(preview.url)
        const blob = await response.blob()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": preview.type },
          body: blob,
        })
        if (!result.ok) throw new Error("Failed to upload file")
        const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
        return { ...preview, storageId }
      }),
    )

    if (results.some((result) => result.status === "rejected")) {
      toast({ title: "Some files failed to upload", type: "error" })
    }

    for (const result of results) {
      if (result.status === "rejected") continue
      await updateFile({ id: result.value.id!, storageId: result.value.storageId })
      setFilePreviews((prev) => prev.map((p) => (p.id === result.value.id ? { ...p, storageId: result.value.storageId } : p)))
    }
  }, [tempMessageId])

  const handleSelectImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 20,
    })

    if (!result.assets) return
    actionSheetRef.current?.hide()

    let newPreviews: { name: string; type: string; url: string; id: Id<"files">; storageId: Id<"_storage"> }[] =
      result.assets.map((asset) => ({
        name: asset.fileName,
        type: asset.mimeType,
        id: Crypto.randomUUID() as Id<"files">, // tempId
        url: asset.uri,
        storageId: null,
      }))

    const createdFiles = await createFilePreviews({
      previewMessageId: tempMessageId,
      previews: newPreviews.map(({ name, type, url, id }) => ({
        url,
        previewId: id,
        name,
        contentType: type,
      })),
    })

    newPreviews = newPreviews.map((p) => ({ ...p, id: createdFiles.find((c) => c.previewId === p.id)!.id }))

    setFilePreviews((prev) => [...prev, ...newPreviews])

    const results = await Promise.allSettled(
      newPreviews.map(async (preview) => {
        const uploadUrl = await generateUploadUrl()
        const response = await fetch(preview.url)
        const blob = await response.blob()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": preview.type },
          body: blob,
        })
        if (!result.ok) throw new Error("Failed to upload file")
        const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
        return { ...preview, storageId }
      }),
    )

    if (results.some((result) => result.status === "rejected")) {
      toast({ title: "Some files failed to upload", type: "error" })
    }

    for (const result of results) {
      if (result.status === "rejected") continue
      await updateFile({ id: result.value.id!, storageId: result.value.storageId })
      setFilePreviews((prev) => prev.map((p) => (p.id === result.value.id ? { ...p, storageId: result.value.storageId } : p)))
    }
  }, [tempMessageId])

  return (
    <View style={{ backgroundColor: colorScheme === "dark" ? "#000" : "#fff" }}>
      {filePreviews.length > 0 && (
        <View
          style={{
            flex: 1,
            borderTopWidth: 1,
            borderColor: colorScheme === "dark" ? "#444" : "#eee",
            padding: 8,
          }}
        >
          <ScrollView horizontal>
            {filePreviews.map(({ id, name, storageId, url, type }) => (
              <FileDisplay
                key={id}
                file={{
                  _id: id as Id<"files">,
                  name,
                  previewUrl: url,
                  previewId: id,
                  storageId,
                  previewContentType: type,
                  url: null,
                  metadata: null,
                }}
                variant="preview"
                channelId={params.channelId}
                onRemove={handleRemoveFile}
              />
            ))}
          </ScrollView>
        </View>
      )}
      <View
        style={{
          borderTopWidth: 1,
          flexDirection: "row",
          alignItems: "flex-end",
          borderColor: colorScheme === "dark" ? "#444" : "#eee",
          padding: 16,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => actionSheetRef.current?.show()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colorScheme === "dark" ? "#444" : "#eee",
          }}
        >
          <PlusIcon color={colorScheme === "dark" ? "#fff" : "#000"} size={20} />
        </TouchableOpacity>

        <ActionSheet
          ref={actionSheetRef}
          gestureEnabled
          containerStyle={{
            backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
          }}
        >
          <View style={{ gap: 8, paddingHorizontal: 16, paddingBottom: 48, paddingTop: 16 }}>
            <Button
              variant="outline"
              leftIcon={<ImageIcon size={16} color={colorScheme === "dark" ? "#fff" : "#000"} />}
              onPress={handleSelectImage}
            >
              Select photo
            </Button>
            <Button
              variant="outline"
              leftIcon={<FileIcon size={16} color={colorScheme === "dark" ? "#fff" : "#000"} />}
              onPress={handleSelectFile}
            >
              Select file
            </Button>
          </View>
        </ActionSheet>

        <TextInput
          onSubmitEditing={handleSend}
          multiline
          placeholder="Message"
          style={{ fontSize: 16, flex: 1, minHeight: 32, color: colorScheme === "dark" ? "#fff" : "#000" }}
          value={message}
          // autoFocus={!!params.messageId}
          onChangeText={setMessage}
          returnKeyType="default"
          onFocus={onFocus}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colorScheme === "dark" ? "#fff" : "#000",
          }}
        >
          <ArrowRightIcon color={colorScheme === "dark" ? "#000" : "#fff"} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  )
}
