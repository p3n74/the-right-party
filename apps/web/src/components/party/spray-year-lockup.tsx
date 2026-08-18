import { cn } from "@the-right-party/ui/lib/utils";

import sprayX from "@/assets/spray-x.png";

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * component: lockup · genre: atmospheric · theme: studied-DNA
 * states: default (static mark)
 * contrast: pass (46–50)
 * Reading this as: cancelled year as an object, marker command, Permanent Marker + Anton.
 */

type SprayYearLockupProps = {
  size?: "hero" | "compact";
  className?: string;
};

export function SprayYearLockup({ size = "hero", className }: SprayYearLockupProps) {
  const hero = size === "hero";

  return (
    <div
      role="img"
      aria-label="Stop living in the past"
      className={cn("relative isolate overflow-visible", className)}
    >
      <p
        className={cn(
          "font-display relative z-20 w-fit max-w-full origin-left text-ink",
          hero
            ? "mb-2 rotate-[-9deg] text-[clamp(1.2rem,5vw,2.2rem)] leading-[0.85]"
            : "mb-1 rotate-[-6deg] text-lg leading-[0.95]",
        )}
      >
        <span
          className={cn(
            "block whitespace-nowrap",
            hero ? "text-[0.58em] leading-none" : "text-base leading-none",
          )}
        >
          Stop living in
        </span>
        <span className="block whitespace-nowrap">the past</span>
      </p>
      <div
        className={cn(
          "relative z-0 font-year text-ink",
          hero
            ? "w-fit min-w-0 text-[clamp(3.6rem,22vw,9.5rem)] leading-[1.02]"
            : "w-fit min-w-0 text-5xl leading-none",
        )}
      >
        <div
          className={cn(
            "flex items-baseline opacity-55",
            hero ? "gap-[0.02em]" : "gap-[0.04em]",
          )}
        >
          <span>2</span>
          <span>0</span>
          <span>1</span>
          <span>6</span>
        </div>
        <img
          src={sprayX}
          alt=""
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 z-[2] max-w-none -translate-x-1/2 -translate-y-[46%]",
            hero ? "w-[155%]" : "w-[150%]",
          )}
        />
      </div>
    </div>
  );
}
