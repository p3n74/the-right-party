import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@the-right-party/ui/components/sonner";

import Header from "@/components/header";
import { GrainOverlay } from "@/components/party/grain-overlay";
import { ThemeProvider } from "@/components/theme-provider";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Acquaintance Afterparty",
      },
      {
        name: "description",
        content: "Afterparty of the DCISM Acquaintance Party. Tagu Cafe and Bar. 11 PM. ₱1,000.",
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", href: "/favicon-32.png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPoster = pathname === "/poster" || pathname === "/poster-2";

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <GrainOverlay />
        <div className="relative grid min-h-[100dvh]">
          <div className="absolute inset-x-0 top-0 z-20 max-w-full overflow-x-clip">
            <Header />
          </div>
          <Outlet />
        </div>
        {isPoster ? null : <Toaster />}
      </ThemeProvider>
      {isPoster ? null : <TanStackRouterDevtools position="bottom-left" />}
      {isPoster ? null : <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />}
    </>
  );
}
