import { useMutation, useQuery } from "convex/react"
import { BellIcon } from "lucide-react"
import posthog from "posthog-js"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useNotifications } from "@/lib/notifications"
import { FormField } from "../form-field"
import { Button } from "../ui/button"

export function SettingsProfile() {
  const user = useQuery(api.auth.me)

  const [name, setName] = useState(user?.name || user?.email || "")
  const [isUpdating, setIsUpdating] = useState(false)

  const updateProfile = useMutation(api.users.update)
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl)
  const { permission, isSupported, requestPermission } = useNotifications()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      posthog.capture("user_info_updated")
      await updateProfile({ name: name.trim() })
      toast.success("Profile updated!")
    } catch {
      toast.error("Failed to update profile")
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
    posthog.capture("user_image_updated")
    await updateProfile({ image: storageId })
    toast.success("Profile image updated!")
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    autoFocus: false,
    multiple: false,
    accept: {
      "image/*": [],
    },
  })
  return (
    <>
      {/* Avatar Section */}
      <div className="flex items-center gap-4 px-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-300">
          {user?.image ? (
            <img src={user.image} alt="Current avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="font-semibold text-2xl text-neutral-600">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <Button variant="outline" size="sm">
            {user?.image ? "Change Photo" : "Upload Photo"}
          </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex-1">
        <div className="space-y-3 p-4 pb-24">
          {/* Name Field */}
          <FormField
            name="name"
            label="Display Name"
            type="text"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your display name"
            required
          />

          {/* Notification Settings */}
          {isSupported && (
            <div className="space-y-2">
              <div className="block font-medium text-neutral-700 text-sm">Notifications</div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <BellIcon className="size-5 text-neutral-500" />
                  <div>
                    <p className="font-medium text-sm">Browser Notifications</p>
                    <p className="text-neutral-500 text-xs">
                      {permission === "granted"
                        ? "Enabled - You'll receive notifications for new messages"
                        : permission === "denied"
                          ? "Blocked - Enable in your browser settings to receive notifications"
                          : "Not enabled - Click to enable notifications"}
                    </p>
                  </div>
                </div>
                {permission !== "granted" && permission !== "denied" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const result = await requestPermission()
                      if (result === "granted") {
                        toast.success("Notifications enabled!")
                      } else {
                        toast.error("Notifications were not enabled")
                      }
                    }}
                  >
                    Enable
                  </Button>
                )}
                {permission === "denied" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info("Please enable notifications in your browser settings and refresh the page")
                    }}
                  >
                    Enable in Browser
                  </Button>
                )}
                {permission === "granted" && (
                  <div className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 text-xs">Enabled</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 w-full border-t bg-background p-4">
          <Button type="submit" disabled={!name || name === user?.name || isUpdating}>
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </>
  )
}
