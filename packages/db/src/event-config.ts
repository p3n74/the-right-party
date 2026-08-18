import { PrismaClient } from "../prisma/generated/client";

export const AFTERPARTY_STARTS_AT = new Date("2026-09-25T23:00:00+08:00");
export const MAIN_EVENT_STARTS_AT = new Date("2026-09-25T17:00:00+08:00");
export const MAIN_EVENT_ENDS_AT = new Date("2026-09-25T22:00:00+08:00");

export async function ensureEventConfig(prisma: PrismaClient) {
  await prisma.eventConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      slug: "afterparty",
      name: "The Right Party",
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
    },
    update: {},
  });
}
