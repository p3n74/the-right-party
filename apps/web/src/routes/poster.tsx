import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SprayYearLockup } from "@/components/party/spray-year-lockup";
import { formatDate, formatPhp, formatTime } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/poster")({
  component: PosterPage,
});

function PosterPage() {
  const config = useQuery(trpc.event.getPublicConfig.queryOptions());
  const search = typeof window === "undefined" ? "" : window.location.search;
  const exporting = search.includes("export=1");
  const cover = search.includes("size=cover");

  return (
    <div className={exporting ? "bg-paper" : "flex min-h-[100dvh] items-center justify-center bg-paper p-6"}>
      <div
        data-poster={cover ? "fb-cover" : "fb-og"}
        className="relative overflow-hidden bg-paper text-ink shadow-[0_0_0_1px_oklch(0.32_0.04_292/_0.4)]"
        style={
          cover
            ? { width: 1920, height: 1008, transform: exporting ? undefined : "scale(0.42)", transformOrigin: "top left" }
            : { width: 1200, height: 630, maxWidth: "100%", aspectRatio: "1200 / 630" }
        }
      >
        <PosterArtboard
          venue={config.data?.venue ?? "Tagu Cafe and Bar"}
          date={formatDate(config.data?.startsAt)}
          time={formatTime(config.data?.startsAt)}
          price={formatPhp(config.data?.ticketPriceCentavos ?? 100000)}
        />
      </div>
      {exporting ? null : (
        <p className="sr-only">1200 by 630 Facebook poster. Add ?export=1 to screenshot.</p>
      )}
    </div>
  );
}

function PosterArtboard({
  venue,
  date,
  time,
  price,
}: {
  venue: string;
  date: string;
  time: string;
  price: string;
}) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_18%_0%,oklch(0.28_0.12_330/_0.7),transparent_60%),radial-gradient(50%_50%_at_90%_80%,oklch(0.5_0.2_350/_0.25),transparent_55%)]" />
      <Palm className="absolute -top-6 -left-8 w-[280px] text-paper opacity-90" />
      <Palm className="absolute -top-10 right-[-80px] w-[520px] rotate-12 text-paper" />
      <div className="absolute top-8 left-[12%] h-24 w-[50%] rotate-6 bg-[linear-gradient(110deg,transparent,oklch(0.82_0.14_205/_0.2),transparent)]" />

      <div className="absolute top-11 left-12">
        <p className="text-[12px] font-semibold tracking-[0.28em] text-ink/70">AFTERPARTY</p>
        <h1 className="mt-2 font-year text-[92px] leading-[0.82] tracking-tight">
          THE RIGHT
          <br />
          PARTY
        </h1>
        <p className="mt-4 max-w-[520px] text-[17px] text-ink/80">
          Afterparty of the DCISM Acquaintance Party
        </p>
      </div>

      <div className="absolute top-[258px] left-12 origin-top-left scale-[0.58]">
        <SprayYearLockup />
      </div>

      <div className="absolute right-16 top-24 size-24 rounded-full border-4 border-ink [background-image:repeating-radial-gradient(circle,oklch(0.96_0.012_280)_0_2px,transparent_2px_8px)]" />
      <div className="absolute right-16 top-[188px] h-[170px] w-[100px] rotate-8 rounded-[18px] bg-ipod-body p-2">
        <div className="h-16 rounded-sm bg-magenta" />
        <div className="mx-auto mt-4 size-12 rounded-full bg-wheel" />
      </div>

      <div className="absolute bottom-12 left-12 flex gap-8 text-[14px] font-semibold tracking-wide">
        <Meta label="DATE" value={date} />
        <Meta label="TIME" value={time} />
        <Meta label="VENUE" value={venue} />
      </div>

      <div className="absolute right-12 bottom-14 w-[392px]">
        <div className="flex h-16 items-center justify-between bg-magenta-action px-5 text-on-magenta">
          <span className="font-sans text-[20px] font-bold tracking-wide">JOIN THE WAITLIST</span>
          <span className="grid size-9 place-items-center rounded-full bg-paper text-magenta">→</span>
        </div>
        <p className="mt-2 text-right text-[13px] text-cyan">{price} · Tagu Cafe and Bar</p>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] text-ink-2">{label}</p>
      <p className="border-b border-magenta pb-0.5">{value}</p>
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
