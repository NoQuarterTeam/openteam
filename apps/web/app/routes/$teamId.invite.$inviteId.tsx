import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@openteam/backend/convex/_generated/api"
import type { Id } from "@openteam/backend/convex/_generated/dataModel"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function Page() {
  const { teamId, inviteId } = useParams<{ teamId: Id<"teams">; inviteId: Id<"invites"> }>()
  const team = useQuery(api.teams.getPublic, teamId ? { teamId } : "skip")
  const user = useQuery(api.auth.me)
  const { isLoading } = useConvexAuth()
  const invite = useQuery(api.invites.get, inviteId ? { inviteId } : "skip")
  const acceptInvite = useMutation(api.invites.accept)
  const deleteInvite = useMutation(api.invites.remove)
  const { signIn } = useAuthActions()
  const navigate = useNavigate()
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false)

  const isAlreadyInTeam = user?.userTeams.some((ut) => ut.teamId === teamId)

  if (team === undefined || invite === undefined || user === undefined || isLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!invite || !team) {
    return (
      <div className="pt-4 md:pt-20">
        <div className="mx-auto w-full max-w-sm space-y-4 rounded-xl border bg-background p-4">
          <div className="flex items-center justify-center">
            <Avatar image={team.image} name={team.name} className="size-20" />
          </div>
          <h1 className="text-center text-2xl">
            <b>{team.name}</b>
          </h1>
          <p className="text-center">Invite not found</p>
          <Button variant="outline" className="w-full shrink-0" onClick={() => navigate(`/`)}>
            Go back
          </Button>
        </div>
      </div>
    )
  }

  if (invite.acceptedAt && !isAcceptingInvite) {
    return (
      <div className="pt-4 md:pt-20">
        <div className="mx-auto w-full max-w-sm space-y-4 rounded-xl border bg-background p-4">
          <div className="flex items-center justify-center">
            <Avatar image={team.image} name={team.name} className="size-20" />
          </div>
          <h1 className="text-center text-2xl">
            <b>{team.name}</b>
          </h1>
          <p className="text-center">Invite already accepted</p>
          <Button variant="outline" className="w-full shrink-0" onClick={() => navigate(`/`)}>
            Go back
          </Button>
        </div>
      </div>
    )
  }
  if (user && invite.email !== user.email) {
    return (
      <div className="pt-4 md:pt-20">
        <div className="mx-auto w-full max-w-sm space-y-4 rounded-xl border bg-background p-4">
          <div className="flex items-center justify-center">
            <Avatar image={team.image} name={team.name} className="size-20" />
          </div>
          <h1 className="text-center text-2xl">
            <b>{team.name}</b>
          </h1>
          <p className="text-center">You are not the recipient of this invite</p>
          <Button variant="outline" className="w-full shrink-0" onClick={() => navigate(`/`)}>
            Go back
          </Button>
        </div>
      </div>
    )
  }
  if (isAlreadyInTeam && !isAcceptingInvite) {
    return (
      <div className="pt-4 md:pt-20">
        <div className="mx-auto w-full max-w-sm space-y-4 rounded-xl border bg-background p-4">
          <div className="flex items-center justify-center">
            <Avatar image={team.image} name={team.name} className="size-20" />
          </div>
          <h1 className="text-center text-2xl">
            <b>{team.name}</b>
          </h1>
          <p className="text-center">You are already a member of this team</p>
          <Button variant="outline" className="w-full shrink-0" onClick={() => navigate(`/`)}>
            Go back
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="pt-4 md:pt-20">
      <div className="mx-auto w-full max-w-sm space-y-4 rounded-xl border bg-background p-4">
        <div className="flex items-center justify-center">
          <Avatar image={team.image} name={team.name} className="size-20" />
        </div>
        <h1 className="text-center text-2xl">
          You have been invited to join <br />
          <b>{team.name}</b>
        </h1>

        {user ? (
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="default"
              disabled={isAcceptingInvite}
              className="w-full shrink-0"
              onClick={async () => {
                try {
                  setIsAcceptingInvite(true)
                  await acceptInvite({ inviteId: invite._id })
                  navigate(`/${team._id}`)
                } catch (error) {
                  setIsAcceptingInvite(false)
                  if (error instanceof ConvexError) {
                    toast.error(error.data)
                  } else {
                    toast.error("Failed to accept invite")
                  }
                }
              }}
            >
              {isAcceptingInvite ? "Accepting..." : "Accept"}
            </Button>
            <Button
              disabled={isAcceptingInvite}
              variant="outline"
              className="w-full shrink-0"
              onClick={() => {
                navigate(`/`)
                void deleteInvite({ inviteId: invite._id })
              }}
            >
              Decline
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-muted-foreground text-sm">Sign in to accept the invite</p>
            <Button
              variant="outline"
              className="w-full shrink-0"
              onClick={() => {
                void signIn("google", { redirectTo: `/${team._id}/invite/${invite._id}` })
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <title>Google</title>
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>
            <Button
              variant="outline"
              className="w-full shrink-0"
              onClick={() => {
                void signIn("github")
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <title>GitHub</title>
                <path
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                  fill="currentColor"
                />
              </svg>
              <span>Continue with GitHub</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
