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
    "expo-secure-store",
    ["expo-web-browser", { experimentalLauncherActivity: true }],
    "expo-updates",
    "expo-dev-client",
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#fff",
        image: "./assets/images/splash-icon.png",
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
    },
  },
  android: {
    package: IS_DEV ? "co.noquarter.openteam.dev" : "co.noquarter.openteam",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  web: {},
  extra: {
    eas: {
      projectId: "d1ed4fc0-6042-4822-9544-c0799cdb4228",
    },
  },
} satisfies ExpoConfig
