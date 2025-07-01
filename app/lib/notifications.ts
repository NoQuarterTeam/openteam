import { useNavigate } from "react-router"
import type { Id } from "@/convex/_generated/dataModel"

export type NotificationPermission = "granted" | "denied" | "default"

export class NotificationService {
  private static instance: NotificationService
  private navigate?: (path: string) => void
  private audio?: HTMLAudioElement

  private constructor() {
    // Initialize notification sound
    if (typeof window !== "undefined") {
      this.audio = new Audio("/notification.mp3")
      this.audio.volume = 0.3 // Set to 30% volume
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  setNavigate(navigate: (path: string) => void) {
    this.navigate = navigate
  }

  getPermission(): NotificationPermission {
    if (!("Notification" in window)) {
      return "denied"
    }
    return Notification.permission as NotificationPermission
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      return "denied"
    }

    if (Notification.permission === "granted") {
      return "granted"
    }

    if (Notification.permission === "denied") {
      return "denied"
    }

    try {
      const permission = await Notification.requestPermission()
      return permission as NotificationPermission
    } catch (error) {
      console.error("Error requesting notification permission:", error)
      return "denied"
    }
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window
  }

  private playNotificationSound() {
    if (this.audio) {
      try {
        this.audio.currentTime = 0
        this.audio.play().catch((error) => {
          // Ignore audio play errors (e.g., user hasn't interacted with page yet)
          console.debug("Could not play notification sound:", error)
        })
      } catch (error) {
        console.debug("Could not play notification sound:", error)
      }
    }
  }

  sendNotification({ title, body, channelId, icon }: { title: string; body: string; channelId: Id<"channels">; icon?: string }) {
    if (!this.isSupported() || this.getPermission() !== "granted") {
      return
    }

    try {
      // Play notification sound
      this.playNotificationSound()

      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: `channel-${channelId}`, // This replaces previous notifications from the same channel
        requireInteraction: false,
        silent: true, // We handle sound ourselves
      })

      notification.onclick = () => {
        // Focus the window first
        if (window.parent) {
          window.parent.focus()
        }
        window.focus()

        // Navigate to the channel
        if (this.navigate) {
          this.navigate(`/${channelId}`)
        }

        // Close the notification
        notification.close()
      }

      // Auto-close after 8 seconds
      setTimeout(() => {
        notification.close()
      }, 8000)

      return notification
    } catch (error) {
      console.error("Error sending notification:", error)
    }
  }
}

export function useNotifications() {
  const navigate = useNavigate()
  const notificationService = NotificationService.getInstance()

  // Set up navigation for the service
  notificationService.setNavigate(navigate)

  return {
    permission: notificationService.getPermission(),
    isSupported: notificationService.isSupported(),
    requestPermission: () => notificationService.requestPermission(),
    sendNotification: (data: Parameters<typeof notificationService.sendNotification>[0]) =>
      notificationService.sendNotification(data),
  }
}
