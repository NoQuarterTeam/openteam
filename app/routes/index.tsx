import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useNavigate } from "react-router"
import { api } from "@/convex/_generated/api"
import type { Route } from "./+types/index"

export function meta(_: Route.MetaArgs) {
  return [{ title: "OpenTeam" }, { name: "description", content: "OpenTeam" }]
}

export default function Component() {
  const { data: channels } = useQuery(convexQuery(api.channels.list, {}))

  const navigate = useNavigate()

  useEffect(() => {
    if (!channels || channels.length === 0) return
    navigate(`/${channels[0]._id}`)
  }, [channels])

  if (!channels) return null

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="font-bold text-2xl">Create your first channel</div>
      </div>
    </div>
  )
}
