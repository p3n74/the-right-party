import { useRouterState } from "@tanstack/react-router";

export function GrainOverlay() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/poster" || pathname === "/poster-2") {
    return null;
  }
  return <div className="grain-overlay" />;
}
