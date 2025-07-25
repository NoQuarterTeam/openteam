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
  ],
  newArchEnabled: true,
  version: VERSION,
  icon: "./assets/icon.png",
  backgroundColor: "#ffffff",
  experiments: {
    reactCanary: true,
    tsconfigPaths: true,
  },
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#fff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: IS_DEV ? "co.noquarter.openteam.dev" : "co.noquarter.openteam",
    supportsTablet: true,
  },
  android: {
    package: IS_DEV ? "co.noquarter.openteam.dev" : "co.noquarter.openteam",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "d1ed4fc0-6042-4822-9544-c0799cdb4228",
    },
  },
} satisfies ExpoConfig
