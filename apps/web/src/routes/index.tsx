import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@the-right-party/ui/lib/utils";

import bg1 from "@/assets/bg1.jpg";
import bg2 from "@/assets/bg2.jpg";
import { GoingLanding } from "@/components/party/going-roll";
import { GoogleButton } from "@/components/party/google-button";
import { IpodTicket } from "@/components/party/ipod-ticket";
import { NightField } from "@/components/party/night-field";
import { PartyCta } from "@/components/party/party-cta";
import { SprayYearLockup } from "@/components/party/spray-year-lockup";
import { authClient } from "@/lib/auth-client";
import { formatPhp, formatWhen } from "@/lib/format";
import { trpc } from "@/utils/trpc";

const HOST_INSTAGRAM = {
  handle: "tristan.nikolai",
  href: "https://instagram.com/tristan.nikolai",
} as const;

const VENUE_MAPS = "https://maps.app.goo.gl/zuKZGFp3ef2thzvdA";

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
      <main className="mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-12 px-4 pt-24 pb-20 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] md:gap-16 md:px-8 md:pt-28 md:pb-28">
        <section className="min-w-0">
          <div className="w-fit max-w-full">
            <SprayYearLockup />
            <p className="font-display relative z-20 mt-4 w-full min-w-0 origin-center rotate-[-9deg] text-center text-[clamp(1.05rem,4.6vw,1.85rem)] leading-none text-ink md:mt-5">
              <span className="block">its time for you to</span>
              <span className="mt-[0.12em] block">Move On</span>
            </p>
          </div>
          <dl className="mt-12 grid max-w-sm gap-6">
            <div className="min-w-0">
              <dt className="font-pixel text-[10px] tracking-[0.2em] text-ink-2">Where</dt>
              <dd className="mt-1 font-year text-2xl leading-[0.95] tracking-wide text-ink md:text-3xl">
                {config.data?.venue ?? "Tagu Cafe and Bar"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-pixel text-[10px] tracking-[0.2em] text-ink-2">When</dt>
              <dd className="mt-1 font-year text-2xl leading-[0.95] tracking-wide text-ink md:text-3xl">
                {formatWhen(config.data?.startsAt)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-pixel text-[10px] tracking-[0.2em] text-ink-2">In</dt>
              <dd className="mt-1 font-year text-2xl leading-[0.95] tracking-wide text-ink md:text-3xl">
                {formatPhp(config.data?.ticketPriceCentavos ?? 100000)}
              </dd>
            </div>
          </dl>
        </section>

        <IpodTicket lcdKey={alreadyIn ? "ticket" : session ? "join" : "google"}>
          <p className="text-xl leading-tight text-ink">
            {alreadyIn
              ? "Click here to view your ticket."
              : "Click here to register and pay."}
          </p>
          <div className="mt-6">
            {session ? (
              alreadyIn ? (
                <PartyCta mark onClick={() => void navigate({ to: "/rsvp" })}>
                  Your ticket
                </PartyCta>
              ) : (
                <PartyCta mark disabled={join.isPending} onClick={() => join.mutate({})}>
                  {join.isPending ? "Loading_" : "Join the waitlist"}
                </PartyCta>
              )
            ) : (
              <GoogleButton configured={config.data?.googleAuthConfigured ?? false} />
            )}
          </div>
          {join.isError ? <p className="mt-3 text-sm text-destructive">{join.error.message}</p> : null}
        </IpodTicket>
      </main>

      <section className="night-band night-band--magenta">
        <div className="night-band-photo" style={{ backgroundImage: `url(${bg1})` }} aria-hidden />
        <dl className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 divide-y divide-on-magenta/25 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-4 py-6 md:px-8 md:py-8">
            <dt className="font-pixel text-[10px] tracking-[0.2em] text-on-magenta/65">Where</dt>
            <dd className="mt-3 font-year text-2xl leading-[0.95] tracking-wide md:text-3xl">
              <a
                href={VENUE_MAPS}
                target="_blank"
                rel="noopener"
                className="underline decoration-2 underline-offset-4 focus-visible:outline-on-magenta"
              >
                {config.data?.venue ?? "Tagu Cafe and Bar"}
              </a>
            </dd>
          </div>
          <div className="px-4 py-6 md:px-8 md:py-8">
            <dt className="font-pixel text-[10px] tracking-[0.2em] text-on-magenta/65">Pay</dt>
            <dd className="mt-3">
              <p className="font-year text-2xl leading-[0.95] tracking-wide md:text-3xl">
                {formatPhp(config.data?.ticketPriceCentavos ?? 100000)}, drinks included
              </p>
              <p className="mt-2 text-sm">GoTyme / InstaPay</p>
            </dd>
          </div>
          <div className="px-4 py-6 md:px-8 md:py-8">
            <dt className="font-pixel text-[10px] tracking-[0.2em] text-on-magenta/65">Questions?</dt>
            <dd className="mt-3">
              <p className="text-sm">DM</p>
              <HostInstagramLink className="mt-1 inline-block font-year text-2xl tracking-wide focus-visible:outline-on-magenta md:text-3xl" />
            </dd>
          </div>
        </dl>
      </section>

      <div className="night-band night-band--paper">
        <div className="night-band-photo" style={{ backgroundImage: `url(${bg2})` }} aria-hidden />
        <div className="relative z-10">
          <GoingLanding />
          <footer className="px-4 py-10 text-sm text-ink-2 md:px-8">
            <p>Disclaimer: we are not affiliated with DCISM or CISCO.</p>
          </footer>
        </div>
      </div>
    </NightField>
  );
}

function HostInstagramLink({ className }: { className?: string }) {
  return (
    <a href={HOST_INSTAGRAM.href} target="_blank" rel="noreferrer" className={cn("underline decoration-2 underline-offset-4", className)}>
      @{HOST_INSTAGRAM.handle}
    </a>
  );
}
