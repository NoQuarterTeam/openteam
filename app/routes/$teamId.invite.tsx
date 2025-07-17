import { useAuthActions } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { FormField } from "@/components/form-field"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export default function Page() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const team = useQuery(api.teams.getPublic, teamId ? { teamId } : "skip")
  const [error, setError] = useState<ConvexError<{ email: string[]; password: string[]; name: string[] }> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
    <div className="pt-4 md:pt-20">
      <div className="mx-auto w-full max-w-md space-y-4 rounded-xl border p-4">
        <div className="flex flex-row items-center gap-4">
          <Avatar image={team.image} name={team.name} className="size-12" />
          <h1 className="font-semibold text-2xl">{team.name}</h1>
        </div>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            if (!team) return
            try {
              setError(null)
              setIsLoading(true)
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              await signIn("password", formData)
              navigate(`/${team._id}`)
            } catch (error) {
              if (error instanceof ConvexError) {
                setError(error)
              } else {
                toast.error("Something went wrong", { description: "Please try again" })
              }
            } finally {
              setIsLoading(false)
            }
          }}
        >
          <input type="hidden" name="flow" value="signUp" />
          <input type="hidden" name="teamId" value={team._id} />

          <FormField name="email" placeholder="work@example.com" label="Email" error={error?.data.email} />

          <FormField name="password" type="password" placeholder="*********" label="Password" error={error?.data.password} />

          <FormField name="name" placeholder="John Smith" label="Name" error={error?.data.name} />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Spinner className="text-white" /> : "Join"}
          </Button>
        </form>
      </div>
    </div>
  )
}
