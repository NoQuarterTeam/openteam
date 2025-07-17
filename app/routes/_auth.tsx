import { Authenticated, Unauthenticated } from "convex/react"
import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router"

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md justify-center p-4 md:pt-20">
      <Authenticated>
        <Redirect />
      </Authenticated>
      <Unauthenticated>
        <Outlet />
      </Unauthenticated>
    </div>
  )
}

function Redirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate("/")
  }, [])
  return null
}
