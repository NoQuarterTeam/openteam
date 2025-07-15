import { Authenticated, Unauthenticated, useQuery } from "convex/react"
import posthog from "posthog-js"
import { useEffect } from "react"
import { Outlet } from "react-router"
import { SignInForm } from "@/components/sign-in-form"
import { api } from "@/convex/_generated/api"

export default function App() {
  return (
    <>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <IdentifyUser />
        <Outlet />
      </Authenticated>
    </>
  )
}

function IdentifyUser() {
  const user = useQuery(api.auth.me)
  useEffect(() => {
    if (!user) return
    posthog.identify(user._id, { email: user.email, name: user.name })
  }, [user])
  return null
}
