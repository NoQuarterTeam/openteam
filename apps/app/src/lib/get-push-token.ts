import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

export async function getPushToken() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()

    let finalStatus = existingStatus

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== "granted") {
      // User doesn't allow us to send notifications
      // alert("Failed to get push token for push notification!")
      return
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig!.extra!.eas.projectId })).data

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      })
    }

    return token
  } catch (error) {
    console.log(error)
  }
}
