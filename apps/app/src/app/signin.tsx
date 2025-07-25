import { useAuthActions } from "@convex-dev/auth/react"
import { makeRedirectUri } from "expo-auth-session"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { openAuthSessionAsync } from "expo-web-browser"
import { useState } from "react"
import { ScrollView, useColorScheme, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Path } from "react-native-svg"
import { Button } from "@/components/ui/button"

export default function Page() {
  const colorScheme = useColorScheme()
  const { signIn } = useAuthActions()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const handleSignin = async (provider: "github" | "google" | "apple") => {
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
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 48,
        paddingHorizontal: 16,
        justifyContent: "space-between",
      }}
    >
      <View style={{ alignItems: "center", justifyContent: "center", gap: 12, width: "100%", alignSelf: "center", flex: 1 }}>
        <Image
          source={
            colorScheme === "dark" ? require("../../assets/images/logo-dark.png") : require("../../assets/images/logo-light.png")
          }
          style={{ width: 160, height: 160 }}
        />

        <Button
          onPress={() => handleSignin("google")}
          disabled={isSubmitting}
          style={{ width: "100%" }}
          leftIcon={
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill={colorScheme === "dark" ? "#000" : "#fff"}
              />
            </Svg>
          }
        >
          Sign in with Google
        </Button>
        <Button
          onPress={() => handleSignin("github")}
          disabled={isSubmitting}
          style={{ width: "100%" }}
          leftIcon={
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                fill={colorScheme === "dark" ? "#000" : "#fff"}
              />
            </Svg>
          }
        >
          Sign in with GitHub
        </Button>
        <Button
          onPress={() => handleSignin("apple")}
          disabled={isSubmitting}
          style={{ width: "100%" }}
          leftIcon={
            <Svg width={20} height={20} viewBox="0 0 814 1000">
              <Path
                d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
                fill={colorScheme === "dark" ? "#000" : "#fff"}
              />
            </Svg>
          }
        >
          Sign in with Apple
        </Button>
      </View>
      {/* <Text style={{ fontSize: 24, textAlign: "center", fontWeight: "bold", marginBottom: 24 }}>OpenTeam</Text> */}
    </ScrollView>
  )
}
