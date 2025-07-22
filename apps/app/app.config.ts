import { ExpoConfig } from "expo/config"

export default {
  scheme: "openteam",
  userInterfaceStyle: "automatic",
  orientation: "default",
  plugins: ["expo-router", "expo-secure-store", ["expo-web-browser", { experimentalLauncherActivity: true }]],
  name: "OpenTeam",
  newArchEnabled: true,
  slug: "openteam",
  experiments: {
    reactCanary: true,
    typedRoutes: true,
    reactCompiler: true,
    tsconfigPaths: true,
  },
} satisfies ExpoConfig
