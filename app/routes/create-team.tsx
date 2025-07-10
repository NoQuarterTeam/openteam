import { useMutation } from "convex/react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"

export default function Page() {
  const createTeam = useMutation(api.teams.create)
  const navigate = useNavigate()
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string
    const team = await createTeam({ name })

    navigate(`/${team}`)
  }

  return (
    <div className="flex h-svh w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="font-bold text-2xl">Create Team</h1>
        <p className="text-muted-foreground text-sm">Create a team to get started with OpenTeam.</p>
        <form onSubmit={handleSubmit}>
          <Input name="name" placeholder="Team Name" />
          <Button type="submit">Create Team</Button>
        </form>
      </div>
    </div>
  )
}
