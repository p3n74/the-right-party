import { cn } from "@the-right-party/ui/lib/utils";

type SprayYearLockupProps = {
  size?: "hero" | "compact";
  className?: string;
};

export function SprayYearLockup({ size = "hero", className }: SprayYearLockupProps) {
  const hero = size === "hero";

  return (
    <div className={cn("relative", className)}>
      <p
        className={cn(
          "font-display text-magenta rotate-[-4deg] leading-none",
          hero ? "text-4xl md:text-6xl" : "text-xl",
        )}
      >
        Party Like It's
      </p>
      <div
        className={cn(
          "relative mt-1 flex items-end font-year leading-none tracking-wide text-ink",
          hero ? "text-[4.5rem] md:text-[9rem]" : "text-5xl",
        )}
      >
        <span>20</span>
        <span className="relative inline-block">
          <span className="opacity-90">2</span>
          <SprayX
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[46%] -rotate-[18deg] text-[color:oklch(0.12_0.05_310)]",
              hero ? "h-[1.15em] w-[1.15em]" : "h-[1.1em] w-[1.1em]",
            )}
          />
          <span className="absolute inset-0 flex items-center justify-center font-year text-magenta-hot rotate-3">
            1
          </span>
        </span>
        <span>6</span>
        <span
          className={cn(
            "pointer-events-none absolute -inset-x-8 -inset-y-6 -z-10 bg-[radial-gradient(closest-side,oklch(0.68_0.28_350/_0.55),transparent_72%)]",
            !hero && "-inset-x-4 -inset-y-3",
          )}
        />
      </div>
    </div>
  );
}

function SprayX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M14 18c8 4 18 16 28 28 8-10 22-24 34-32 4 6-6 16-16 28 12 10 28 22 40 28-10 6-24 2-38-8-8 12-16 28-18 42-8-4-4-20 2-36-14-6-32-12-46-10 4-10 16-18 28-22-10-8-18-20-14-38z"
      />
      <path
        fill="currentColor"
        opacity="0.85"
        d="M22 96c18-16 34-34 48-54 12 8 28 18 42 22-8 8-24 14-40 12-6 14-16 32-18 48-10-6-8-18-2-28-12 2-26 8-36 18 2-8 4-14 6-18z"
      />
    </svg>
  );
}
