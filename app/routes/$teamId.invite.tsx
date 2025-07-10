import { useAuthActions } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import { useNavigate, useParams } from "react-router"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export default function Page() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const team = useQuery(api.teams.getPublic, teamId ? { teamId } : "skip")

  const navigate = useNavigate()
  const { signIn } = useAuthActions()

  if (!team) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }
  return (
    <div className="flex h-svh flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-4 rounded-lg border p-4">
        <div className="flex flex-row items-center gap-4">
          <Avatar image={team.image} name={team.name} className="size-12" />
          <h1 className="font-semibold text-2xl">{team.name}</h1>
        </div>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            if (!team) return
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            await signIn("password", formData)
            navigate(`/${team._id}`)
          }}
        >
          <input type="hidden" name="flow" value="signUp" />
          <input type="hidden" name="teamId" value={team._id} />
          <Input name="name" type="text" placeholder="Name" autoFocus />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="password" type="password" placeholder="*********" />
          <Button type="submit" className="w-full">
            Join
          </Button>
        </form>
      </div>
    </div>
  )
}
