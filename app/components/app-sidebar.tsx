import { useQuery } from "convex/react"
import * as React from "react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { api } from "@/convex/_generated/api"
import { Babble } from "./babble"
import { NavChannels } from "./nav-channels"
import { NavUser } from "./nav-user"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const team = useQuery(api.teams.get)
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <h1 className="font-bold text-lg">{team?.name || ""}</h1>
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
