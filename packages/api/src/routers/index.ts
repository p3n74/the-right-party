import { adminRouter } from "./admin";
import { eventRouter } from "./event";
import { rsvpRouter } from "./rsvp";
import { publicProcedure, router } from "../index";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  event: eventRouter,
  rsvp: rsvpRouter,
  admin: adminRouter,
});
export type AppRouter = typeof appRouter;
