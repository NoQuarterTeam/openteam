import { useAuthActions } from "@convex-dev/auth/react"
import { ModalView } from "@/components/modal-view"
import { Button } from "@/components/ui/button"

export default function Page() {
  const { signOut } = useAuthActions()
  return (
    <ModalView title="Profile">
      <Button onPress={() => signOut()}>Logout</Button>
    </ModalView>
  )
}
