import { Outlet } from "react-router"
import { Nav } from "@/components/nav"
import { Sidebar } from "@/components/sidebar"

export default function Component() {
  return (
    <div className="flex h-screen flex-col">
      <Nav />

      <div className="flex w-full flex-1 overflow-hidden">
        <Sidebar />
        <NotificationHandler />
        <Outlet />
      </div>
    </div>
  )
}

function NotificationHandler() {
  // const channelId = use
  return null
}
