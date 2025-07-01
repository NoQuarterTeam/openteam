import { create } from "zustand"
import type { Id } from "@/convex/_generated/dataModel"

interface ThreadState {
  currentThreadId: Id<"threads"> | null
  isOpen: boolean
  openThread: (threadId: Id<"threads">) => void
  closeThread: () => void
}

export const useThreadStore = create<ThreadState>((set) => ({
  currentThreadId: null,
  isOpen: false,
  openThread: (threadId) => set({ currentThreadId: threadId, isOpen: true }),
  closeThread: () => set({ currentThreadId: null, isOpen: false }),
}))