import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "@the-right-party/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import { toast } from "sonner";

import { CredentialImage } from "@/components/party/credential-image";
import { GoingTicketLink } from "@/components/party/going-roll";
import { IpodTicket } from "@/components/party/ipod-ticket";
import { NightField } from "@/components/party/night-field";
import { PartyCta } from "@/components/party/party-cta";
import { SprayYearLockup } from "@/components/party/spray-year-lockup";
import { StatusChip } from "@/components/party/status-chip";
import { apiUrl } from "@/lib/api-url";
import { formatPhp, formatTime, formatWhen } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/rsvp")({
  component: RsvpPage,
});

type Me = inferRouterOutputs<AppRouter>["rsvp"]["me"];

function RsvpPage() {
  const me = useQuery({
    ...trpc.rsvp.me.queryOptions(),
    refetchInterval: 15_000,
  });
  const config = useQuery(trpc.event.getPublicConfig.queryOptions());
  const join = useMutation(
    trpc.rsvp.joinWaitlist.mutationOptions({
      onSuccess: () => {
        void me.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const status = me.data?.rsvp?.status ?? (me.isLoading ? "loading" : "empty");
  const paying =
    me.data?.rsvp?.status === "PAYMENT_PENDING" || me.data?.rsvp?.status === "REJECTED";
  const venue = config.data?.venue ?? "Tagu Cafe and Bar";
  const when = formatWhen(config.data?.startsAt);
  const time = formatTime(config.data?.startsAt);

  return (
    <NightField density="quiet">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center px-4 pt-24 pb-16">
        <SprayYearLockup size="compact" className="mb-10" />
        <IpodTicket
          lcdKey={status}
          tray={
            paying && me.data ? (
              <PayTray
                me={me.data}
                resubmit={me.data.rsvp?.status === "REJECTED"}
                onPaid={() => void me.refetch()}
              />
            ) : undefined
          }
        >
          {me.isLoading ? (
            <p className="font-pixel text-magenta">Loading_</p>
          ) : me.data ? (
            <RsvpLcd
              me={me.data}
              joining={join.isPending}
              venue={venue}
              when={when}
              time={time}
              onJoin={() => join.mutate({})}
            />
          ) : (
            <p className="text-sm text-destructive">Couldn&apos;t load your ticket.</p>
          )}
        </IpodTicket>
        <GoingTicketLink />
      </div>
    </NightField>
  );
}

function RsvpLcd({
  me,
  joining,
  venue,
  when,
  time,
  onJoin,
}: {
  me: Me;
  joining: boolean;
  venue: string;
  when: string;
  time: string;
  onJoin: () => void;
}) {
  const status = me.rsvp?.status;

  if (!status) {
    return (
      <div>
        <p className="font-pixel text-[11px] tracking-widest text-magenta">AFTERPARTY</p>
        <p className="mt-3 text-xl text-ink">Get on the list.</p>
        <p className="mt-2 text-sm text-ink-2">
          {venue}. VIP DJ booth table (the Good Seats). {time}. ₱1,000.
        </p>
        <PartyCta className="mt-5" mark disabled={joining} onClick={onJoin}>
          {joining ? "Loading_" : "Join the waitlist"}
        </PartyCta>
      </div>
    );
  }

  if (status === "WAITLISTED") {
    const position = me.rsvp?.waitlistPosition;
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 text-xl text-ink">You&apos;re on the list.</p>
        <p className="mt-2 text-sm text-ink-2">
          {position ? `You're number ${position}. ` : null}
          Come back here when a slot opens.
        </p>
      </div>
    );
  }

  if (status === "PAYMENT_PENDING") {
    const pay = me.paymentInstructions;
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-3 text-xl text-ink">Scan to pay {formatPhp(pay?.amountCentavos ?? 100000)}.</p>
        <p className="mt-2 text-sm text-ink">{pay?.gcashName ?? "Nikolai Tristan Pazon"}</p>
        <p className="mt-1 text-xs text-ink-2">Code sits under this screen.</p>
      </div>
    );
  }

  if (status === "PAYMENT_SUBMITTED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 text-xl text-ink">Receipt&apos;s in.</p>
        <p className="mt-2 text-sm text-ink-2">We&apos;ll confirm your spot. Don&apos;t pay twice.</p>
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 font-year text-3xl tracking-wide text-ink">You&apos;re in</p>
        <p className="mt-2 text-lg text-ink">{me.rsvp?.displayName ?? me.user.name}</p>
        <p className="mt-4 text-sm text-ink">Hold this up at the door.</p>
        <p className="mt-2 text-xs text-ink-2">
          {venue}
          <br />
          VIP DJ booth table (the Good Seats)
          <br />
          {when}
        </p>
      </div>
    );
  }

  if (status === "EXPIRED" || status === "CANCELLED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 text-xl text-ink">That spot isn&apos;t held anymore.</p>
        <PartyCta className="mt-5" mark disabled={joining} onClick={onJoin}>
          {joining ? "Loading_" : "Join the waitlist"}
        </PartyCta>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 text-xl text-ink">Didn&apos;t make the door list.</p>
        <p className="mt-2 text-sm text-ink-2">
          If you already paid and this was a mix-up, send the receipt again. We&apos;ll look.
        </p>
        {me.rsvp?.rejectReason ? (
          <p className="mt-2 text-sm text-ink-2">{me.rsvp.rejectReason}</p>
        ) : null}
        <p className="mt-2 text-xs text-ink-2">Code sits under this screen.</p>
      </div>
    );
  }

  return (
    <div>
      <StatusChip status={status} />
      <p className="mt-4 text-xl text-ink">Not this round.</p>
    </div>
  );
}

function PayTray({
  me,
  onPaid,
  resubmit = false,
}: {
  me: Me;
  onPaid: () => void;
  resubmit?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const markPaid = useMutation(
    trpc.rsvp.markPaid.mutationOptions({
      onSuccess: onPaid,
      onError: (error) => toast.error(error.message),
    }),
  );
  const pay = me.paymentInstructions;

  async function submit() {
    if (!file) {
      toast.error("Drop your receipt first.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const uploaded = await fetch(apiUrl("/api/receipts"), {
        method: "POST",
        body,
        credentials: "include",
      });
      const payload = (await uploaded.json()) as { receiptKey?: string; error?: string };
      if (!uploaded.ok || !payload.receiptKey) {
        throw new Error(payload.error ?? "Upload failed");
      }
      await markPaid.mutateAsync({
        method: "GCASH",
        receiptKey: payload.receiptKey,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Didn't take. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <CredentialImage
        path={pay?.gcashQrUrl ?? "/api/payment-qr/gcash"}
        alt="GoTyme InstaPay payment QR"
        className="mx-auto min-h-[160px] min-w-[160px] w-full max-w-[220px] bg-qr-paper p-2"
      />
      <p className="mt-2 text-center text-xs text-paper">{pay?.gcashNumber ?? "GoTyme / InstaPay"}</p>
      {pay?.usingPlaceholderQr ? (
        <p className="mt-2 text-xs text-paper/80">Stand-in QR. Don&apos;t send money until the real code is up.</p>
      ) : null}
      <label className="ipod-drop">
        {file ? file.name : "Drop your receipt."}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <PartyCta className="mt-3" disabled={busy || markPaid.isPending} onClick={() => void submit()}>
        {busy || markPaid.isPending ? "Loading_" : resubmit ? "Send it again" : "I already paid"}
      </PartyCta>
    </div>
  );
}
