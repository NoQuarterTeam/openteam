import { useQuery } from "convex/react"
import { ChevronDownIcon, PlusIcon } from "lucide-react"
import posthog from "posthog-js"
import { useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Babble } from "./babble"
import { NavChannels } from "./nav-channels"
import { NavUser } from "./nav-user"
import { Avatar } from "./ui/avatar"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const teams = useQuery(api.teams.myTeams)
  const activeTeam = teams?.find((team) => team._id === teamId)
  const navigate = useNavigate()

  useEffect(() => {
    if (!teams) return
    const handleKeyDown = (e: KeyboardEvent) => {
      // if the key is a number and the control key and option is pressed, navigate to the team
      if (e.key.match(/^\d$/) && e.ctrlKey && e.altKey) {
        const team = teams[parseInt(e.key) - 1]
        e.preventDefault()
        if (team && team._id !== teamId) navigate(`/${team._id}`)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [teams, teamId])
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="!pl-1 w-full justify-between">
              <div className="flex items-center gap-2">
                <Avatar
                  image={activeTeam?.image}
                  className="size-6 shrink-0 rounded-sm border object-cover"
                  name={activeTeam?.name || ""}
                />
                <span className="max-w-[195px] truncate md:max-w-[110px]">{activeTeam?.name}</span>
              </div>
              <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-(--radix-dropdown-menu-trigger-width)">
            {teams?.map((team, i) => (
              <DropdownMenuItem
                onClick={() => {
                  posthog.capture("team_switched")
                  localStorage.setItem("defaultTeamId", JSON.stringify(team._id))
                  navigate(`/${team._id}`)
                }}
                key={team._id}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <Avatar image={team.image} className="size-6 shrink-0 rounded-sm border object-cover" name={team.name || ""} />
                  {team.name}
                </div>
                <div>
                  <div className="ml-4 flex items-center justify-center rounded bg-muted px-1 py-px text-[10px] text-muted-foreground">
                    <kbd className="px-0.5 py-0.5">Ctrl</kbd>
                    <kbd className="px-0.5 py-0.5">Opt</kbd>
                    <kbd className="px-0.5 py-0.5">{i + 1}</kbd>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/create-team")} className="justify-between">
              Create Team
              <PlusIcon className="size-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavChannels />
      </SidebarContent>
      <SidebarFooter className="pb-4">
        <Babble />

        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
