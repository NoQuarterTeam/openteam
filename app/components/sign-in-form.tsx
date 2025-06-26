import { useAuthActions } from "@convex-dev/auth/react"
import { ConvexError } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitHubIcon } from "./github-icon"

export function SignInForm() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn")
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-muted/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-background p-8">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-bold text-2xl text-neutral-900 tracking-tight dark:text-neutral-100">
            {flow === "signIn" ? "Sign in to your account" : "Create a new account"}
          </h2>
          <p className="text-neutral-500 text-sm dark:text-neutral-400">
            {flow === "signIn" ? "Welcome back! Please enter your details." : "Sign up to get started."}
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => void signIn("github")}>
          <GitHubIcon />
          Sign {flow === "signIn" ? "in" : "up"} with GitHub
        </Button>
        <hr />
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitting(true)
            const formData = new FormData(e.target as HTMLFormElement)
            formData.set("flow", flow)
            void signIn("password", formData).catch((error) => {
              let toastTitle = ""
              if (error instanceof ConvexError) {
                if (error.data.fieldErrors?.email) {
                  toastTitle = error.data.fieldErrors.email[0]
                } else if (error.data.fieldErrors?.password) {
                  toastTitle = error.data.fieldErrors.password[0]
                } else {
                  toastTitle = error.data.message
                }
              } else {
                toastTitle =
                  flow === "signIn"
                    ? "Could not sign in, did you mean to sign up?"
                    : "Could not sign up, did you mean to sign in?"
              }
              toast.error(toastTitle)
              setSubmitting(false)
            })
          }}
        >
          <div className="space-y-4">
            {flow === "signUp" && <Input type="text" name="name" placeholder="Display name" required autoComplete="name" />}
            <Input type="email" name="email" placeholder="Email" required autoComplete="email" />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              required
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : flow === "signIn" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <div className="flex items-center justify-between">
          <span className="text-neutral-500 text-sm dark:text-neutral-400">
            {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}
          </span>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-primary"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </Button>
        </div>
      </div>
    </div>
  )
}
