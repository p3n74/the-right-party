import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import posterBg2 from "@/assets/bg2.jpg";
import posterSiteQr from "@/assets/poster-site-qr.png";
import { formatTime } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/poster-2")({
  component: PosterTwoPage,
});

const POSTER_W = 1080;
const POSTER_H = 1350;

function PosterTwoPage() {
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
          data-poster="fb-portrait-2"
          className="poster-artboard poster-artboard--cazadores"
          style={
            exporting
              ? undefined
              : {
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }
          }
        >
          <PosterTwoArtboard
            venue={config.data?.venue ?? "Tagu Cafe and Bar"}
            date={formatPosterDate(config.data?.startsAt)}
            time={formatTime(config.data?.startsAt)}
          />
        </div>
      </div>
      {exporting ? null : (
        <p className="sr-only">1080 by 1350 Facebook portrait poster, Cazadores neon. Add ?export=1 to screenshot.</p>
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

function venueLockup(venue: string) {
  if (venue.trim().toLowerCase() === "tagu cafe and bar") {
    return (
      <>
        <span>Tagu Cafe</span>
        <span>and Bar</span>
      </>
    );
  }
  return <span>{venue}</span>;
}

function PosterTwoArtboard({
  venue,
  date,
  time,
}: {
  venue: string;
  date: string;
  time: string;
}) {
  return (
    <div className="p2-sheet">
      <img
        className="poster-photo"
        src={posterBg2}
        alt="Tagu Cafe and Bar at night. Center neon reads Tequila Cazadores."
        width={POSTER_W}
        height={POSTER_H}
      />
      <header className="p2-mast">
        <div className="p2-lockup">
          <p className="p2-event">
            <span>Acquaintance</span>
            <span>Afterparty</span>
          </p>
          <h1 className="p2-venue">{venueLockup(venue)}</h1>
        </div>
        <p className="p2-when">
          {date}
          <span>{time}</span>
        </p>
      </header>

      <footer className="p2-dock">
        <div className="p2-facts">
          <p className="p2-slogan">
            <span className="p2-slogan-spread">
              <span>e</span>
              <span>v</span>
              <span>e</span>
              <span>r</span>
              <span>y</span>
              <span>o</span>
              <span>n</span>
              <span>e</span>
            </span>
            <span className="p2-slogan-spread">
              <span>s</span>
              <span>h</span>
              <span>o</span>
              <span>w</span>
              <span>e</span>
              <span>d</span>
            </span>
            <span>up to the</span>
            <span>wrong party.</span>
            <span>Now come to</span>
            <span>the right one</span>
          </p>
        </div>
        <div className="p2-scan">
          <p className="p2-register">register here</p>
          <div className="poster-qr-well">
            <img
              src={posterSiteQr}
              alt="QR code for https://party.citadel-codex.com"
              width={200}
              height={200}
              className="poster-qr"
            />
          </div>
        </div>
        <p className="p2-disclaimer">Not affiliated with DCISM or CISCO.</p>
      </footer>
    </div>
  );
}
