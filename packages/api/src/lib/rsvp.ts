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

const PAYMENT_QR_STATUSES: RsvpStatus[] = [
  RsvpStatus.PAYMENT_PENDING,
  RsvpStatus.PAYMENT_SUBMITTED,
  RsvpStatus.REJECTED,
];

const PAYMENT_SUBMIT_STATUSES: RsvpStatus[] = [
  RsvpStatus.PAYMENT_PENDING,
  RsvpStatus.REJECTED,
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

export async function confirmedCount(prisma: PrismaClient) {
  return prisma.rsvp.count({
    where: { status: RsvpStatus.CONFIRMED },
  });
}

const GOING_PENDING: RsvpStatus[] = [
  RsvpStatus.WAITLISTED,
  RsvpStatus.PAYMENT_PENDING,
  RsvpStatus.PAYMENT_SUBMITTED,
];

export type GoingGuest = {
  displayName: string;
  image: string | null;
};

export type GoingList = {
  confirmed: GoingGuest[];
  pending: GoingGuest[];
};

function toGoingGuest(row: {
  displayName: string | null;
  user: { name: string; image: string | null };
}): GoingGuest {
  return {
    displayName: (row.displayName?.trim() || row.user.name.trim()).slice(0, 80),
    image: row.user.image?.trim() || null,
  };
}

export async function listGoing(prisma: PrismaClient): Promise<GoingList> {
  const [confirmedRows, pendingRows] = await Promise.all([
    prisma.rsvp.findMany({
      where: { status: RsvpStatus.CONFIRMED },
      select: {
        displayName: true,
        confirmedAt: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.rsvp.findMany({
      where: { status: { in: GOING_PENDING } },
      select: {
        displayName: true,
        waitlistedAt: true,
        user: { select: { name: true, image: true } },
      },
      orderBy: [{ waitlistedAt: "asc" }, { id: "asc" }],
    }),
  ]);

  confirmedRows.sort((a, b) => {
    const byTime = (b.confirmedAt?.getTime() ?? 0) - (a.confirmedAt?.getTime() ?? 0);
    if (byTime !== 0) {
      return byTime;
    }
    const an = a.displayName?.trim() || a.user.name;
    const bn = b.displayName?.trim() || b.user.name;
    return an.localeCompare(bn, undefined, { sensitivity: "base" });
  });

  return {
    confirmed: confirmedRows.map(toGoingGuest),
    pending: pendingRows.map(toGoingGuest),
  };
}

export function canRejoin(status: RsvpStatus, config: EventConfig) {
  if (REJOINABLE.includes(status)) {
    return true;
  }
  return status === RsvpStatus.REJECTED && config.allowRejoinAfterReject;
}

export function canSeePaymentQr(status: RsvpStatus) {
  return PAYMENT_QR_STATUSES.includes(status);
}

export function canSubmitPayment(status: RsvpStatus) {
  return PAYMENT_SUBMIT_STATUSES.includes(status);
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
      expiresAt: null,
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
  const showPay = rsvp ? canSeePaymentQr(rsvp.status) : false;

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
          expiresAt: null,
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
