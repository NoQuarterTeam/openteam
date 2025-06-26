import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "./ui/button"

export function SignOutButton() {
  const actions = useAuthActions()
  return (
    <Button variant="ghost" size="sm" className="w-full" onClick={() => void actions.signOut()}>
      Sign out
    </Button>
  )
}
