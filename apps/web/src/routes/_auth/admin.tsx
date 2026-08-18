import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@the-right-party/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

import { CredentialImage } from "@/components/party/credential-image";
import { NightField } from "@/components/party/night-field";
import { apiUrl } from "@/lib/api-url";
import { formatPhp } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/admin")({
  component: AdminPage,
  beforeLoad: async ({ context }) => {
    try {
      const me = await context.queryClient.fetchQuery(trpc.rsvp.me.queryOptions());
      if (!me.isAdmin) {
        throw redirect({ to: "/rsvp" });
      }
    } catch {
      throw redirect({ to: "/rsvp" });
    }
  },
});

function AdminPage() {
  const queryClient = useQueryClient();
  const list = useQuery(trpc.admin.listRsvps.queryOptions());
  const confirm = useMutation(
    trpc.admin.confirmPayment.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        toast.success("Confirmed");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const rejectPayment = useMutation(
    trpc.admin.rejectPayment.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const rejectRsvp = useMutation(
    trpc.admin.rejectRsvp.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const items = list.data?.items ?? [];
  const submitted = items.filter((row) => row.status === "PAYMENT_SUBMITTED");
  const rest = items.filter((row) => row.status !== "PAYMENT_SUBMITTED");

  return (
    <NightField density="quiet">
      <div className="mx-auto max-w-5xl px-4 py-8 pt-24">
        <h1 className="font-year text-4xl tracking-wide">DOOR LIST</h1>
        <p className="mt-2 text-sm text-ink-2">
          {formatPhp(list.data?.stats.ticketPriceCentavos ?? 100000)} · {list.data?.stats.confirmed ?? 0}/
          {list.data?.stats.capacity ?? 80} confirmed · {list.data?.stats.venue}
        </p>

        <QrUpload />

        <section className="mt-8">
          <h2 className="font-year text-2xl tracking-wide">Receipts</h2>
          <div className="mt-4 grid gap-4">
            {submitted.length === 0 ? <p className="text-ink-2">No receipts waiting.</p> : null}
            {submitted.map((row) => (
              <article key={row.id} className="border border-rule bg-paper-2 p-4">
                <p className="text-ink">{row.displayName ?? row.user.name}</p>
                <p className="text-sm text-ink-2">{row.user.email}</p>
                {row.latestPayment?.receiptKey ? (
                  <CredentialImage
                    path={`/api/receipts/${row.latestPayment.id}`}
                    alt="Payment receipt"
                    className="mt-3 max-h-64 w-auto bg-white"
                  />
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={confirm.isPending}
                    onClick={() =>
                      confirm.mutate({
                        rsvpId: row.id,
                        paymentId: row.latestPayment!.id,
                      })
                    }
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    disabled={rejectPayment.isPending}
                    onClick={() => {
                      const note = window.prompt("Why reject this receipt?");
                      if (!note) {
                        return;
                      }
                      rejectPayment.mutate({
                        rsvpId: row.id,
                        paymentId: row.latestPayment!.id,
                        note,
                      });
                    }}
                  >
                    Reject receipt
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-year text-2xl tracking-wide">Everyone</h2>
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {rest.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p>{row.displayName ?? row.user.name}</p>
                  <p className="text-sm text-ink-2">
                    {row.status} · {row.user.email}
                  </p>
                </div>
                {row.status !== "REJECTED" && row.status !== "CANCELLED" ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const reason = window.prompt("Reject reason?");
                      if (!reason) {
                        return;
                      }
                      rejectRsvp.mutate({ rsvpId: row.id, reason });
                    }}
                  >
                    Reject
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </NightField>
  );
}

function QrUpload() {
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(apiUrl("/api/admin/payment-qr/gcash"), {
        method: "POST",
        body,
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }
      toast.success("GCash QR saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="mt-6 block border border-dashed border-rule p-4 text-sm text-ink-2">
      {busy ? "Uploading_" : "Upload the real GCash QR (PNG or JPEG)"}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
    </label>
  );
}
