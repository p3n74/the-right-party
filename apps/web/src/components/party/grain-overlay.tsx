import { useRouterState } from "@tanstack/react-router";

export function GrainOverlay() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname === "/poster") {
    return null;
  }
  return <div className="grain-overlay" />;
}
