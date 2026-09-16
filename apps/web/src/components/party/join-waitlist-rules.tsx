import { useEffect } from "react";
import { createPortal } from "react-dom";

import { PartyCta } from "@/components/party/party-cta";

type JoinWaitlistRulesDialogProps = {
  open: boolean;
  joining: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function JoinWaitlistRulesDialog({
  open,
  joining,
  error,
  onConfirm,
  onClose,
}: JoinWaitlistRulesDialogProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !joining) onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, joining, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[color-mix(in_oklch,var(--paper)_55%,black)] backdrop-blur-[2px]"
        disabled={joining}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-rules-title"
        className="relative z-10 max-h-[min(36rem,calc(100dvh-3rem))] w-full max-w-md overflow-y-auto border-2 border-magenta bg-paper-2 px-5 py-6 shadow-[0_24px_80px_color-mix(in_oklch,black_55%,transparent)] sm:px-7 sm:py-7"
      >
        <p className="font-pixel text-[10px] tracking-[0.22em] text-magenta">BEFORE YOU JOIN</p>
        <h2
          id="join-rules-title"
          className="mt-2 font-year text-[1.75rem] leading-none tracking-wide text-ink sm:mt-3 sm:text-4xl"
        >
          Two things.
        </h2>
        <ol className="mt-4 space-y-3.5 text-[0.95rem] leading-snug text-ink sm:mt-5 sm:space-y-4 sm:text-base">
          <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="font-pixel text-[11px] text-magenta">01</span>
            <span className="min-w-0">
              Come around 11 PM. Venue capacity is strict — late arrivals may have to wait depending on capacity.
            </span>
          </li>
          <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="font-pixel text-[11px] text-magenta">02</span>
            <span className="min-w-0">Pay by the day before, or at least before the event.</span>
          </li>
        </ol>
        <PartyCta className="mt-6 w-full sm:mt-7" mark disabled={joining} onClick={onConfirm}>
          {joining ? "Loading_" : "Got it — join"}
        </PartyCta>
        <button
          type="button"
          className="mt-3 block w-full py-1 text-center text-sm text-ink-2 underline decoration-1 underline-offset-4 disabled:opacity-50 sm:mt-4"
          disabled={joining}
          onClick={onClose}
        >
          Not now
        </button>
        {error ? <p className="mt-3 text-center text-sm text-destructive">{error}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
