import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { ConvexError } from "convex/values"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { FormField } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"

export default function Page() {
  const { isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<"forgot" | { email: string }>("forgot")
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex w-full max-w-md justify-center bg-background p-4 md:pt-20">
      <Card className="w-full">
        <CardContent>
          {step !== "forgot" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                setIsSubmitting(true)
                const formData = new FormData(e.target as HTMLFormElement)
                void signIn("password", formData)
                  .then(() => {
                    if (isAuthenticated) {
                      navigate("/")
                    } else {
                      navigate("/login")
                    }
                  })
                  .catch((e) => {
                    if (e instanceof ConvexError) {
                      toast.error("Invalid code")
                    } else {
                      toast.error("An unknown error occurred")
                    }
                  })
                  .finally(() => {
                    setIsSubmitting(false)
                  })
              }}
            >
              <div className="flex flex-col items-center text-center">
                <h1 className="font-bold text-2xl">Check your email</h1>
                <p className="text-muted-foreground text-sm">
                  Enter the 8-digit code we sent to your email address and choose a new password.
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={8} name="code" id="code">
                  <InputOTPGroup>
                    {Array(8)
                      .fill(null)
                      .map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <input type="hidden" name="flow" value="reset-verification" />
              <input type="hidden" name="email" value={step.email} />
              <FormField name="newPassword" label="New password" type="password" placeholder="********" required />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="text-white dark:text-black" /> : "Reset password"}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                setIsSubmitting(true)
                const formData = new FormData(e.target as HTMLFormElement)
                void signIn("password", formData)
                  .then(() => {
                    setStep({ email: formData.get("email") as string })
                  })
                  .catch((e) => {
                    if (e instanceof ConvexError) {
                      toast.error(e.data.email?.[0] ?? "An unknown error occurred")
                    } else if (e instanceof Error) {
                      if (
                        e.message.includes("InvalidAccountId") ||
                        e.message.includes("InvalidCredentials") ||
                        e.message.includes("InvalidSecret")
                      ) {
                        setStep({ email: formData.get("email") as string })
                      } else {
                        toast.error("An unknown error occurred")
                      }
                    } else {
                      toast.error("An unknown error occurred")
                    }
                  })
                  .finally(() => {
                    setIsSubmitting(false)
                  })
              }}
            >
              <div className="flex flex-col items-center text-center">
                <h1 className="font-bold text-2xl">Reset your password</h1>
              </div>
              <input type="hidden" name="flow" value="reset" />
              <FormField name="email" label="Email" type="email" placeholder="m@example.com" required />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="text-white dark:text-black" /> : "Send reset email"}
              </Button>

              {isAuthenticated ? (
                <Link to="/" className="text-center text-muted-foreground text-sm underline underline-offset-4">
                  Back
                </Link>
              ) : (
                <Link to="/login" className="text-center text-muted-foreground text-sm underline underline-offset-4">
                  Back to login
                </Link>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
