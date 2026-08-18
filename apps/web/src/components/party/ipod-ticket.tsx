import type { ReactNode } from "react";
import { cn } from "@the-right-party/ui/lib/utils";

type IpodTicketProps = {
  children: ReactNode;
  className?: string;
  wheelHint?: string;
};

export function IpodTicket({ children, className, wheelHint = "CLICK" }: IpodTicketProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[340px] rounded-[28px] bg-ipod-body p-4 shadow-[0_24px_80px_oklch(0.12_0.05_292/_0.55)]",
        className,
      )}
    >
      <div className="rounded-[10px] bg-ipod-well p-4 text-ink shadow-[inset_0_0_0_2px_oklch(0.2_0.03_292)]">
        <div className="mb-3 flex items-center justify-between font-pixel text-[10px] tracking-widest text-magenta">
          <span>THE RIGHT PARTY</span>
          <span className="text-cyan">NOW</span>
        </div>
        <div className="min-h-[168px]">{children}</div>
      </div>
      <div className="relative mx-auto mt-6 size-[168px] rounded-full bg-wheel shadow-[inset_0_1px_0_oklch(1_0_0/_0.45)]">
        <div className="absolute inset-[54px] rounded-full bg-ipod-body shadow-[inset_0_2px_6px_oklch(0.2_0.02_292/_0.25)]" />
        <span className="absolute top-4 left-1/2 -translate-x-1/2 font-pixel text-[8px] tracking-[0.2em] text-paper-2">
          {wheelHint}
        </span>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-pixel text-[8px] tracking-[0.2em] text-paper-2">
          MENU
        </span>
      </div>
    </div>
  );
}
