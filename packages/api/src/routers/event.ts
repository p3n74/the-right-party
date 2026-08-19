import prisma from "@the-right-party/db";
import { googleAuthConfigured } from "@the-right-party/env/server";

import { publicProcedure, router } from "../index";
import { confirmedCount, getEventConfig } from "../lib/rsvp";

export const eventRouter = router({
  getPublicConfig: publicProcedure.query(async () => {
    const config = await getEventConfig(prisma);
    const confirmed = await confirmedCount(prisma);
    const remainingSlots = Math.max(0, config.capacity - confirmed);

    return {
      name: config.name,
      venue: config.venue,
      startsAt: config.startsAt?.toISOString() ?? null,
      endsAt: config.endsAt?.toISOString() ?? null,
      dresscode: config.dresscode,
      mainEventName: config.mainEventName,
      mainEventVenue: config.mainEventVenue,
      mainEventStartsAt: config.mainEventStartsAt?.toISOString() ?? null,
      mainEventEndsAt: config.mainEventEndsAt?.toISOString() ?? null,
      mainEventDresscode: config.mainEventDresscode,
      capacity: config.capacity,
      confirmedCount: confirmed,
      remainingSlots,
      waitlistOpen: config.waitlistOpen,
      paymentsOpen: config.paymentsOpen,
      ticketPriceCentavos: config.ticketPriceCentavos,
      currency: config.currency,
      googleAuthConfigured: googleAuthConfigured(),
    };
  }),
});
