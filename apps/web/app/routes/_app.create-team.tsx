import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@openteam/backend/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { ChevronRightIcon, LogOutIcon } from "lucide-react"
import posthog from "posthog-js"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Page() {
  const teams = useQuery(api.teams.myTeams)
  const createTeam = useMutation(api.teams.create)
  const navigate = useNavigate()
  const { signOut } = useAuthActions()

  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreatingTeam(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string
    try {
      const team = await createTeam({ name })
      posthog.capture("team_created", { teamId: team, teamName: name })
      navigate(`/${team}`)
    } catch (error) {
      if (error instanceof ConvexError) {
        toast.error(error.data)
      } else {
        toast.error("Failed to create team")
      }
    } finally {
      setIsCreatingTeam(false)
    }
  }

  return (
    <div className="relative space-y-4 pt-4 md:pt-20">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm space-y-3 rounded-xl border bg-background p-4">
        <h1 className="text-center font-bold text-2xl">Create a new Team</h1>
        <Input autoFocus name="name" placeholder="Team Name" />
        <div className="space-y-2">
          <Button type="submit" className="w-full">
            Create
          </Button>
          {teams && teams.length > 0 && (
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      {!isCreatingTeam && (
        <div className="mx-auto max-w-sm space-y-2">
          {teams?.map((team) => (
            <Link
              key={team._id}
              to={`/${team._id}`}
              className="flex items-center justify-between rounded-xl border bg-background py-2 pr-4 pl-2 hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <Avatar className="size-8 rounded-md" image={team.image} name={team.name} />
                <span>{team.name}</span>
              </div>
              <ChevronRightIcon className="size-4" />
            </Link>
          ))}
        </div>
      )}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="outline" onClick={() => void signOut()}>
          <LogOutIcon />
          Log out
        </Button>
      </div>
    </div>
  )
}
