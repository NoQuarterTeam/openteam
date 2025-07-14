import { useQuery } from "convex/react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { api } from "@/convex/_generated/api"

export default function Component() {
  const [defaultTeamId] = useLocalStorage("defaultTeamId", "")

  const teams = useQuery(api.teams.myTeams)

  const navigate = useNavigate()

  useEffect(() => {
    if (!teams) return

    if (teams.length === 0) {
      navigate("/create-team")
      return
    }
    if (defaultTeamId && teams.find((team) => team._id === defaultTeamId)) {
      navigate(`/${defaultTeamId}`)
      return
    }
    navigate(`/${teams[0]!._id}`)
  }, [defaultTeamId, teams])

  return null
}

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  useEffect(() => {
    const storedValue = localStorage.getItem(key)
    if (storedValue) {
      try {
        setValue(JSON.parse(storedValue) as T)
      } catch {}
    }
  }, [key])

  return [value, setValue] as const
}
