import { useAuthActions } from "@convex-dev/auth/react"
import { ConvexError } from "convex/values"
import { useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"

export default function Page() {
  const [searchParams] = useSearchParams()
  const { signIn } = useAuthActions()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  if (!searchParams.get("email")) return <div>Invalid request</div>

  return (
    <div className="w-full">
      <Card>
        <CardContent>
          <form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault()
              setIsSubmitting(true)
              const formData = new FormData(event.currentTarget)
              void signIn("password", formData)
                .catch((e) => {
                  if (e instanceof ConvexError) {
                    toast.error(e.data)
                  } else if (e instanceof Error) {
                    if (
                      e.message.includes("InvalidAccountId") ||
                      e.message.includes("InvalidCredentials") ||
                      e.message.includes("InvalidSecret")
                    ) {
                      toast.error("Invalid credentials")
                    } else if (e.message.includes("Could not verify code")) {
                      toast.error("Invalid code")
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
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center text-center">
                <h1 className="font-bold text-2xl">Verify you email</h1>
                <p className="text-muted-foreground text-sm">
                  We sent a code to <span className="text-foreground">{searchParams.get("email")}</span>. Please enter it below to
                  continue.
                </p>
              </div>
              <input name="flow" type="hidden" value="email-verification" />
              <input name="email" value={searchParams.get("email") || ""} type="hidden" />
              <div className="flex justify-center">
                <InputOTP
                  maxLength={8}
                  name="code"
                  id="code"
                  onComplete={() => {
                    formRef.current?.requestSubmit()
                  }}
                >
                  <InputOTPGroup>
                    {Array(8)
                      .fill(null)
                      .map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="text-white dark:text-black" /> : "Continue"}
              </Button>
              <Link to="/login" className="text-center text-sm underline-offset-2 hover:underline">
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
