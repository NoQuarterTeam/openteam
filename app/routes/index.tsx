import { ChatApp } from "@/chat"
import { isAuthenticated } from "@/convex/auth"
import { SignInForm } from "@/SignInForm"
import type { Route } from "./+types/index"

export function meta(_: Route.MetaArgs) {
  return [{ title: "OpenTeam" }, { name: "description", content: "OpenTeam" }]
}

export default function Index() {
  const aafa = isAuthenticated

  console.log({ aafa })

  if (!isAuthenticated) return <SignInForm />
  return <ChatApp />
}
