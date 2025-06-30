import { useQuery } from "convex/react"
import { useEffect } from "react"
import { useNavigate } from "react-router"
import { api } from "@/convex/_generated/api"
import type { Route } from "./+types/index"

export function meta(_: Route.MetaArgs) {
  return [{ title: "OpenTeam" }, { name: "description", content: "OpenTeam" }]
}

export default function Component() {
  const channels = useQuery(api.channels.list)

  const navigate = useNavigate()

  useEffect(() => {
    if (!channels || !channels[0]) return
    navigate(`/${channels[0]._id}`)
  }, [channels])

  return null
}
