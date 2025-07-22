import { type RouteConfig } from "@react-router/dev/routes"
import { flatRoutes } from "@react-router/fs-routes"

// export default [
//   layout("./routes/auth-check.tsx", [
//     index("./routes/index.tsx"),
//     ...prefix(":teamId", [
//       layout("./routes/channel-layout.tsx", [index("./routes/no-channel.tsx"), route("/:channelId", "./routes/channel.tsx")]),
//     ]),
//   ]),
// ] satisfies RouteConfig

export default flatRoutes() satisfies RouteConfig
