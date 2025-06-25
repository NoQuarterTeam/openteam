import { useMutation, useQuery } from "convex/react"
import { UserIcon } from "lucide-react"
import { useId, useRef, useState } from "react"
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateProfile = useMutation(api.users.update)
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsUploading(true)
    try {
      let image = user?.image as Id<"_storage"> | undefined

      if (selectedFile) {
        // Upload new avatar
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        })

        if (!result.ok) throw new Error("Failed to upload image")

        const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }
        image = storageId as Id<"_storage">
      }

      await updateProfile({ name: name.trim(), image })

      toast.success("Profile updated!")
      setOpen(false)
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }
      setSelectedFile(file)
    }
  }

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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-300">
                {selectedFile ? (
                  <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-full w-full object-cover" />
                ) : user?.image ? (
                  <img src={user.image} alt="Current avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-2xl text-neutral-600">{name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <Button onClick={() => fileInputRef.current?.click()}>
                {user?.image || selectedFile ? "Change Photo" : "Upload Photo"}
              </Button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor={inputId} className="mb-1 block font-medium text-neutral-700 text-sm">
                Display Name
              </label>
              <Input
                id={inputId}
                type="text"
                value={name}
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
