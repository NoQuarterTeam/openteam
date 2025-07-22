import { api } from "@openteam/backend/convex/_generated/api"
import { Authenticated, Unauthenticated, useQuery } from "convex/react"
import posthog from "posthog-js"
import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router"

export default function App() {
  return (
    <>
      <Unauthenticated>
        <Redirect />
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

function Redirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate("/login")
  }, [])
  return null
}
