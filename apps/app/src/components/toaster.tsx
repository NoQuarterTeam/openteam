import { CheckCircle2Icon, XCircleIcon } from "lucide-react-native"
import { View } from "react-native"
import RNToast, { BaseToast, type ToastShowParams } from "react-native-toast-message"

export function Toast() {
  return (
    <RNToast
      position="bottom"
      config={{
        success: (props) => (
          <BaseToast
            {...props}
            style={{ width: "90%", borderLeftWidth: 0, backgroundColor: "white", borderRadius: 12 }}
            text1Style={{ fontSize: 13, fontWeight: 500 }}
            contentContainerStyle={{ paddingLeft: 16 }}
            text2Style={{ opacity: 0.8, fontSize: 11 }}
            renderLeadingIcon={() => (
              <View style={{ height: "100%", alignItems: "center", justifyContent: "center", paddingLeft: 8 }}>
                <CheckCircle2Icon />
              </View>
            )}
          />
        ),
        error: (props) => (
          <BaseToast
            {...props}
            style={{ width: "90%", borderLeftWidth: 0, backgroundColor: "red", borderRadius: 12 }}
            text1Style={{ color: "white", fontSize: 13, fontWeight: 500 }}
            text2NumberOfLines={1}
            contentContainerStyle={{ paddingLeft: 16 }}
            renderLeadingIcon={() => (
              <View style={{ height: "100%", alignItems: "center", justifyContent: "center", paddingLeft: 8 }}>
                <XCircleIcon color="white" />
              </View>
            )}
            text2Style={{ color: "white", opacity: 0.8, fontSize: 11 }}
          />
        ),
      }}
    />
  )
}

export function toast(
  props: Omit<ToastShowParams, "text1" | "text2"> & { title: string; message?: string; type?: "success" | "error" },
) {
  RNToast.show({
    ...props,
    text1: props.title,
    autoHide: true,
    // visibilityTime: 20000,
    bottomOffset: 30,
    text2: props.message,
    position: "bottom",
  })
}
