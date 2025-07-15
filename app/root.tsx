import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConvexReactClient } from "convex/react"
import { ThemeProvider } from "next-themes"
import { PostHogProvider } from "posthog-js/react"
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"
import { Toaster } from "sonner"
import type { Route } from "./+types/root"
import "./globals.css"
import "highlight.js/styles/github-dark.css"
import { ConvexError } from "convex/values"

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
const convexQueryClient = new ConvexQueryClient(convex)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
})
convexQueryClient.connect(queryClient)

export function meta(_: Route.MetaArgs) {
  return [{ title: "OpenTeam" }, { name: "description", content: "OpenTeam" }]
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning className="bg-muted/50 dark:bg-black/50">
        <PostHogProviderWrapper>
          <ConvexAuthProvider client={convex}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider enableSystem attribute="class">
                {children}
              </ThemeProvider>
            </QueryClientProvider>
          </ConvexAuthProvider>
        </PostHogProviderWrapper>
        <ScrollRestoration />
        <Scripts />
        <Toaster />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex h-svh w-screen flex-col items-center justify-center">
        <h1 className="font-bold text-4xl">
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    )
  } else if (error instanceof ConvexError) {
    return (
      <div className="flex h-svh w-screen flex-col items-center p-4 md:p-16">
        <div className="w-full max-w-lg rounded-xl border p-4">
          <p>There was an error processing your request</p>
          <p className="font-bold text-4xl">{error.data}</p>
          <details>
            <summary>Details</summary>
            <p>{error.message}</p>
          </details>
        </div>
      </div>
    )
  } else if (error instanceof Error) {
    return (
      <div className="flex h-svh w-screen flex-col items-center p-4 md:p-16">
        <div className="w-full space-y-2 rounded-xl border p-4">
          <h1 className="font-bold text-4xl">Oops! An error occurred</h1>
          <p>{error.message}</p>
          <pre className="w-full overflow-x-auto whitespace-break-spaces rounded-lg border bg-muted p-4">{error.stack}</pre>
        </div>
      </div>
    )
  } else {
    return <h1>Unknown Error</h1>
  }
}

export function HydrateFallback() {
  return <div className="h-dvh w-screen bg-neutral-50 dark:bg-neutral-900/50" />
}

function PostHogProviderWrapper({ children }: { children: React.ReactNode }) {
  if (import.meta.env.MODE === "development") return children

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: "2025-05-24",
        capture_exceptions: true,
        capture_pageleave: true,
        capture_heatmaps: true,
        capture_pageview: true,
        capture_performance: true,
      }}
    >
      {children}
    </PostHogProvider>
  )
}
