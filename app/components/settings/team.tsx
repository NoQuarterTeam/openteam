import { useMutation, useQuery } from "convex/react"
import posthog from "posthog-js"
import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useParams } from "react-router"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { FormField } from "../form-field"
import { Button } from "../ui/button"

export function TeamSettingsInfo() {
  const { teamId } = useParams<{ teamId: Id<"teams"> }>()
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip")
  const [isUpdating, setIsUpdating] = useState(false)

  const [name, setName] = useState(team?.name || "")

  useEffect(() => {
    if (team) {
      setName(team.name || "")
    }
  }, [team])

  const updateTeam = useMutation(api.teams.update)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      if (!teamId) return
      posthog.capture("team_info_updated", { teamId })
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

    const { storageId } = (await result.json()) as {
      storageId: Id<"_storage">
    }
    if (!teamId) return
    posthog.capture("team_image_updated", { teamId })
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

  return (
    <>
      {/* Avatar Section */}
      <div className="flex items-center gap-4 px-4">
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
      <form onSubmit={handleSubmit} className="flex-1">
        <div className="space-y-3 p-4 pb-24">
          <FormField name="name" label="Team Name" type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="absolute bottom-0 w-full border-t bg-background p-4">
          <Button type="submit" disabled={!name || name === team?.name || isUpdating}>
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </>
  )
}
