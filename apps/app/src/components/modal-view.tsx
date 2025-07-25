import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { XIcon } from "lucide-react-native"
import type * as React from "react"
import { TouchableOpacity, useColorScheme, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { SafeAreaView } from "./safe-area-view"
import { Toast } from "./toaster"
import { Text } from "./ui/text"

interface Props {
  title?: string
  shouldRenderToast?: boolean
  containerClassName?: string
  onBack?: () => void
  children?: React.ReactNode
  edges?: ("top" | "bottom")[]
}

export function ModalView({ shouldRenderToast = true, ...props }: Props) {
  const router = useRouter()
  const colorScheme = useColorScheme()
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <SafeAreaView
          edges={["top"]}
          {...props}
          style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#000" : "#fff", padding: 16 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 8 }}>
            {props.title ? (
              <Text style={{ width: "88%", fontSize: 24 }} numberOfLines={1}>
                {props.title}
              </Text>
            ) : (
              <Text />
            )}
            <TouchableOpacity onPress={props.onBack || router.back} style={{ padding: 4 }}>
              <XIcon size={24} color={colorScheme === "dark" ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>

          {props.children}
          <StatusBar style="light" />
          {shouldRenderToast && <Toast />}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
