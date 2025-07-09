import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import babel from "vite-plugin-babel"
import devtoolsJson from "vite-plugin-devtools-json"
import { VitePWA } from "vite-plugin-pwa"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    devtoolsJson(),
    babel({
      include: /\.tsx?$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    VitePWA({
      registerType: "autoUpdate", // Automatically update the SW when new version is detected
      injectRegister: "auto", // Injects the SW registration script into index.html
      strategies: "generateSW", // Use Workbox to generate a full Service Worker
      devOptions: {
        enabled: true, // Enable PWA in development mode for testing
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // Pre-cache all your static assets in the 'dist' folder.
        // This pattern covers common file types.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,webp,woff2,ttf}"],
        // Important for SPAs with client-side routing like React Router:
        // When a user goes offline and navigates to a deep link (e.g., /about),
        // the Service Worker should serve your main index.html file, and then
        // React Router on the client will take over to render the correct route.
        navigateFallback: "/index.html",
        // Ensure index.html is also pre-cached
        additionalManifestEntries: [
          { url: "/index.html", revision: "1" }, // Or use a timestamp as revision if your index.html changes frequently
        ],
        // Define runtime caching strategies for dynamic assets (e.g., images, API calls)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.includes("/assets/"), // Example for images in assets folder
            handler: "CacheFirst", // Or StaleWhileRevalidate for faster initial load
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // Cache images for 30 days
              },
              cacheableResponse: {
                statuses: [0, 200], // Cache opaque responses and OK responses
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"), // Example for API calls
            handler: "NetworkFirst", // Or CacheFirst for highly static API data
            options: {
              cacheName: "api-data-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 5, // Cache API data for 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "OpenTeam",
        short_name: "OpenTeam",
        description: "OpenTeam - Open source team chat app",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
})
