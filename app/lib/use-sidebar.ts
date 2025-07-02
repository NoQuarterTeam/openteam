import { create } from "zustand"

export const useSidebar = create<{
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  toggle: () => void
}>()((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
