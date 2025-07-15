import { useMutation, useQuery } from "convex/react"
import { ChevronRightIcon, XIcon } from "lucide-react"
import posthog from "posthog-js"
import { Link, useNavigate } from "react-router"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"

export default function Page() {
  const teams = useQuery(api.teams.myTeams)
  const createTeam = useMutation(api.teams.create)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string
    const team = await createTeam({ name })

    posthog.capture("team_created", { teamId: team, teamName: name })
    navigate(`/${team}`)
  }

  return (
    <div className="relative space-y-4 pt-4 md:pt-20">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-4 rounded-xl border p-4">
        <h1 className="font-bold text-2xl">Create a new Team</h1>
        <Input autoFocus name="name" placeholder="Team Name" />
        <Button type="submit" className="w-full">
          Create
        </Button>
      </form>
      <div className="mx-auto max-w-sm space-y-2">
        {teams?.map((team) => (
          <Link
            key={team._id}
            to={`/${team._id}`}
            className="flex items-center justify-between rounded-xl border py-2 pr-4 pl-2 hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <Avatar className="size-8 rounded-md" image={team.image} name={team.name} />
              <span>{team.name}</span>
            </div>
            <ChevronRightIcon className="size-4" />
          </Link>
        ))}
      </div>
      {teams && teams.length > 0 && (
        <div className="absolute top-4 right-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <XIcon />
          </Button>
        </div>
      )}
    </div>
  )
}
