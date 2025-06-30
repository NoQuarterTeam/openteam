import { useMutation, useQuery } from "convex/react"
import { UserIcon } from "lucide-react"
import { useCallback, useId, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"
import { api } from "../../convex/_generated/api"
import { Button } from "./ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./ui/dialog"
import { DropdownMenuItem } from "./ui/dropdown-menu"
import { Input } from "./ui/input"

export function ProfileModal() {
  const [open, setOpen] = useState(false)
  const user = useQuery(api.auth.loggedInUser)

  const [name, setName] = useState(user?.name || user?.email || "")
  const [isUploading, setIsUploading] = useState(false)

  const updateProfile = useMutation(api.users.update)
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    try {
      await updateProfile({ name: name.trim() })
      toast.success("Profile updated!")
      setOpen(false)
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsUploading(false)
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
    await updateProfile({ image: storageId })
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
        <UserIcon />
        Profile
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information</DialogDescription>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-300">
              {user?.image ? (
                <img src={user.image} alt="Current avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="font-semibold text-2xl text-neutral-600">{name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button size="sm">{user?.image ? "Change Photo" : "Upload Photo"}</Button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor={inputId} className="mb-1 block font-medium text-neutral-700 text-sm">
                Display Name
              </label>
              <Input
                id={inputId}
                type="text"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your display name"
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
              <Button type="submit" disabled={!name.trim() || isUploading}>
                {isUploading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
