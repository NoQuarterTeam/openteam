import type { ExpoConfig } from "expo/config"

const IS_DEV = process.env.APP_VARIANT === "development"

const VERSION = "1.0.0"

export default {
  scheme: "openteam",
  name: IS_DEV ? "OpenTeam Dev" : "OpenTeam",
  slug: "openteam",
  owner: "noquarter",
  runtimeVersion: "fingerprint",
  userInterfaceStyle: "automatic",
  orientation: "portrait",
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    ["expo-web-browser", { experimentalLauncherActivity: true }],
    "expo-updates",
    "expo-dev-client",
    ["expo-document-picker", { iCloudContainerEnvironment: "Production" }],
    ["expo-image-picker", { photosPermission: "The app accesses your photos to let you share them in your messages." }],
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#fff",
        image: "./assets/images/splash-icon-light.png",
        dark: {
          image: "./assets/images/splash-icon-dark.png",
          backgroundColor: "#000000",
        },
        imageWidth: 200,
      },
    ],
  ],
  newArchEnabled: true,
  version: VERSION,
  backgroundColor: "#ffffff",
  experiments: {
    reactCanary: true,
    tsconfigPaths: true,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    icon: {
      dark: "./assets/images/ios-dark.png",
      light: "./assets/images/ios-light.png",
      tinted: "./assets/images/ios-tinted.png",
    },
    bundleIdentifier: IS_DEV ? "co.noquarter.openteam.dev" : "co.noquarter.openteam",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: "This app uses the camera to send photos to your team.",
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    package: IS_DEV ? "co.noquarter.openteam.dev" : "co.noquarter.openteam",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    permissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.DOWNLOAD_WITHOUT_NOTIFICATION",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.RECORD_AUDIO",
    ],
  },
  updates: {
    url: "https://u.expo.dev/d1ed4fc0-6042-4822-9544-c0799cdb4228",
  },
  web: {},
  extra: {
    eas: {
      projectId: "d1ed4fc0-6042-4822-9544-c0799cdb4228",
    },
  },
} satisfies ExpoConfig
