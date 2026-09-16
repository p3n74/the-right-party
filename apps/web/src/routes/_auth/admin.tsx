import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@the-right-party/ui/components/button";
import { Input } from "@the-right-party/ui/components/input";
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

function parseEmails(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function AdminPage() {
  const queryClient = useQueryClient();
  const [proofForId, setProofForId] = useState<string | null>(null);
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
  const confirmManually = useMutation(
    trpc.admin.confirmManually.mutationOptions({
      onSuccess: () => {
        setProofForId(null);
        void queryClient.invalidateQueries();
        toast.success("Confirmed");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const attachProof = useMutation(
    trpc.admin.attachPaymentProof.mutationOptions({
      onSuccess: () => {
        setProofForId(null);
        void queryClient.invalidateQueries();
        toast.success("Proof attached");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const clearProof = useMutation(
    trpc.admin.clearPaymentProof.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        toast.success("Proof removed — still confirmed");
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
  const unconfirm = useMutation(
    trpc.admin.unconfirm.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        toast.success("Moved back to payment");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const items = list.data?.items ?? [];
  const submitted = items.filter((row) => row.status === "PAYMENT_SUBMITTED");
  const rest = items.filter((row) => row.status !== "PAYMENT_SUBMITTED");
  const proofBusy = confirmManually.isPending || attachProof.isPending || clearProof.isPending;

  return (
    <NightField density="quiet">
      <div className="mx-auto max-w-5xl px-4 py-8 pt-24">
        <h1 className="font-year text-4xl tracking-wide">DOOR LIST</h1>
        <p className="mt-2 text-sm text-ink-2">
          {formatPhp(list.data?.stats.ticketPriceCentavos ?? 80000)} · {list.data?.stats.confirmed ?? 0}/
          {list.data?.stats.capacity ?? 15} confirmed · {list.data?.stats.venue}
        </p>

        <QrUpload />
        <AddGuestsByEmail
          onDone={() => {
            void queryClient.invalidateQueries();
          }}
        />

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
            {rest.map((row) => {
              const showingProof = proofForId === row.id;
              const hasProof = Boolean(row.latestPayment?.receiptKey);
              return (
                <li key={row.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p>{row.displayName ?? row.user.name}</p>
                      <p className="text-sm text-ink-2">
                        {row.status} · {row.user.email}
                        {row.status === "CONFIRMED" && !hasProof ? " · no proof yet" : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.status === "CONFIRMED" ? (
                        <>
                          {hasProof && row.latestPayment ? (
                            <>
                              <a
                                href={apiUrl(`/api/receipts/${row.latestPayment.id}`)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center border border-input px-2.5 text-xs text-ink hover:bg-muted"
                              >
                                View proof
                              </a>
                              <Button
                                variant="outline"
                                disabled={clearProof.isPending}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      "Remove this proof/placeholder? They stay confirmed.",
                                    )
                                  ) {
                                    return;
                                  }
                                  clearProof.mutate({ rsvpId: row.id });
                                }}
                              >
                                Remove proof
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              disabled={proofBusy}
                              onClick={() => setProofForId(showingProof ? null : row.id)}
                            >
                              {showingProof ? "Cancel" : "Add proof"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            disabled={unconfirm.isPending}
                            onClick={() => {
                              if (!window.confirm("Move this guest back to payment pending?")) {
                                return;
                              }
                              unconfirm.mutate({ rsvpId: row.id });
                            }}
                          >
                            Unconfirm
                          </Button>
                        </>
                      ) : (
                        <Button
                          disabled={proofBusy}
                          onClick={() => setProofForId(showingProof ? null : row.id)}
                        >
                          {showingProof ? "Cancel" : "Confirm"}
                        </Button>
                      )}
                      {row.status !== "REJECTED" &&
                      row.status !== "CANCELLED" &&
                      row.status !== "CONFIRMED" ? (
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
                    </div>
                  </div>
                  {showingProof ? (
                    <ProofPanel
                      mode={row.status === "CONFIRMED" ? "attach" : "confirm"}
                      busy={proofBusy}
                      onCancel={() => setProofForId(null)}
                      onSubmit={async ({ note, file }) => {
                        let receiptKey: string | undefined;
                        if (file) {
                          receiptKey = await uploadAdminReceipt(row.user.id, file);
                        }
                        if (row.status === "CONFIRMED") {
                          if (!receiptKey) {
                            toast.error("Pick a proof image first.");
                            return;
                          }
                          attachProof.mutate({
                            rsvpId: row.id,
                            receiptKey,
                            note,
                          });
                          return;
                        }
                        confirmManually.mutate({
                          rsvpId: row.id,
                          note,
                          receiptKey,
                        });
                      }}
                    />
                  ) : null}
                  {row.status === "CONFIRMED" && hasProof && row.latestPayment ? (
                    <CredentialImage
                      path={`/api/receipts/${row.latestPayment.id}`}
                      alt="Payment proof"
                      className="mt-3 max-h-40 w-auto bg-white"
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </NightField>
  );
}

async function uploadAdminReceipt(userId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(apiUrl(`/api/admin/receipts/${userId}`), {
    method: "POST",
    body,
    credentials: "include",
  });
  const payload = (await response.json()) as { receiptKey?: string; error?: string };
  if (!response.ok || !payload.receiptKey) {
    throw new Error(payload.error ?? "Upload failed");
  }
  return payload.receiptKey;
}

function ProofPanel({
  mode,
  busy,
  onCancel,
  onSubmit,
}: {
  mode: "confirm" | "attach";
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: { note?: string; file: File | null }) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const pending = busy || localBusy;

  return (
    <div className="mt-3 border border-rule bg-paper-2 p-3">
      <p className="text-sm text-ink-2">
        {mode === "confirm"
          ? "Confirm off-channel. Proof is optional but recommended."
          : "Attach payment proof for this confirmed guest."}
      </p>
      <label className="mt-3 block text-sm text-ink-2">
        Note
        <Input
          className="mt-1 h-9 text-sm"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={mode === "confirm" ? "cash, transfer, etc." : "optional note"}
          disabled={pending}
        />
      </label>
      <label className="mt-3 block border border-dashed border-rule p-3 text-sm text-ink-2">
        {file ? file.name : mode === "attach" ? "Drop proof image (required)" : "Drop proof image (optional)"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={pending}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() => {
            void (async () => {
              setLocalBusy(true);
              try {
                await onSubmit({
                  note: note.trim() || undefined,
                  file,
                });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Didn't take");
              } finally {
                setLocalBusy(false);
              }
            })();
          }}
        >
          {pending ? "Saving_" : mode === "confirm" ? "Confirm guest" : "Save proof"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function AddGuestsByEmail({ onDone }: { onDone: () => void }) {
  const [emailsRaw, setEmailsRaw] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmNow, setConfirmNow] = useState(false);
  const addGuests = useMutation(
    trpc.admin.addGuestsByEmail.mutationOptions({
      onSuccess: (result) => {
        const skippedNote =
          result.skipped.length > 0
            ? ` Skipped ${result.skipped.length}: ${result.skipped
                .map((row) => `${row.email} (${row.reason})`)
                .join("; ")}`
            : "";
        toast.success(
          result.added.length > 0
            ? `Added ${result.added.length}.${skippedNote}`
            : `Nobody added.${skippedNote}`,
        );
        setEmailsRaw("");
        setDisplayName("");
        onDone();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const emails = parseEmails(emailsRaw);

  return (
    <section className="mt-8 border border-rule bg-paper-2 p-4">
      <h2 className="font-year text-2xl tracking-wide">Add by email</h2>
      <p className="mt-2 text-sm text-ink-2">
        Paste one or more Google emails. They get an RSVP now; when they sign in with that email, their
        ticket is waiting.
      </p>
      <textarea
        value={emailsRaw}
        onChange={(event) => setEmailsRaw(event.target.value)}
        rows={4}
        placeholder={"friend@gmail.com\nanother@gmail.com"}
        className="mt-4 w-full min-w-0 border border-input bg-transparent px-2.5 py-2 text-sm text-ink outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm text-ink-2">
          Display name (optional, single email only)
          <Input
            className="mt-1 h-9 text-sm"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Optional"
            disabled={emails.length > 1}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmNow}
            onChange={(event) => setConfirmNow(event.target.checked)}
            className="size-4 accent-[var(--magenta-action)]"
          />
          Confirm now (already paid)
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          disabled={addGuests.isPending || emails.length === 0}
          onClick={() =>
            addGuests.mutate({
              emails,
              displayName: displayName.trim() || undefined,
              confirmNow,
            })
          }
        >
          {addGuests.isPending ? "Adding_" : emails.length > 0 ? `Add ${emails.length}` : "Add"}
        </Button>
        <p className="text-xs text-ink-2">
          {emails.length === 0
            ? "No emails yet"
            : confirmNow
              ? `${emails.length} will be confirmed if spots remain`
              : `${emails.length} will land on payment pending`}
        </p>
      </div>
    </section>
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
      toast.success("Payment QR saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="mt-6 block border border-dashed border-rule p-4 text-sm text-ink-2">
      {busy ? "Uploading_" : "Replace payment QR (PNG or JPEG)"}
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
