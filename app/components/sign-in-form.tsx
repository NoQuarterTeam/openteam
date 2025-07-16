import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GitHubIcon } from "./github-icon"
import { Input } from "./ui/input"

export function SignInForm() {
  const { signIn } = useAuthActions()
  // const [flow, setFlow] = useState<"signIn" | "signUp">("signIn")

  const [step, setStep] = useState<"signIn" | "signUp" | { email: string }>("signIn")

  return step === "signIn" || step === "signUp" ? (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-4 rounded-xl border p-6">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-bold text-2xl text-neutral-900 tracking-tight dark:text-neutral-100">Welcome to OpenTeam</h2>
        </div>
        <Button variant="outline" className="w-full" onClick={() => void signIn("github")}>
          <GitHubIcon />
          Sign in with GitHub
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-px w-full bg-border" />
          <span className="text-muted-foreground text-sm">or</span>
          <div className="h-px w-full bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={() => void signIn("anonymous")}>
          Create guest account
        </Button>
        <hr />
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            formData.set("flow", step)
            void signIn("password", formData)
          }}
        >
          <div className="space-y-4">
            <Input type="email" name="email" placeholder="Email" required autoComplete="email" />
            <Input type="password" name="password" placeholder="Password" required autoComplete="current-password" />
            {step === "signUp" && <Input type="text" name="name" placeholder="Name" required autoComplete="name" />}
          </div>
          <Button type="submit" className="w-full">
            {step === "signUp" ? "Sign up" : "Sign in"}
          </Button>

          <Button variant="link" className="w-full" onClick={() => setStep(step === "signIn" ? "signUp" : "signIn")}>
            {step === "signIn" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </form>
      </div>
    </div>
  ) : (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        void signIn("password", formData)
      }}
    >
      <input name="code" placeholder="Code" type="text" />
      <input name="flow" type="hidden" value="email-verification" />
      <input name="email" value={step.email} type="hidden" />
      <button type="submit">Continue</button>
      <button type="button" onClick={() => setStep("signIn")}>
        Cancel
      </button>
    </form>
  )
}
