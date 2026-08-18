import { cn } from "@the-right-party/ui/lib/utils";

const labels = {
  WAITLISTED: "WAITLIST",
  PAYMENT_PENDING: "PAY",
  PAYMENT_SUBMITTED: "PAY",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

type StatusChipProps = {
  status: keyof typeof labels;
  className?: string;
};

export function StatusChip({ status, className }: StatusChipProps) {
  const filled = status === "CONFIRMED" || status === "PAYMENT_PENDING" || status === "PAYMENT_SUBMITTED";

  return (
    <span
      className={cn(
        "inline-flex font-year text-sm tracking-[0.14em]",
        filled ? "bg-magenta-action px-2 py-1 text-on-magenta" : "border border-ink px-2 py-1 text-ink",
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
