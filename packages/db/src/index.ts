import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@the-right-party/env/server";

import { PrismaClient } from "../prisma/generated/client";

export type {
  AdminAuditLog,
  EventConfig,
  Payment,
  Rsvp,
} from "../prisma/generated/client";
export {
  PaymentMethod,
  PaymentReview,
  PrismaClient,
  RsvpStatus,
} from "../prisma/generated/client";
export {
  DEFAULT_GCASH_QR_PATH,
  DEFAULT_PAYMENT_ACCOUNT,
  ensureEventConfig,
} from "./event-config";

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;
