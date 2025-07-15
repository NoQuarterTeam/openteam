import { useQuery } from "convex/react"
import { useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export default function Component() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip")
  const channels = useQuery(api.channels.list, teamId ? { teamId } : "skip")

  const navigate = useNavigate()

  useEffect(() => {
    if (!channels || !channels[0] || !team) return
    navigate(`/${teamId}/${channels[0]._id}`)
  }, [channels, teamId, team])

  return null
}
