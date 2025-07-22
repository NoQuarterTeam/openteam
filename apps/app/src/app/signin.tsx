import { useAuthActions } from "@convex-dev/auth/react"
import { makeRedirectUri } from "expo-auth-session"
import { useRouter } from "expo-router"
import { openAuthSessionAsync } from "expo-web-browser"
import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { Screen } from "@/components/screen"

export default function Page() {
  const { signIn } = useAuthActions()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const handleSignin = async (provider: "github" | "google") => {
    try {
      const redirectTo = makeRedirectUri()
      setIsSubmitting(true)
      const { redirect } = await signIn(provider, { redirectTo })
      const result = await openAuthSessionAsync(redirect.toString(), redirectTo)
      if (result.type === "success") {
        const { url } = result
        const code = new URL(url).searchParams.get("code")!
        await signIn(provider, { code })
        await new Promise((resolve) => setTimeout(resolve, 500))
        router.replace("/")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Sign in</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity
          // icon={Github}
          // size="$5"
          // themeInverse
          onPress={() => handleSignin("github")}
          disabled={isSubmitting}
          style={{ padding: 8, backgroundColor: "black", flex: 1 }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>{isSubmitting ? "Signing in..." : "GitHub"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          // icon={Github}
          // size="$5"
          // themeInverse
          onPress={() => handleSignin("google")}
          disabled={isSubmitting}
          style={{ padding: 8, backgroundColor: "black", flex: 1 }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>{isSubmitting ? "Signing in..." : "Google"}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}
