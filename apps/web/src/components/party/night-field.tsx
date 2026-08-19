import type { CSSProperties, ReactNode } from "react";
import { cn } from "@the-right-party/ui/lib/utils";

import nightBg1 from "@/assets/bg1.jpg";
import nightBg2 from "@/assets/bg2.jpg";

type NightFieldProps = {
  density?: "loud" | "quiet";
  className?: string;
  children?: ReactNode;
};

export function NightField({ density = "loud", className, children }: NightFieldProps) {
  const loud = density === "loud";

  return (
    <div
      className={cn("night-field", className)}
      style={{ "--night-photo": `url(${loud ? nightBg1 : nightBg2})` } as CSSProperties}
    >
      <div className={cn("night-photo", loud ? "night-photo--loud" : "night-photo--quiet")} aria-hidden />
      <div className="night-bloom" />
      <Palm
        className={cn(
          "pointer-events-none absolute -top-8 -left-10 w-[42vw] max-w-md text-paper",
          loud ? "opacity-90" : "opacity-40",
        )}
      />
      <Palm
        className={cn(
          "pointer-events-none absolute -top-16 -right-16 w-[58vw] max-w-xl rotate-12 text-paper",
          loud ? "opacity-100" : "opacity-50",
        )}
      />
      <div className={cn("night-flare flare-drift", !loud && "opacity-40")} />
      <div className="night-halftone" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function Palm({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 280" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M118 278c2-46 4-92 3-138 28 18 62 28 96 22-36-18-64-40-78-72 34 8 70 4 102-12-40-10-74-30-92-62 30 2 58-8 80-28-48 6-86-8-108-42 8 32 6 62-10 88 6-36-8-70-38-96 8 40-2 76-28 102 22-8 40-4 54 14-32-6-62 6-86 28 36-4 62 12 76 40-30-8-64-4-96 16 38 2 68 18 86 46-28-2-54 12-72 36 32-10 52-4 64 18z"
      />
    </svg>
  );
}
