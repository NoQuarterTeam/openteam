import { StyleProp, Text, TextStyle, TouchableOpacity, TouchableOpacityProps } from "react-native"

interface Props extends TouchableOpacityProps {
  textStyle?: StyleProp<TextStyle>
  variant?: "primary" | "outline"
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button(props: Props) {
  const variantStyle = {
    primary: {
      backgroundColor: "#000",
      borderColor: "transparent",
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: "#eee",
    },
  }[props.variant ?? "primary"]

  const variantTextStyle = {
    primary: {
      color: "white",
    },
    outline: {
      color: "#000",
    },
  }[props.variant ?? "primary"]

  return (
    <TouchableOpacity
      {...props}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
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
