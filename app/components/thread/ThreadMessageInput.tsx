import { useMutation } from "convex/react"
import { useState } from "react"
import { ExpandableTextarea } from "@/components/expandable-textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface ThreadMessageInputProps {
  threadId: Id<"threads">
}

export function ThreadMessageInput({ threadId }: ThreadMessageInputProps) {
  const [input, setInput] = useState("")
  
  const sendMessage = useMutation(api.threads.sendMessage)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    try {
      await sendMessage({ 
        threadId, 
        content: input.trim() 
      })
      setInput("")
    } catch (error) {
      console.error("Failed to send thread message:", error)
    }
  }

  return (
    <div className="border-t p-4">
      <form onSubmit={handleSubmit}>
        <ExpandableTextarea
          placeholder="Reply to thread..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
                     disabled={false}
        />
      </form>
    </div>
  )
}