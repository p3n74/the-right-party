import { Link, useRouterState } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: session, isPending } = authClient.useSession();
  const me = useQuery({
    ...trpc.rsvp.me.queryOptions(),
    enabled: Boolean(session),
  });

  if (pathname === "/poster") {
    return null;
  }

  return (
    <header className="relative z-20 flex h-16 items-center justify-between px-4 md:px-8">
      <Link to="/" className="font-display text-xl text-magenta md:text-2xl">
        The Right Party
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {me.data?.isAdmin ? (
          <Link to="/admin" className="text-ink-2 hover:text-ink">
            Admin
          </Link>
        ) : null}
        {isPending ? (
          <span className="text-ink-2">Loading_</span>
        ) : session ? (
          <div className="flex items-center gap-3">
            <Link to="/rsvp" className="text-ink hover:text-magenta">
              Your ticket
            </Link>
            <button
              type="button"
              className="text-ink-2 hover:text-ink"
              onClick={() => {
                void authClient.signOut({
                  fetchOptions: { onSuccess: () => window.location.assign("/") },
                });
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/rsvp" className="bg-magenta-action px-3 py-2 text-on-magenta">
            Join the waitlist
          </Link>
        )}
      </nav>
    </header>
  );
}
