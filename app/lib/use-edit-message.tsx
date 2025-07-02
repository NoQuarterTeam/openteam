import { create } from "zustand"
import type { Id } from "@/convex/_generated/dataModel"

export const useEditMessage = create<{
  messageId: Id<"messages"> | null
  setMessageId: (messageId: Id<"messages"> | null) => void
}>()((set) => ({
  messageId: null,
  setMessageId: (messageId) => set({ messageId }),
}))
