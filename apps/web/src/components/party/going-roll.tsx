import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { AppRouter } from "@the-right-party/api/routers/index";
import { cn } from "@the-right-party/ui/lib/utils";
import type { inferRouterOutputs } from "@trpc/server";
import { useState, type ReactNode } from "react";

import { GoogleButton } from "@/components/party/google-button";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

type Going = inferRouterOutputs<AppRouter>["rsvp"]["going"];
type Guest = Going["confirmed"][number];

export function useGoingList() {
  const { data: session } = authClient.useSession();
  const going = useQuery({
    ...trpc.rsvp.going.queryOptions(),
    enabled: Boolean(session),
    refetchInterval: session ? 15_000 : false,
  });
  return { session, going };
}

export function GoingLanding() {
  const { session, going } = useGoingList();

  return (
    <section className="px-4 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-6xl">
        {session ? (
          <GoingRoll
            titleAs="h2"
            layout="film"
            data={going.data}
            loading={going.isLoading}
            error={going.isError}
            footer={
              <Link to="/going" className="mt-8 inline-block text-ink hover:text-magenta">
                Open the list
              </Link>
            }
          />
        ) : (
          <>
            <p className="font-pixel text-[10px] tracking-widest text-magenta">NOW PLAYING</p>
            <h2 className="mt-3 font-year text-4xl tracking-wide md:text-5xl">Who&apos;s going</h2>
            <p className="mt-3 max-w-md text-ink-2">Sign in to see names. Faces only.</p>
            <Link to="/going" className="mt-6 inline-block text-ink hover:text-magenta">
              Open the list
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

export function GoingGate() {
  const config = useQuery(trpc.event.getPublicConfig.queryOptions());

  return (
    <div className="max-w-sm">
      <p className="font-pixel text-[10px] tracking-widest text-magenta">NOW PLAYING</p>
      <h1 className="mt-3 font-year text-4xl tracking-wide md:text-5xl">Who&apos;s going</h1>
      <p className="mt-3 text-ink-2">Google only. Then you get names and faces.</p>
      <div className="mt-6">
        <GoogleButton configured={config.data?.googleAuthConfigured ?? false} callbackURL="/going" />
      </div>
    </div>
  );
}

export function GoingTicketLink({ className }: { className?: string }) {
  const { going } = useGoingList();
  const confirmed = going.data?.confirmed.length;
  const pending = going.data?.pending.length;
  const countsReady = typeof confirmed === "number" && typeof pending === "number";

  return (
    <Link to="/going" className={cn("mt-10 block w-full min-w-0 max-w-[22.5rem]", className)}>
      <div className="ipod-lcd">
        <div className="mb-3 flex items-center justify-between font-pixel text-[10px] tracking-widest text-magenta">
          <span>NOW PLAYING</span>
          <span className="text-cyan">NOW</span>
        </div>
        <p className="text-lg text-ink">Who&apos;s going</p>
        <p className="mt-1 text-sm text-ink-2">
          {countsReady ? `${confirmed} in, ${pending} still paying` : "See the rest of the room."}
        </p>
      </div>
    </Link>
  );
}

export function GoingRoll({
  titleAs = "h1",
  layout,
  data,
  loading,
  error,
  footer,
}: {
  titleAs?: "h1" | "h2";
  layout: "film" | "wall";
  data?: Going;
  loading: boolean;
  error: boolean;
  footer?: ReactNode;
}) {
  const Title = titleAs;

  if (loading && !data) {
    return (
      <div>
        <Title className="font-year text-4xl tracking-wide md:text-5xl">Who&apos;s going</Title>
        <p className="mt-4 font-pixel text-magenta">Loading_</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <Title className="font-year text-4xl tracking-wide md:text-5xl">Who&apos;s going</Title>
        <p className="mt-4 text-sm text-destructive">Couldn&apos;t load who&apos;s going.</p>
      </div>
    );
  }

  const confirmed = data?.confirmed ?? [];
  const pending = data?.pending ?? [];

  return (
    <div>
      <Title className="font-year text-4xl tracking-wide md:text-5xl">Who&apos;s going</Title>
      <GoingGroup
        lcd="NOW PLAYING"
        phosphor
        count={`${confirmed.length} in`}
        empty="No one's through payment yet."
        guests={confirmed}
        tone="in"
        layout={layout}
      />
      <GoingGroup
        lcd="WAITLIST"
        count={`${pending.length} still paying`}
        empty="Nobody's on it yet."
        guests={pending}
        tone="wait"
        layout={layout}
      />
      {footer}
    </div>
  );
}

function GoingGroup({
  lcd,
  phosphor = false,
  count,
  empty,
  guests,
  tone,
  layout,
}: {
  lcd: string;
  phosphor?: boolean;
  count: string;
  empty: string;
  guests: Guest[];
  tone: "in" | "wait";
  layout: "film" | "wall";
}) {
  return (
    <section className="mt-10">
      <div className="ipod-lcd">
        <div className="flex items-center justify-between font-pixel text-[10px] tracking-widest text-magenta">
          <span>{lcd}</span>
          {phosphor ? <span className="text-cyan">NOW</span> : <span>PAY</span>}
        </div>
        <p className="mt-2 font-year text-2xl tracking-wide">{count}</p>
      </div>
      {guests.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">{empty}</p>
      ) : (
        <ul className={layout === "film" ? "going-film mt-2" : "going-wall mt-2"}>
          {guests.map((guest, index) => (
            <li key={`${tone}-${index}-${guest.displayName}`}>
              <GuestCard guest={guest} tone={tone} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GuestCard({ guest, tone }: { guest: Guest; tone: "in" | "wait" }) {
  const [broken, setBroken] = useState(false);
  const photo = guest.image && !broken ? guest.image : null;
  const initial = guest.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <figure className={tone === "in" ? "going-polaroid going-polaroid--in" : "going-polaroid going-polaroid--wait"}>
      <div className="going-polaroid-face">
        {photo ? (
          <img src={photo} alt="" referrerPolicy="no-referrer" decoding="async" onError={() => setBroken(true)} />
        ) : (
          <span className="going-polaroid-initial" aria-hidden>
            {initial}
          </span>
        )}
      </div>
      <figcaption>
        <span className="going-polaroid-chip">{tone === "in" ? "CONFIRMED" : "WAITLIST"}</span>
        <span className="going-polaroid-name">{guest.displayName}</span>
      </figcaption>
    </figure>
  );
}
