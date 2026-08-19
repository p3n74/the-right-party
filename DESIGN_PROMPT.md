# Build from this

Restyle The Right Party in place. Same routes, same RSVP machine, same Google-only door. You are making a 2016 afterparty ticket booth feel like an object you can hold, not a SaaS landing.

## What this is

DCISM students and plus-ones. They already know the Acquaintance Party. Dresscode up there is Wrong Party. This site is the inversion: The Right Party. Afterparty at Tagu Cafe and Bar, 11 PM, ₱1,000, Sept 25 2026. Party Like It's 2016.

Jobs: get on the waitlist, pay, hold the ticket up at the door.

Voice: someone throwing the party on a group chat. Short. Specific. A little messy. Not a brand manager.

## Identity (steal from brandkit, do not ship a guidelines page)

One metaphor: a click-wheel iPod is the ticket machine. The site is that object sitting on a night street, palms and a magenta flare behind it.

One mark: the crossed-out year. Permanent Marker says "Party Like It's". Anton sets 2026, a spray X kills the 2, a magenta 1 makes 2016. Repeat that lockup. Do not invent a second logo.

One accent: magenta on night violet. Magenta is the only CTA color. Cyan is a phosphor blip on the LCD ("NOW"), never a button.

Type stays: Permanent Marker, Anton, Chivo, Pixelify Sans on the LCD. Do not "upgrade" to Geist, Clash, Fraunces, or Instrument Serif.

If you generate a brand board, it is a 2x3 or 3x3 reference PNG under `apps/web/src/assets/`. It does not become a route.

The iPod mockup is the UI. Do not draw fake browser chrome or a fake phone around the product.

## What to keep

- Crossed-out 2026 to 2016 lockup
- iPod as the ticket machine on `/`, `/login`, `/rsvp`
- Night violet paper, magenta action, palms, halftone, grain overlay (grain off on `/poster`)
- Google-only auth
- Flow: waitlist → payment QR → receipt → admin confirm
- `/poster` is Facebook art, `?export=1` strips chrome for screenshot
- Locked CTAs: Join the waitlist, Show QR, I already paid, You're in
- GoTyme / InstaPay QR work if it exists (`apps/server/assets/gotyme-qr.png`, EventConfig payment fields, recipient Nikolai Tristan Pazon, ₱1,000). Merge with it. Do not revert it. Do not rename payment API fields for fun.

## What to raise

- Type hierarchy. Anton for the shout. Chivo for facts. Pixelify for LCD chrome. Permanent Marker only on the lockup line.
- iPod LCD overflow. PAY must not cram a scannable QR, a receipt dropzone, and "I already paid" into 168px. Keep a short PAY line on the LCD. Put QR + receipt + CTA in a tray under the LCD, still inside the aluminum shell, above the wheel. QR at least ~160px, white well, actually scannable. CTA stays one line.
- Confirmed ticket should look like something you'd hold up: name, You're in, venue/time. Not a settings receipt.
- Spacing. Landing breathes (`min-h-[100dvh]`, real padding). Mobile 320 / 375 / 414: no horizontal scroll, no two-line buttons, headers wrap.
- Motion: three primitives only.
  1. LCD crossfade (`opacity`) when RSVP state changes
  2. Wheel nudge (`transform: rotate`) when you hover/press the iPod
  3. Existing flare drift
- `prefers-reduced-motion` kills 2 and 3. LCD may still fade ≤150ms.
- Focus: magenta ring, 2px, instant. Never animate the ring. Never use `ease-in-out`. Tokens: `--ease-out`, `--ease-in`, `--dur-fast`, `--dur`. GPU: `transform` and `opacity` only.
- Copy. Rewrite every visible string so a host would actually send it. No invented "200+ going". No em dashes. No "elevate". Apostrophes are fine.

## What to ban

Inter. Fraunces. Instrument Serif. Geist. Clash. Three equal How It Works cards. Glassmorphism. Floating glass-pill nav. Light mode. Fake stats. CISCO marks. Student photo collages on functional screens. Cyan CTAs. Em dashes in UI copy. Italic headers. Lucide soup on guest pages. Mid-render hex/oklch in components (lift to `packages/ui/src/styles/globals.css`). `ease-in-out`. `h-screen` (use `min-h-[100dvh]`). Backdrop-blur on scrolling content.

High-end "double-bezel" means the iPod: aluminum outer shell + inner face + LCD well, concentric radii, inset highlight. It does not mean Liquid Glass cards.

## Pages

`/` Landing. Left (top on mobile): lockup, one line of copy, Where / When / In. Right: iPod with the join or ticket action. Magenta band under that with the Wrong Party inversion. Tiny footer that this is not the 5-10 PM IC3 main event. No feature grid.

`/login` Quiet night. Compact lockup. iPod. Google only.

`/rsvp` All guest states live in the iPod. One primary action per state. PAY uses the under-LCD tray. If GoTyme name/QR is on `paymentInstructions`, show that. Otherwise keep the current QR URL. Do not hardcode a second payment brand if the API still says GCash.

`/poster` Facebook portrait feed. Lock it.

```
data-poster="fb-portrait"
width: 1080px
height: 1350px
aspect-ratio: 1080 / 1350
```

Top-weighted stack so a narrow mobile feed thumb still reads, in this order:

1. THE RIGHT PARTY (Anton, huge)
2. Afterparty of the DCISM Acquaintance Party
3. Party Like It's 2016 lockup
4. Site QR in a white well (encodes https://party.citadel-codex.com), cyan caption party.citadel-codex.com
5. Tagu Cafe and Bar / 11 PM / ₱1,000

Palms and a tiny iPod are atmosphere, not the headline. Night magenta/violet only. `?export=1` still flushes chrome (no header, no grain, no preview scale). Skip `?size=story` unless it is free.

`/admin` Stay utilitarian. Same tokens, same night paper. Do not redesign the door list.

## Tokens

Extend `packages/ui/src/styles/globals.css`. Do not add a second `tokens.css` that fights it. Stamp Hallmark at the top. Dark-locked. `--ring` becomes magenta. Keep `--cyan` for LCD phosphor.

## Do not touch

`packages/api` and Prisma unless a payment display field is already there and the UI just needs to read it. No new git commits unless asked.
