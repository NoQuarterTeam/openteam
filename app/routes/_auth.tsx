import { Authenticated, Unauthenticated } from "convex/react"
import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router"

export default function Layout() {
  return (
    <div className="flex min-h-svh">
      <div className="mx-auto flex w-full max-w-md justify-center p-4 md:pt-20">
        <Authenticated>
          <Redirect />
        </Authenticated>
        <Unauthenticated>
          <Outlet />
        </Unauthenticated>
      </div>
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
