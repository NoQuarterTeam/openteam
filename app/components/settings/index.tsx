import { Building2Icon, SettingsIcon, UserIcon, UsersIcon } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../ui/dialog"
import { DropdownMenuItem } from "../ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../ui/sidebar"
import { TeamSettingsMembers } from "./members"
import { SettingsProfile } from "./profile"
import { TeamSettingsInfo } from "./team"

export function Settings() {
  const [open, setOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"profile" | "team" | "members">("profile")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <SettingsIcon />
          Settings
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Update your profile, team information and view members.</DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none">
            <SidebarContent className="border-r py-3">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive={sidebarTab === "profile"} onClick={() => setSidebarTab("profile")}>
                        <UserIcon />
                        Profile
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarGroupContent>
                      <SidebarGroupLabel>Team</SidebarGroupLabel>

                      <SidebarMenuItem>
                        <SidebarMenuButton isActive={sidebarTab === "team"} onClick={() => setSidebarTab("team")}>
                          <Building2Icon />
                          General
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton isActive={sidebarTab === "members"} onClick={() => setSidebarTab("members")}>
                          <UsersIcon />
                          Members
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarGroupContent>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden bg-background">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
              {sidebarTab === "profile" && (
                <div>
                  <div className="mb-4 flex items-center justify-between border-b p-4">
                    <DialogTitle>Profile</DialogTitle>
                  </div>
                  <SettingsProfile />
                </div>
              )}
              {sidebarTab === "team" && (
                <div>
                  <div className="mb-4 flex items-center justify-between border-b p-4">
                    <DialogTitle>Team</DialogTitle>
                  </div>
                  <TeamSettingsInfo />
                </div>
              )}
              {sidebarTab === "members" && (
                <div>
                  <div className="mb-4 flex items-center justify-between border-b p-4">
                    <DialogTitle>Members</DialogTitle>
                  </div>
                  <TeamSettingsMembers />
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
