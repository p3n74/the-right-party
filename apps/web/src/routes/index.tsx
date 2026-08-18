import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@the-right-party/ui/components/button";

import { GoogleButton } from "@/components/party/google-button";
import { IpodTicket } from "@/components/party/ipod-ticket";
import { NightField } from "@/components/party/night-field";
import { SprayYearLockup } from "@/components/party/spray-year-lockup";
import { authClient } from "@/lib/auth-client";
import { formatPhp, formatWhen } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const config = useQuery(trpc.event.getPublicConfig.queryOptions());
  const me = useQuery({
    ...trpc.rsvp.me.queryOptions(),
    enabled: Boolean(session),
  });
  const join = useMutation(
    trpc.rsvp.joinWaitlist.mutationOptions({
      onSuccess: () => {
        void navigate({ to: "/rsvp" });
      },
    }),
  );
  const alreadyIn = Boolean(me.data?.rsvp);

  return (
    <NightField>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 pt-20 pb-24 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] md:items-end md:px-8 md:pt-24">
        <section className="min-w-0">
          <SprayYearLockup />
          <p className="mt-6 max-w-[28ch] text-lg leading-snug text-ink md:text-xl">
            You dressed for the wrong party. Come to the right one.
          </p>
          <dl className="mt-10 grid max-w-md gap-3 text-sm text-ink-2">
            <div className="flex justify-between gap-4 border-b border-rule py-2">
              <dt>Where</dt>
              <dd className="text-ink">{config.data?.venue ?? "Tagu Cafe and Bar"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-rule py-2">
              <dt>When</dt>
              <dd className="text-ink">{formatWhen(config.data?.startsAt)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-rule py-2">
              <dt>In</dt>
              <dd className="text-ink">{formatPhp(config.data?.ticketPriceCentavos ?? 100000)}</dd>
            </div>
          </dl>
        </section>

        <IpodTicket>
          <p className="font-pixel text-[11px] tracking-widest text-magenta">AFTERPARTY</p>
          <p className="mt-3 text-xl leading-tight text-ink">DCISM after hours at Tagu.</p>
          <p className="mt-3 text-sm text-ink-2">Sign in, get on the list, pay ₱1,000, show up.</p>
          <div className="mt-5">
            {session ? (
              alreadyIn ? (
                <Button className="h-11 w-full text-sm" onClick={() => void navigate({ to: "/rsvp" })}>
                  Your ticket
                </Button>
              ) : (
                <Button
                  className="h-11 w-full text-sm"
                  disabled={join.isPending}
                  onClick={() => join.mutate({})}
                >
                  {join.isPending ? "Loading_" : "Join the waitlist"}
                </Button>
              )
            ) : (
              <GoogleButton configured={config.data?.googleAuthConfigured ?? false} />
            )}
          </div>
          {join.isError ? (
            <p className="mt-3 text-sm text-destructive">{join.error.message}</p>
          ) : null}
        </IpodTicket>
      </main>

      <section className="bg-magenta-hot px-4 py-10 text-on-magenta md:px-8">
        <p className="mx-auto max-w-4xl font-year text-2xl tracking-wide md:text-4xl">
          Dresscode of the main event is Wrong Party. This is The Right Party.
        </p>
      </section>

      <footer className="px-4 py-8 text-sm text-ink-2 md:px-8">
        Afterparty · not the Sept 25 5-10 PM main event at IC3 Narra Hall
      </footer>
    </NightField>
  );
}
