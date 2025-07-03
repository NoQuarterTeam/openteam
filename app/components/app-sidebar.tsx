import * as React from "react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { Babble } from "./babble"
import { NavChannels } from "./nav-channels"
import { NavUser } from "./nav-user"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <h1 className="font-bold text-lg">OpenTeam</h1>
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
