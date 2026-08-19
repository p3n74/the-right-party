import { PrismaClient } from "../prisma/generated/client";

export const AFTERPARTY_STARTS_AT = new Date("2026-09-25T23:00:00+08:00");
export const MAIN_EVENT_STARTS_AT = new Date("2026-09-25T17:00:00+08:00");
export const MAIN_EVENT_ENDS_AT = new Date("2026-09-25T22:00:00+08:00");

/** Repo-relative path to the committed GoTyme / InstaPay QR. Admin upload may override. */
export const DEFAULT_GCASH_QR_PATH = "apps/server/assets/gotyme-qr.png";

export const DEFAULT_PAYMENT_ACCOUNT = {
  gcashName: "Nikolai Tristan Pazon",
  gcashNumber: "GoTyme / InstaPay · ........ 5935",
  gcashQrPath: DEFAULT_GCASH_QR_PATH,
};

export async function ensureEventConfig(prisma: PrismaClient) {
  await prisma.eventConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      slug: "afterparty",
      name: "Acquaintance Afterparty",
      venue: "Tagu Cafe and Bar",
      startsAt: AFTERPARTY_STARTS_AT,
      dresscode: null,
      mainEventName: "DCISM Acquaintance Party",
      mainEventVenue: "IC3 Convention Center, Narra Hall",
      mainEventStartsAt: MAIN_EVENT_STARTS_AT,
      mainEventEndsAt: MAIN_EVENT_ENDS_AT,
      mainEventDresscode: "Wrong Party",
      capacity: 80,
      ticketPriceCentavos: 100_000,
      currency: "PHP",
      paymentWindowHours: 48,
      requireReceipt: true,
      waitlistOpen: true,
      paymentsOpen: true,
      allowRejoinAfterReject: false,
      ...DEFAULT_PAYMENT_ACCOUNT,
    },
    update: {},
  });

  const row = await prisma.eventConfig.findUnique({ where: { id: 1 } });
  if (row?.name === "The Right Party") {
    await prisma.eventConfig.update({
      where: { id: 1 },
      data: { name: "Acquaintance Afterparty" },
    });
  }
  if (
    row &&
    (!row.gcashQrPath || !row.gcashName || !row.gcashNumber)
  ) {
    await prisma.eventConfig.update({
      where: { id: 1 },
      data: {
        gcashName: row.gcashName || DEFAULT_PAYMENT_ACCOUNT.gcashName,
        gcashNumber: row.gcashNumber || DEFAULT_PAYMENT_ACCOUNT.gcashNumber,
        gcashQrPath: row.gcashQrPath || DEFAULT_PAYMENT_ACCOUNT.gcashQrPath,
      },
    });
  }
}
