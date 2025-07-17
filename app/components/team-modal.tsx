import { useMutation, useQuery } from "convex/react";
import { CopyIcon, UsersIcon } from "lucide-react";
import posthog from "posthog-js";
import { useCallback, useEffect, useId, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useParams } from "react-router";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
} from "./ui/sidebar";

export function TeamModal() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>();
  const [open, setOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"info" | "members">("info");

  const user = useQuery(api.auth.me);
  const [isUpdating, setIsUpdating] = useState(false);
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip");
  const members = useQuery(api.teams.listMembers, teamId ? { teamId } : "skip");

  const [name, setName] = useState(team?.name || "");
  useEffect(() => {
    if (team) {
      setName(team.name || "");
    }
  }, [team]);

  const updateTeam = useMutation(api.teams.update);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      if (!teamId) return;
      posthog.capture("team_info_updated", { teamId });
      await updateTeam({ name: name.trim(), teamId });
      toast.success("Team updated!");
    } catch {
      toast.error("Failed to update team");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateUserRoleMutation = useMutation(api.users.updateUserRole);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": selectedFile.type },
      body: selectedFile,
    });

    if (!result.ok) throw new Error("Failed to upload image");

    const { storageId } = (await result.json()) as {
      storageId: Id<"_storage">;
    };
    if (!teamId) return;
    posthog.capture("team_image_updated", { teamId });
    await updateTeam({ image: storageId, teamId });
    toast.success("Team image updated!");
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    autoFocus: false,
    multiple: false,
    accept: {
      "image/*": [],
    },
  });

  // --- Invite feature state and logic ---
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const createInvite = useMutation(api.invites.createInvite);
  const invites = useQuery(api.invites.list, teamId ? { teamId } : "skip");
  const [isInviting, setIsInviting] = useState(false);

  const inputId = useId();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <UsersIcon />
          Team Settings
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Team Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Update your team information and view members.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none">
            <SidebarContent className="border-r py-3">
              <SidebarGroup>
                <SidebarGroupLabel>
                  <Avatar
                    image={team?.image}
                    name={team?.name || ""}
                    className="size-6 rounded-sm"
                  />
                  <span className="pl-2 font-medium text-sm">{team?.name}</span>
                </SidebarGroupLabel>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={sidebarTab === "info"}
                        onClick={() => setSidebarTab("info")}
                      >
                        Info
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={sidebarTab === "members"}
                        onClick={() => setSidebarTab("members")}
                      >
                        Members
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden pt-2">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {sidebarTab === "info" && (
                <>
                  <div className="mb-4 flex items-center justify-between border-b pb-4">
                    <DialogTitle>Info</DialogTitle>
                  </div>
                  {/* Avatar Section */}
                  <div className="mb-4 flex flex-col items-center gap-2">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-300">
                      {team?.image ? (
                        <img
                          src={team.image}
                          alt="Current avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-semibold text-2xl text-neutral-600">
                          {name.charAt(0).toUpperCase()}
                        </span>
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
                      <label
                        htmlFor={inputId}
                        className="mb-1 block font-medium text-neutral-700 text-sm"
                      >
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
                      <Button
                        type="submit"
                        disabled={!name || name === team?.name || isUpdating}
                      >
                        {isUpdating ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </form>
                </>
              )}
              {sidebarTab === "members" && (
                <div>
                  <div className="mb-4 flex items-center justify-between border-b pb-4">
                    <DialogTitle>Members</DialogTitle>
                  </div>
                  {/* Invite by email form */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsInviting(true);
                      try {
                        if (!teamId) throw new Error("No teamId");
                        await createInvite({
                          email: inviteEmail,
                          role: inviteRole,
                          teamId: teamId as string,
                        });
                        toast.success("Invite sent!");
                        setInviteEmail("");
                        setInviteRole("member");
                      } catch (err) {
                        if (err instanceof Error) {
                          toast.error(err.message);
                        } else {
                          toast.error("Failed to send invite");
                        }
                      } finally {
                        setIsInviting(false);
                      }
                    }}
                    className="mb-4 flex gap-2"
                  >
                    <Input
                      type="email"
                      placeholder="Invite by email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                    <Select
                      value={inviteRole}
                      onValueChange={(v) =>
                        setInviteRole(v as "admin" | "member")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" disabled={isInviting || !inviteEmail}>
                      {isInviting ? "Inviting..." : "Invite"}
                    </Button>
                  </form>
                  {/* Pending invites list */}
                  {invites &&
                    invites.filter((i) => !i.acceptedAt).length > 0 && (
                      <div className="mb-4">
                        <p>Pending Invites</p>
                        <ul>
                          {invites
                            .filter((i) => !i.acceptedAt)
                            .map((invite) => (
                              <li
                                key={invite._id}
                                className="text-sm text-muted-foreground"
                              >
                                {invite.email} ({invite.role})
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  <div className="mb-4">
                    <p>Invite link</p>
                    <div className="flex w-full flex-row items-center gap-2">
                      <Input
                        value={`${window.location.origin}/${teamId}/invite`}
                        readOnly
                        className="w-full"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          toast.success("Copied to clipboard");
                          await navigator.clipboard.writeText(
                            `${window.location.origin}/${teamId}/invite`
                          );
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {members?.map((member) => (
                      <li key={member._id} className="flex items-center gap-3">
                        <Avatar
                          image={member.image}
                          name={member.name}
                          className="size-8 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{member.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {member.email}
                          </div>
                        </div>

                        {member._id === team?.createdBy?._id && (
                          <Badge>Owner</Badge>
                        )}

                        <Select
                          value={member.role}
                          disabled={
                            member._id === team?.createdBy?._id ||
                            user?.userTeams.find((ut) => ut.teamId === teamId)
                              ?.role === "member"
                          }
                          onValueChange={(value) => {
                            posthog.capture("user_role_updated", {
                              teamId,
                              userId: member._id,
                              role: value,
                            });
                            updateUserRoleMutation({
                              userTeamId: member.userTeamId,
                              role: value as "admin" | "member",
                            });
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
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
