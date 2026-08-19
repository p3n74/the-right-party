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

  if (pathname === "/poster" || pathname === "/poster-2") {
    return null;
  }

  return (
    <header className="site-header">
      <Link to="/" className="site-header-mark" aria-label="Acquaintance Afterparty">
        <span className="site-header-mark-short">Afterparty</span>
        <span className="site-header-mark-full">Acquaintance Afterparty</span>
      </Link>
      <nav className="site-header-nav">
        {me.data?.isAdmin ? (
          <Link to="/admin" className="site-header-link site-header-admin">
            Admin
          </Link>
        ) : null}
        <Link to="/going" className="site-header-link">
          Who&apos;s going
        </Link>
        {isPending ? (
          <span className="font-pixel text-[11px] tracking-widest text-ink-2">Loading_</span>
        ) : session ? (
          <>
            <Link to="/rsvp" className="site-header-link">
              Your ticket
            </Link>
            <button
              type="button"
              className="site-header-link site-header-signout"
              onClick={() => {
                void authClient.signOut({
                  fetchOptions: { onSuccess: () => window.location.assign("/") },
                });
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/rsvp" className="site-header-waitlist">
            Join the waitlist
          </Link>
        )}
      </nav>
    </header>
  );
}
