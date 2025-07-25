import { TextInput, TextInputProps, useColorScheme } from "react-native"

export function Input(props: TextInputProps) {
  const colorScheme = useColorScheme()
  return (
    <TextInput
      {...props}
      style={{
        borderWidth: 1,
        borderRadius: 8,
        borderColor: colorScheme === "dark" ? "#222" : "#eee",
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: colorScheme === "dark" ? "#fff" : "#000",
        ...(typeof props.style === "object" ? props.style : {}),
      }}
    />
  )
}
