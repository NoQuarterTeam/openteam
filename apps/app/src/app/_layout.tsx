import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexReactClient } from "convex/react"
import { Slot, SplashScreen } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toast } from "@/components/toaster"

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
})
SplashScreen.preventAutoHideAsync()

const secureStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: any) => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key)
  },
}

export default function Page() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <SafeAreaProvider>
      <ConvexAuthProvider client={convex} storage={secureStorage}>
        <Slot />
        <Toast />
      </ConvexAuthProvider>
    </SafeAreaProvider>
  )
}
