import { TextInput, TextInputProps } from "react-native"

export function Input(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={{
        borderWidth: 1,
        borderRadius: 8,
        borderColor: "#eee",
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        ...(typeof props.style === "object" ? props.style : {}),
      }}
    />
  )
}
