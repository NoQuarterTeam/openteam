import { useMutation, useQuery } from "convex/react"
import { useId, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogOverlay } from "./ui/dialog"
import { Input } from "./ui/input"

interface ProfileModalProps {
  onClose: () => void
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const user = useQuery(api.auth.loggedInUser)

  const [name, setName] = useState(user?.name || user?.email || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateProfile = useMutation(api.users.update)
  const generateUploadUrl = useMutation(api.users.generateUploadUrl)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsUploading(true)
    try {
      let image = user?.image

      if (selectedFile) {
        // Upload new avatar
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        })

        if (!result.ok) {
          throw new Error("Failed to upload image")
        }

        const { storageId } = await result.json()
        image = storageId
      }

      await updateProfile({ name: name.trim(), image })

      toast.success("Profile updated!")
      onClose()
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
    <Dialog>
      <DialogOverlay />
      <DialogContent>
        <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-xl">Edit Profile</h2>
            <Button onClick={onClose} size="icon" variant="ghost">
              ×
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-300">
                {selectedFile ? (
                  <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-full w-full object-cover" />
                ) : user?.image ? (
                  <img src={user.image} alt="Current avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-2xl text-gray-600">{name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm transition-colors hover:bg-gray-200"
              >
                {user?.image || selectedFile ? "Change Photo" : "Upload Photo"}
              </button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor={inputId} className="mb-1 block font-medium text-gray-700 text-sm">
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
            <div className="flex gap-3 pt-4">
              <Button type="button" onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isUploading}>
                {isUploading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
