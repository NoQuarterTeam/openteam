import { useMutation, useQuery } from "convex/react"
import { UsersIcon } from "lucide-react"
import { useCallback, useEffect, useId, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "../../convex/_generated/api"
import { Button } from "./ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./ui/dialog"
import { DropdownMenuItem } from "./ui/dropdown-menu"
import { Input } from "./ui/input"

export function TeamModal() {
  const [open, setOpen] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const team = useQuery(api.teams.get)

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
      await updateTeam({ name: name.trim() })
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
    await updateTeam({ image: storageId })
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
    <>
      <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setOpen(true)}>
        <UsersIcon />
        Team
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div>
            <DialogTitle>Team</DialogTitle>
            <DialogDescription>Update your team information</DialogDescription>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-2">
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
        </DialogContent>
      </Dialog>
    </>
  )
}
