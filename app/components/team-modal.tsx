import { useMutation, useQuery } from "convex/react"
import { CopyIcon, UsersIcon } from "lucide-react"
import { useCallback, useEffect, useId, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useParams } from "react-router"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "../../convex/_generated/api"
import { Avatar } from "./ui/avatar"
import { Button } from "./ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "./ui/dialog"
import { DropdownMenuItem } from "./ui/dropdown-menu"
import { Input } from "./ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "./ui/sidebar"

export function TeamModal() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const [open, setOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"info" | "members">("info")

  const [isUpdating, setIsUpdating] = useState(false)
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip")
  const members = useQuery(api.teams.listMembers, teamId ? { teamId } : "skip")

  const [name, setName] = useState(team?.name || "")
  useEffect(() => {
    if (team) {
      setName(team.name || "")
    }
  }, [team])

  const updateTeam = useMutation(api.teams.update)
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      if (!teamId) return
      await updateTeam({ name: name.trim(), teamId })
      toast.success("Team updated!")
    } catch {
      toast.error("Failed to update team")
    } finally {
      setIsUpdating(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (!selectedFile) return

    const uploadUrl = await generateUploadUrl()
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": selectedFile.type },
      body: selectedFile,
    })

    if (!result.ok) throw new Error("Failed to upload image")

    const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
    if (!teamId) return
    await updateTeam({ image: storageId, teamId })
    toast.success("Team image updated!")
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    autoFocus: false,
    multiple: false,
    accept: {
      "image/*": [],
    },
  })

  const inputId = useId()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <UsersIcon />
          Team
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Team Settings</DialogTitle>
        <DialogDescription className="sr-only">Update your team information and view members.</DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={sidebarTab === "info"}>
                        <button type="button" onClick={() => setSidebarTab("info")} className="flex w-full items-center gap-2">
                          <span>Info</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={sidebarTab === "members"}>
                        <button type="button" onClick={() => setSidebarTab("members")} className="flex w-full items-center gap-2">
                          <span>Members</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {sidebarTab === "info" && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <DialogTitle>Info</DialogTitle>
                  </div>
                  {/* Avatar Section */}
                  <div className="mb-4 flex flex-col items-center gap-2">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-300">
                      {team?.image ? (
                        <img src={team.image} alt="Current avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-semibold text-2xl text-neutral-600">{name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div {...getRootProps()}>
                      <input {...getInputProps()} />
                      <Button variant="outline" size="sm">
                        {team?.image ? "Change Photo" : "Upload Photo"}
                      </Button>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Field */}
                    <div>
                      <label htmlFor={inputId} className="mb-1 block font-medium text-neutral-700 text-sm">
                        Team Name
                      </label>
                      <Input
                        id={inputId}
                        type="text"
                        value={name}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your team name"
                        required
                      />
                    </div>
                    {/* Buttons */}
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" onClick={() => setOpen(false)} variant="outline">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={!name || name === team?.name || isUpdating}>
                        {isUpdating ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </form>
                </>
              )}
              {sidebarTab === "members" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <DialogTitle>Members</DialogTitle>
                  </div>
                  <div className="mb-4">
                    <p>Invite link</p>
                    <div className="flex w-full flex-row items-center gap-2">
                      <Input value={`${window.location.origin}/${teamId}/invite`} readOnly className="w-full" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${window.location.origin}/${teamId}/invite`)
                          toast.success("Copied to clipboard")
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {members?.map((member: any) => (
                      <li key={member._id} className="flex items-center gap-3 rounded p-2 hover:bg-muted/30">
                        <Avatar image={member.image} name={member.name} className="size-8 rounded-full" />
                        <div className="flex-1">
                          <div className="font-medium">{member.name}</div>
                          <div className="text-muted-foreground text-xs">{member.email}</div>
                        </div>
                        <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
                          {member.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
