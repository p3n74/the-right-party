import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "@the-right-party/api/routers/index";
import { Button } from "@the-right-party/ui/components/button";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import { toast } from "sonner";

import { CredentialImage } from "@/components/party/credential-image";
import { IpodTicket } from "@/components/party/ipod-ticket";
import { NightField } from "@/components/party/night-field";
import { SprayYearLockup } from "@/components/party/spray-year-lockup";
import { StatusChip } from "@/components/party/status-chip";
import { apiUrl } from "@/lib/api-url";
import { formatPhp } from "@/lib/format";
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
  const join = useMutation(
    trpc.rsvp.joinWaitlist.mutationOptions({
      onSuccess: () => {
        void me.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <NightField density="quiet">
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-8 pt-24">
        <SprayYearLockup size="compact" className="mb-8" />
        <IpodTicket>
          {me.isLoading ? (
            <p className="font-pixel text-magenta">Loading_</p>
          ) : me.data ? (
            <RsvpLcd
              me={me.data}
              joining={join.isPending}
              onJoin={() => join.mutate({})}
              onPaid={() => void me.refetch()}
            />
          ) : (
            <p className="text-sm text-destructive">Could not load your ticket.</p>
          )}
        </IpodTicket>
      </div>
    </NightField>
  );
}

function RsvpLcd({
  me,
  joining,
  onJoin,
  onPaid,
}: {
  me: Me;
  joining: boolean;
  onJoin: () => void;
  onPaid: () => void;
}) {
  const status = me.rsvp?.status;

  if (!status) {
    return (
      <div>
        <p className="font-pixel text-[11px] tracking-widest text-magenta">AFTERPARTY</p>
        <p className="mt-3 text-xl text-ink">Get on the list.</p>
        <p className="mt-2 text-sm text-ink-2">Tagu Cafe and Bar. 11 PM. ₱1,000.</p>
        <Button className="mt-5 h-11 w-full text-sm" disabled={joining} onClick={onJoin}>
          {joining ? "Loading_" : "Join the waitlist"}
        </Button>
      </div>
    );
  }

  if (status === "WAITLISTED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 text-xl text-ink">You're on it.</p>
        <p className="mt-2 text-sm text-ink-2">
          Position {me.rsvp?.waitlistPosition ?? "—"}. Check back here when a slot opens.
        </p>
      </div>
    );
  }

  if (status === "PAYMENT_PENDING") {
    return <PayLcd me={me} onPaid={onPaid} />;
  }

  if (status === "PAYMENT_SUBMITTED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 text-xl text-ink">Receipt in. Hold tight.</p>
        <p className="mt-2 text-sm text-ink-2">We'll confirm your spot. Don't pay twice.</p>
      </div>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 font-year text-3xl tracking-wide text-ink">You're in</p>
        <p className="mt-2 text-sm text-ink-2">{me.rsvp?.displayName ?? me.user.name}</p>
        <p className="mt-4 text-sm text-ink">Show this at the door.</p>
      </div>
    );
  }

  if (status === "EXPIRED" || status === "CANCELLED") {
    return (
      <div>
        <StatusChip status={status} />
        <p className="mt-4 text-xl text-ink">Spot lapsed.</p>
        <Button className="mt-5 h-11 w-full text-sm" disabled={joining} onClick={onJoin}>
          {joining ? "Loading_" : "Join the waitlist"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <StatusChip status={status} />
      <p className="mt-4 text-xl text-ink">Not this time.</p>
      {me.rsvp?.rejectReason ? <p className="mt-2 text-sm text-ink-2">{me.rsvp.rejectReason}</p> : null}
    </div>
  );
}

function PayLcd({ me, onPaid }: { me: Me; onPaid: () => void }) {
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
      <StatusChip status="PAYMENT_PENDING" />
      <p className="mt-3 text-xl text-ink">Scan to pay {formatPhp(pay?.amountCentavos ?? 100000)}.</p>
      {pay?.gcashQrUrl ? (
        <CredentialImage
          path={pay.gcashQrUrl}
          alt="GCash payment QR"
          className="mt-3 w-full bg-white p-2"
        />
      ) : null}
      {pay?.usingPlaceholderQr ? (
        <p className="mt-2 text-xs text-ink-2">Placeholder QR until the real GCash code is uploaded.</p>
      ) : null}
      <label className="mt-3 block border border-dashed border-rule p-3 text-sm text-ink-2">
        {file ? file.name : "Drop your receipt."}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <Button className="mt-3 h-11 w-full text-sm" disabled={busy || markPaid.isPending} onClick={() => void submit()}>
        {busy || markPaid.isPending ? "Loading_" : "I already paid"}
      </Button>
    </div>
  );
}
