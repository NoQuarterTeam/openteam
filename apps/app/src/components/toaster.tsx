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
            style={{ width: "95%", borderLeftWidth: 0, backgroundColor: "white", borderRadius: 5 }}
            text1Style={{ color: "black", fontSize: 13, fontFamily: "poppins500" }}
            contentContainerStyle={{ paddingLeft: 8 }}
            text2Style={{ color: "black", opacity: 0.8, fontSize: 11, fontFamily: "poppins400" }}
            renderLeadingIcon={() => (
              <View style={{ height: "100%", alignItems: "center", justifyContent: "center", paddingLeft: 8 }}>
                <CheckCircle2Icon color="black" />
              </View>
            )}
          />
        ),
        error: (props) => (
          <BaseToast
            {...props}
            style={{ width: "95%", borderLeftWidth: 0, backgroundColor: "red", borderRadius: 5 }}
            text1Style={{ color: "white", fontSize: 13, fontFamily: "poppins500" }}
            text2NumberOfLines={1}
            contentContainerStyle={{ paddingLeft: 8 }}
            renderLeadingIcon={() => (
              <View style={{ height: "100%", alignItems: "center", justifyContent: "center", paddingLeft: 8 }}>
                <XCircleIcon color="white" />
              </View>
            )}
            text2Style={{ color: "white", opacity: 0.8, fontSize: 11, fontFamily: "poppins400" }}
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
    topOffset: 58,
    text2: props.message,
    position: "top",
  })
}
