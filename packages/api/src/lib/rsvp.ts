import {
  RsvpStatus,
  type EventConfig,
  type Payment,
  type PrismaClient,
  type Rsvp,
} from "@the-right-party/db";
import { isAdminEmail } from "@the-right-party/env/server";
import { TRPCError } from "@trpc/server";

const REJOINABLE: RsvpStatus[] = [
  RsvpStatus.EXPIRED,
  RsvpStatus.CANCELLED,
];

const ACTIVE: RsvpStatus[] = [
  RsvpStatus.WAITLISTED,
  RsvpStatus.PAYMENT_PENDING,
  RsvpStatus.PAYMENT_SUBMITTED,
  RsvpStatus.CONFIRMED,
];

export async function getEventConfig(prisma: PrismaClient): Promise<EventConfig> {
  const config = await prisma.eventConfig.findUnique({ where: { id: 1 } });
  if (!config) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Event is not configured",
    });
  }
  return config;
}

export async function expireOverdueSlots(prisma: PrismaClient) {
  await prisma.rsvp.updateMany({
    where: {
      status: RsvpStatus.PAYMENT_PENDING,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: RsvpStatus.EXPIRED,
      slotClaimedAt: null,
      expiresAt: null,
    },
  });
}

export async function confirmedCount(prisma: PrismaClient) {
  return prisma.rsvp.count({
    where: { status: RsvpStatus.CONFIRMED },
  });
}

function paymentWindowEnd(config: EventConfig) {
  return new Date(Date.now() + config.paymentWindowHours * 60 * 60 * 1000);
}

export function canRejoin(status: RsvpStatus, config: EventConfig) {
  if (REJOINABLE.includes(status)) {
    return true;
  }
  return status === RsvpStatus.REJECTED && config.allowRejoinAfterReject;
}

export function assertCanJoin(existing: Rsvp | null, config: EventConfig) {
  if (!config.waitlistOpen) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The waitlist is closed",
    });
  }
  if (existing && ACTIVE.includes(existing.status)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You already have an RSVP",
    });
  }
  if (existing && !canRejoin(existing.status, config)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This RSVP cannot rejoin",
    });
  }
}

export function nextJoinStatus(config: EventConfig): {
  status: RsvpStatus;
  expiresAt: Date | null;
  slotClaimedAt: Date | null;
} {
  if (config.paymentsOpen && config.ticketPriceCentavos > 0) {
    return {
      status: RsvpStatus.PAYMENT_PENDING,
      expiresAt: paymentWindowEnd(config),
      slotClaimedAt: new Date(),
    };
  }
  return {
    status: RsvpStatus.WAITLISTED,
    expiresAt: null,
    slotClaimedAt: null,
  };
}

type RsvpWithPayments = Rsvp & { payments: Payment[] };

export async function waitlistPosition(prisma: PrismaClient, rsvp: Rsvp) {
  if (rsvp.status !== RsvpStatus.WAITLISTED) {
    return null;
  }
  const ahead = await prisma.rsvp.count({
    where: {
      status: RsvpStatus.WAITLISTED,
      waitlistedAt: { lt: rsvp.waitlistedAt },
    },
  });
  return ahead + 1;
}

export async function serializeMe(
  prisma: PrismaClient,
  user: { id: string; name: string; email: string; image?: string | null },
  rsvp: RsvpWithPayments | null,
  config: EventConfig,
) {
  const latestPayment = rsvp?.payments[0] ?? null;
  const showPay =
    rsvp?.status === RsvpStatus.PAYMENT_PENDING ||
    rsvp?.status === RsvpStatus.PAYMENT_SUBMITTED;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    },
    isAdmin: isAdminEmail(user.email),
    rsvp: rsvp
      ? {
          id: rsvp.id,
          status: rsvp.status,
          waitlistedAt: rsvp.waitlistedAt.toISOString(),
          expiresAt: rsvp.expiresAt?.toISOString() ?? null,
          displayName: rsvp.displayName,
          phone: rsvp.phone,
          affiliation: rsvp.affiliation,
          rejectReason: rsvp.rejectReason,
          waitlistPosition: await waitlistPosition(prisma, rsvp),
          latestPayment: latestPayment
            ? {
                id: latestPayment.id,
                review: latestPayment.review,
                createdAt: latestPayment.createdAt.toISOString(),
              }
            : null,
        }
      : null,
    paymentInstructions: showPay
      ? {
          amountCentavos: config.ticketPriceCentavos,
          currency: config.currency,
          gcashName: config.gcashName,
          gcashNumber: config.gcashNumber,
          mayaName: config.mayaName,
          mayaNumber: config.mayaNumber,
          gcashQrUrl: "/api/payment-qr/gcash",
          mayaQrUrl: config.mayaQrPath ? "/api/payment-qr/maya" : null,
          requireReceipt: config.requireReceipt,
          usingPlaceholderQr: !config.gcashQrPath,
          expiresAt: rsvp?.expiresAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function loadRsvp(
  prisma: PrismaClient,
  userId: string,
): Promise<RsvpWithPayments | null> {
  return prisma.rsvp.findUnique({
    where: { userId },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
}

export async function audit(
  prisma: PrismaClient,
  actorEmail: string,
  action: string,
  rsvpId?: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.adminAuditLog.create({
    data: {
      actorEmail,
      action,
      rsvpId,
      metadata: metadata as never,
    },
  });
}
