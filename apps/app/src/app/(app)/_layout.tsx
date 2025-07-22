import { Authenticated, Unauthenticated } from "convex/react"
import { Redirect, Slot } from "expo-router"

export default function Layout() {
  return (
    <>
      <Unauthenticated>
        <Redirect href="/signin" />
      </Unauthenticated>
      <Authenticated>
        <Slot />
      </Authenticated>
    </>
  )
}
