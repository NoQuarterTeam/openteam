import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConvexReactClient } from "convex/react"
import { ThemeProvider } from "next-themes"
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"
import { Toaster } from "sonner"
import type { Route } from "./+types/root"
import "./globals.css"

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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning className="min-h-dvh w-screen bg-muted/50 dark:bg-black/50">
        <ConvexAuthProvider client={convex}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider enableSystem attribute="class">
              {children}
            </ThemeProvider>
          </QueryClientProvider>
        </ConvexAuthProvider>
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
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}

export function HydrateFallback() {
  return <div className="h-dvh w-screen bg-neutral-50 dark:bg-neutral-900/50" />
}
