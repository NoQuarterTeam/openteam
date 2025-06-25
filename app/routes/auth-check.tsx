import { Authenticated, Unauthenticated } from "convex/react"
import { Outlet } from "react-router"
import { SignInForm } from "@/components/sign-in-form"

export default function Component() {
  return (
    <div className="h-dvh w-screen">
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <Outlet />
      </Authenticated>
    </div>
  )
}
