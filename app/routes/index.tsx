import { Authenticated, Unauthenticated } from "convex/react"
import { ChatApp } from "@/chat"
import { SignInForm } from "@/sign-in-form"
import type { Route } from "./+types/index"

export function meta(_: Route.MetaArgs) {
  return [{ title: "OpenTeam" }, { name: "description", content: "OpenTeam" }]
}

export default function Index() {
  return (
    <>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <ChatApp />
      </Authenticated>
    </>
  )
}
