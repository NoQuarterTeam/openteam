import type { Id } from "@openteam/backend/convex/_generated/dataModel"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { Link, useLocalSearchParams } from "expo-router"
import { Image, Text, TouchableOpacity, View } from "react-native"

dayjs.extend(relativeTime)

interface ThreadIndicatorProps {
  threadInfo: {
    parentMessageId: Id<"messages">
    replyCount: number
    lastReplyTime?: number
    participants: Array<{ _id: Id<"users">; name: string; image?: string | null }>
  }
}

export function ThreadIndicator({ threadInfo }: ThreadIndicatorProps) {
  const { teamId, channelId } = useLocalSearchParams<{ teamId: Id<"teams">; channelId: Id<"channels"> }>()
  if (!threadInfo || threadInfo.replyCount === 0) return null

  return (
    <Link href={`/${teamId}/${channelId}/${threadInfo.parentMessageId}`} asChild>
      <TouchableOpacity
        activeOpacity={0.7}
        style={{
          marginLeft: -4,
          marginTop: 2,
          height: 28,
          paddingLeft: 4,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "transparent",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {threadInfo.participants.slice(0, 5).map((p) => (
            <View
              key={p._id}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                overflow: "hidden",
                marginRight: 2,
                backgroundColor: "#eee",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {p.image ? (
                <Image source={{ uri: p.image }} style={{ width: 20, height: 20, borderRadius: 4 }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 12 }}>{p.name?.[0]}</Text>
              )}
            </View>
          ))}
        </View>
        <Text
          style={{
            fontWeight: "500",
            color: "#2563eb",
            fontSize: 13,
            marginLeft: 4,
            marginRight: 4,
          }}
        >
          {threadInfo.replyCount} {threadInfo.replyCount === 1 ? "reply" : "replies"}
        </Text>
        {threadInfo.lastReplyTime && (
          <Text style={{ fontWeight: "400", color: "#6b7280", fontSize: 12 }}>{dayjs(threadInfo.lastReplyTime).fromNow()}</Text>
        )}
      </TouchableOpacity>
    </Link>
  )
}
