import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import posterBg from "@/assets/posterbg.jpg";
import posterSiteQr from "@/assets/poster-site-qr.png";
import { formatTime } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/poster")({
  component: PosterPage,
});

const POSTER_W = 1080;
const POSTER_H = 1350;

function PosterPage() {
  const config = useQuery(trpc.event.getPublicConfig.queryOptions());
  const search = typeof window === "undefined" ? "" : window.location.search;
  const exporting = search.includes("export=1");
  const scale = usePosterPreviewScale(exporting);

  return (
    <div className={exporting ? "bg-paper" : "flex min-h-[100dvh] justify-center overflow-auto bg-paper p-6"}>
      <div
        style={
          exporting
            ? undefined
            : {
                width: POSTER_W * scale,
                height: POSTER_H * scale,
              }
        }
      >
        <div
          data-poster="fb-portrait"
          className="poster-artboard text-ink"
          style={
            exporting
              ? undefined
              : {
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }
          }
        >
          <PosterArtboard
            venue={config.data?.venue ?? "Tagu Cafe and Bar"}
            date={formatPosterDate(config.data?.startsAt)}
            time={formatTime(config.data?.startsAt)}
          />
        </div>
      </div>
      {exporting ? null : (
        <p className="sr-only">1080 by 1350 Facebook portrait poster. Add ?export=1 to screenshot.</p>
      )}
    </div>
  );
}

function usePosterPreviewScale(exporting: boolean) {
  const [scale, setScale] = useState(0.38);

  useEffect(() => {
    if (exporting) {
      return;
    }
    const fit = () => {
      const pad = 48;
      setScale(Math.min(1, (window.innerWidth - pad) / POSTER_W, (window.innerHeight - pad) / POSTER_H));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [exporting]);

  return exporting ? 1 : scale;
}

function formatPosterDate(iso: string | null | undefined) {
  if (!iso) {
    return "September 25";
  }
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

function PosterArtboard({
  venue,
  date,
  time,
}: {
  venue: string;
  date: string;
  time: string;
}) {
  return (
    <div className="absolute inset-0">
      <img
        className="poster-photo"
        src={posterBg}
        alt="Tagu Cafe and Bar at night. Neon on the left reads: I didn't text you, tequila did."
        width={POSTER_W}
        height={POSTER_H}
      />
      <div className="poster-type">
        <p className="poster-aside">you went to the wrong one,</p>
        <p className="poster-aside poster-aside-2">now come to the</p>
        <h1 className="poster-shout">
          <span>right</span>
          <span>party</span>
        </h1>
      </div>

      <p className="poster-when">
        {date}
        <span>{time}</span>
      </p>

      <p className="poster-place">{venue}</p>

      <div className="poster-qr-block">
        <p className="poster-register">register here</p>
        <div className="poster-qr-well">
          <img
            src={posterSiteQr}
            alt="QR code for https://party.citadel-codex.com"
            width={220}
            height={220}
            className="poster-qr"
          />
        </div>
      </div>
    </div>
  );
}
