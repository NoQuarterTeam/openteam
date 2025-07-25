import { Text as RNText, TextProps, useColorScheme } from "react-native"

export function Text(props: TextProps) {
  const colorScheme = useColorScheme()
  return (
    <RNText
      {...props}
      style={{ color: colorScheme === "dark" ? "#fff" : "#000", ...(typeof props.style === "object" ? props.style : {}) }}
    />
  )
}
