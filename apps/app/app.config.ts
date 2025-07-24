import type { ExpoConfig } from "expo/config"
export default {
  scheme: "openteam",
  name: "OpenTeam",
  slug: "openteam",
  userInterfaceStyle: "automatic",
  orientation: "default",
  plugins: ["expo-router", "expo-secure-store", ["expo-web-browser", { experimentalLauncherActivity: true }]],
  newArchEnabled: true,
  version: "1.0.0",
  icon: "./assets/icon.png",
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
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
} satisfies ExpoConfig
