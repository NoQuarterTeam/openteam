import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GitHubIcon } from "./github-icon"
import { Input } from "./ui/input"

export function SignInForm() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn")

  return (
    <div className="flex h-dvh flex-col items-center justify-start bg-muted/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-background p-8">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-bold text-2xl text-neutral-900 tracking-tight dark:text-neutral-100">Welcome to OpenTeam</h2>
        </div>
        <Button variant="outline" className="w-full" onClick={() => void signIn("github")}>
          <GitHubIcon />
          Sign in with GitHub
        </Button>
        <hr />
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            formData.set("flow", flow)
            void signIn("password", formData)
          }}
        >
          <div className="space-y-4">
            {flow === "signUp" && <Input type="text" name="name" placeholder="Name" required autoComplete="name" />}
            <Input type="email" name="email" placeholder="Email" required autoComplete="email" />
            <Input type="password" name="password" placeholder="Password" required autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full">
            {flow === "signUp" ? "Sign up" : "Sign in"}
          </Button>

          <Button variant="link" className="w-full" onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}>
            {flow === "signIn" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
