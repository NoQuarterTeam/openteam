import { index, layout, type RouteConfig, route } from "@react-router/dev/routes"

export default [
  layout("./routes/auth-check.tsx", [
    layout("./routes/layout.tsx", [index("./routes/index.tsx"), route("/:channelId", "./routes/channel.tsx")]),
  ]),
] satisfies RouteConfig
