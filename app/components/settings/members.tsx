import { useMutation, useQuery } from "convex/react"
import { PlusIcon, TrashIcon } from "lucide-react"
import { matchSorter } from "match-sorter"
import posthog from "posthog-js"
import { useState } from "react"
import { useParams } from "react-router"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Avatar } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Spinner } from "../ui/spinner"

export function TeamSettingsMembers() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()

  const [search, setSearch] = useState("")
  const user = useQuery(api.auth.me)
  const isAdmin = user?.userTeams.find((ut) => ut.teamId === teamId)?.role === "admin"
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip")
  const members = useQuery(api.teams.members, teamId ? { teamId } : "skip")

  const filteredMembers = matchSorter(members || [], search, { keys: ["name", "email"] })

  const updateUserRoleMutation = useMutation(api.users.updateUserRole)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const createInvite = useMutation(api.invites.create)
  const removeInvite = useMutation(api.invites.remove)
  const invites = useQuery(api.invites.list, teamId ? { teamId } : "skip")
  const [isInviting, setIsInviting] = useState(false)

  return (
    <div className="space-y-4 px-4">
      {/* Invite by email form */}
      <div className="flex w-full items-center justify-between">
        <div>
          <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <PlusIcon className="size-4" />
                Invite
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto">
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  setIsInviting(true)
                  try {
                    if (!teamId) throw new Error("No teamId")
                    posthog.capture("invite_sent", { teamId })
                    await createInvite({ email: inviteEmail, role: inviteRole, teamId })
                    toast.success("Invite sent!")
                    setInviteEmail("")
                    setInviteRole("member")
                  } catch (err) {
                    if (err instanceof Error) {
                      toast.error(err.message)
                    } else {
                      toast.error("Failed to send invite")
                    }
                  } finally {
                    setIsInviting(false)
                  }
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Invite by email"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    className="w-[200px] shrink-0"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isInviting || !inviteEmail} className="w-full">
                  {isInviting ? "Inviting..." : "Invite"}
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {/* Pending invites list */}
      {invites && invites.length > 0 && (
        <div className="space-y-1 rounded-xl border p-3">
          <p className="text-sm">Pending Invites</p>
          <ul className="space-y-1">
            {invites.map((invite) => (
              <li
                key={invite._id}
                className="flex items-center justify-between rounded-xl border py-2 pr-2 pl-4 text-muted-foreground text-sm"
              >
                {invite.email} ({invite.role})
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      posthog.capture("invite_deleted", { teamId })
                      void removeInvite({ inviteId: invite._id })
                    }}
                  >
                    <TrashIcon className="size-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="space-y-2">
        {members === undefined ? (
          <div className="flex w-full justify-center pt-2">
            <Spinner />
          </div>
        ) : (
          filteredMembers.map((member) => (
            <li key={member._id} className="flex items-center gap-3">
              <Avatar image={member.image} name={member.name} className="size-8 rounded-full" />
              <div className="flex-1">
                <div className="font-medium">{member.name}</div>
                <div className="text-muted-foreground text-xs">{member.email}</div>
              </div>

              {member._id === team?.createdBy?._id && <Badge>Owner</Badge>}

              <Select
                value={member.role}
                disabled={member._id === team?.createdBy?._id || !isAdmin}
                onValueChange={(value) => {
                  posthog.capture("user_role_updated", {
                    teamId,
                    userId: member._id,
                    role: value,
                  })
                  updateUserRoleMutation({
                    userTeamId: member.userTeamId,
                    role: value as "admin" | "member",
                  })
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
