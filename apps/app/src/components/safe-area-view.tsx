import type { ComponentProps } from "react"
import { SafeAreaView as RSafeAreaView } from "react-native-safe-area-context"

export function SafeAreaView({ style = { flex: 1 }, ...props }: ComponentProps<typeof RSafeAreaView>) {
  return <RSafeAreaView edges={["top"]} {...props} style={style} />
}
