import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"
import type { Id } from "@/convex/_generated/dataModel"

export const RECENT_CHANNELS_KEY = `ot.recent.channels`

const storage: StateStorage = {
  getItem: (key) => {
    try {
      const item = window.localStorage.getItem(key)
      if (!item) return []
      return JSON.parse(item) as any
    } catch {
      return []
    }
  },
  setItem: (key, value) => {
    try {
      const v = JSON.stringify(value)
      window.localStorage.setItem(key, v)
    } catch {
      // ignore
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

export const useRecentChannels = create<{
  channels: Id<"channels">[]
  addChannel: (channel: Id<"channels">) => void
}>()(
  persist(
    (set) => ({
      channels: [],
      addChannel: (channelId) =>
        set((prev) => ({ channels: [channelId, ...prev.channels.filter((id) => id !== channelId)].slice(0, 5) })),
    }),
    {
      name: RECENT_CHANNELS_KEY,
      storage: createJSONStorage(() => storage),
    },
  ),
)
