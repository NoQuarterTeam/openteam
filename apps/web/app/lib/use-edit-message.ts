import type { Id } from "@openteam/backend/convex/_generated/dataModel"
import { create } from "zustand"

export const useEditMessage = create<{
  messageId: Id<"messages"> | null
  setMessageId: (messageId: Id<"messages"> | null) => void
}>()((set) => ({
  messageId: null,
  setMessageId: (messageId) => set({ messageId }),
}))
