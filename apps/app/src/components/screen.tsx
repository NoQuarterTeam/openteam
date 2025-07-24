import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: insets.top, paddingBottom: insets.bottom }}>{children}</View>
}
