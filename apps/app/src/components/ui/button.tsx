import { StyleProp, TextStyle, TouchableOpacity, TouchableOpacityProps, useColorScheme } from "react-native"
import { Text } from "./text"

interface Props extends TouchableOpacityProps {
  textStyle?: StyleProp<TextStyle>
  variant?: "primary" | "outline"
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button(props: Props) {
  const colorScheme = useColorScheme()
  const variantStyle = {
    primary: {
      backgroundColor: colorScheme === "dark" ? "#fff" : "#000",
      borderColor: "transparent",
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: colorScheme === "dark" ? "#444" : "#eee",
    },
  }[props.variant ?? "primary"]

  const variantTextStyle = {
    primary: {
      color: colorScheme === "dark" ? "#000" : "#fff",
    },
    outline: {
      color: colorScheme === "dark" ? "#fff" : "#000",
    },
  }[props.variant ?? "primary"]

  return (
    <TouchableOpacity
      {...props}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        opacity: props.disabled ? 0.7 : 1,
        ...variantStyle,
        ...(typeof props.style === "object" ? props.style : {}),
      }}
    >
      {props.leftIcon}
      <Text
        style={{
          textAlign: "center",
          fontSize: 16,
          ...variantTextStyle,
          ...(typeof props.textStyle === "object" ? props.textStyle : {}),
        }}
      >
        {props.children}
      </Text>
      {props.rightIcon}
    </TouchableOpacity>
  )
}
