import { api } from "@openteam/backend/convex/_generated/api"
import dayjs from "dayjs"
import { Fragment } from "react"
import { Image, Text, View } from "react-native"
import { useMarkdown } from "react-native-marked"

type MessageData =
  | (typeof api.messages.list._returnType)["page"][number]
  | (typeof api.threads.listMessages._returnType)["page"][number]

interface Props {
  message: MessageData
  isFirstMessageOfUser: boolean
  isThreadParentMessage?: boolean
  isThreadMessage?: boolean
}

export function Message({ message, isFirstMessageOfUser, isThreadParentMessage = false, isThreadMessage = false }: Props) {
  const markdown = useMarkdown(message.content, {
    styles: {
      text: { fontSize: 14, color: "black" },
      strong: { fontWeight: "bold", fontSize: 14, color: "black" },
      paragraph: { paddingVertical: 0 },
    },
  })
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 4 }}>
      {isFirstMessageOfUser ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "lightgray",
          }}
        >
          {message.author?.image ? (
            <Image source={{ uri: message.author.image }} style={{ width: 36, height: 36, borderRadius: 8 }} />
          ) : (
            <Text>{message.author?.name?.[0]}</Text>
          )}
        </View>
      ) : (
        <View style={{ width: 36 }} />
      )}
      <View>
        {isFirstMessageOfUser && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{message.author.name}</Text>
            <Text style={{ fontSize: 12, color: "gray" }}>{dayjs(message._creationTime).format("HH:mm")}</Text>
          </View>
        )}
        <View style={{ opacity: message.optimisticStatus === "created" ? 0.8 : 1 }}>
          {markdown.map((element, index) => {
            return <Fragment key={`ot-${index}`}>{element}</Fragment>
          })}
        </View>
      </View>
    </View>
  )
}
