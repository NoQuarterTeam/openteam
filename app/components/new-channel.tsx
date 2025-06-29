import { useMutation } from "convex/react"
import { PlusIcon } from "lucide-react"
import * as React from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"

export function NewChannel() {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full" title="Create channel">
          <PlusIcon />
          New channel
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-46 p-2" align="start">
        <NewChannelForm onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

export function NewChannelForm(props: { onClose: () => void }) {
  const [newChannelName, setNewChannelName] = React.useState("")
  const createChannel = useMutation(api.channels.create)
  const navigate = useNavigate()

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log("why")

    if (!newChannelName.trim()) return

    try {
      const channelId = await createChannel({ name: newChannelName.toLowerCase().trim() })
      props.onClose()
      await navigate(`/${channelId}`)
    } catch {
      toast.error("Failed to create channel")
    }
  }
  return (
    <form onSubmit={handleCreateChannel} className="flex flex-col gap-2">
      <Input
        type="text"
        placeholder="Channel name"
        value={newChannelName}
        onChange={(e) => setNewChannelName(e.target.value.toLowerCase())}
        autoFocus
      />
      <div className="flex justify-between gap-2">
        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={props.onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" className="flex-1">
          Create
        </Button>
      </div>
    </form>
  )
}
