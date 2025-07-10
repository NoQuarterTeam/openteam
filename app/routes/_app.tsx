import { Authenticated, Unauthenticated } from "convex/react"
import { Outlet } from "react-router"
import { SignInForm } from "@/components/sign-in-form"

export default function App() {
  return (
    <>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <Outlet />
      </Authenticated>
    </>
  )
}
