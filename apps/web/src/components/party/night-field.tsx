import type { ReactNode } from "react";
import { cn } from "@the-right-party/ui/lib/utils";

type NightFieldProps = {
  density?: "loud" | "quiet";
  className?: string;
  children?: ReactNode;
};

export function NightField({ density = "loud", className, children }: NightFieldProps) {
  const loud = density === "loud";

  return (
    <div className={cn("relative isolate min-h-[100dvh] overflow-hidden bg-paper text-ink", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_20%_0%,oklch(0.28_0.12_330/_0.55),transparent_58%),radial-gradient(70%_50%_at_90%_10%,oklch(0.45_0.18_350/_0.28),transparent_50%)]" />
      <Palm className={cn("pointer-events-none absolute -top-8 -left-10 w-[42vw] max-w-md text-paper", loud ? "opacity-90" : "opacity-40")} />
      <Palm className={cn("pointer-events-none absolute -top-16 -right-16 w-[58vw] max-w-xl rotate-12 text-paper", loud ? "opacity-100" : "opacity-50")} />
      <div
        className={cn(
          "flare-drift pointer-events-none absolute top-0 left-[12%] h-40 w-[55%] bg-[linear-gradient(110deg,transparent,oklch(0.82_0.14_205/_0.18),transparent)]",
          !loud && "opacity-40",
        )}
      />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:repeating-radial-gradient(circle_at_20%_10%,oklch(0.96_0.012_280/_0.16)_0_1px,transparent_1px_7px)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Palm({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 280" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M118 278c2-46 4-92 3-138 28 18 62 28 96 22-36-18-64-40-78-72 34 8 70 4 102-12-40-10-74-30-92-62 30 2 58-8 80-28-48 6-86-8-108-42 8 32 6 62-10 88 6-36-8-70-38-96 8 40-2 76-28 102 22-8 40-4 54 14-32-6-62 6-86 28 36-4 62 12 76 40-30-8-64-4-96 16 38 2 68 18 86 46-28-2-54 12-72 36 32-10 52-4 64 18z"
      />
    </svg>
  );
}
