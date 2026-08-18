import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/rsvp" });
  },
  component: () => null,
});
