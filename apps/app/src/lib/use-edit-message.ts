import type { Id } from "@openteam/backend/convex/_generated/dataModel"
import { create } from "zustand"

type Message = { id: Id<"messages">; content: string }
export const useEditMessage = create<{
  message: Message | null
  setMessage: (message: Message | null) => void
}>()((set) => ({
  message: null,
  setMessage: (message) => set({ message }),
}))
