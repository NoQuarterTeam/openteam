import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { Button } from "./ui/button"

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth()
  const actions = useAuthActions()
  if (!isAuthenticated) return null
  return (
    <Button variant="ghost" size="sm" className="w-full" onClick={() => void actions.signOut()}>
      Sign out
    </Button>
  )
}
