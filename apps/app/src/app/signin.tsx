import { useAuthActions } from "@convex-dev/auth/react"
import { makeRedirectUri } from "expo-auth-session"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { openAuthSessionAsync } from "expo-web-browser"
import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Button } from "@/components/ui/button"

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
  const insets = useSafeAreaInsets()
  return (
    <ScrollView style={{ flex: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom, paddingHorizontal: 16 }}>
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Image source={require("../../assets/images/logo.png")} style={{ width: 80, height: 80 }} />
      </View>
      <Text style={{ fontSize: 24, textAlign: "center", fontWeight: "bold", marginBottom: 24 }}>Sign in to OpenTeam</Text>

      <View style={{ flexDirection: "column", gap: 10 }}>
        <Button onPress={() => handleSignin("github")} disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "GitHub"}
        </Button>
        <Button onPress={() => handleSignin("google")} disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Google"}
        </Button>
      </View>
    </ScrollView>
  )
}
