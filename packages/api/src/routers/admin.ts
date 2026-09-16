import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";

import prisma, { PaymentReview, RsvpStatus } from "@the-right-party/db";
import { env } from "@the-right-party/env/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, router } from "../index";
import {
  ACTIVE,
  audit,
  confirmedCount,
  getEventConfig,
  nextJoinStatus,
} from "../lib/rsvp";

function createAuthStyleId(length = 32) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0]?.trim() || "Guest";
  return local.replace(/[._+-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
}

function assertReceiptForUser(receiptKey: string, userId: string) {
  const prefix = `${userId}/`;
  if (!receiptKey.startsWith(prefix) || receiptKey.includes("..") || pathIsAbsolute(receiptKey)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid receipt",
    });
  }
  const filePath = `${env.RECEIPT_STORAGE_DIR}/${receiptKey}`;
  if (!existsSync(filePath)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Receipt was not found. Upload it again.",
    });
  }
}

function pathIsAbsolute(value: string) {
  return value.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(value);
}

export const adminRouter = router({
  listRsvps: adminProcedure
    .input(
      z
        .object({
          status: z.enum([
            "WAITLISTED",
            "PAYMENT_PENDING",
            "PAYMENT_SUBMITTED",
            "CONFIRMED",
            "REJECTED",
            "CANCELLED",
            "EXPIRED",
          ]).optional(),
          q: z.string().trim().max(120).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const config = await getEventConfig(prisma);
      const confirmed = await confirmedCount(prisma);
      const status = input?.status;
      const q = input?.q;

      const items = await prisma.rsvp.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(q
            ? {
                OR: [
                  { displayName: { contains: q, mode: "insensitive" } },
                  { user: { email: { contains: q, mode: "insensitive" } } },
                  { user: { name: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          user: { select: { id: true, email: true, name: true, image: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: [{ status: "asc" }, { waitlistedAt: "asc" }],
      });

      const grouped = await prisma.rsvp.groupBy({
        by: ["status"],
        _count: { _all: true },
      });
      const byStatus = Object.fromEntries(
        grouped.map((row) => [row.status, row._count._all]),
      ) as Record<RsvpStatus, number>;

      return {
        items: items.map((rsvp) => ({
          id: rsvp.id,
          status: rsvp.status,
          waitlistedAt: rsvp.waitlistedAt.toISOString(),
          expiresAt: rsvp.expiresAt?.toISOString() ?? null,
          displayName: rsvp.displayName,
          phone: rsvp.phone,
          affiliation: rsvp.affiliation,
          rejectReason: rsvp.rejectReason,
          user: rsvp.user,
          latestPayment: rsvp.payments[0]
            ? {
                id: rsvp.payments[0].id,
                method: rsvp.payments[0].method,
                referenceNote: rsvp.payments[0].referenceNote,
                receiptKey: rsvp.payments[0].receiptKey,
                review: rsvp.payments[0].review,
                createdAt: rsvp.payments[0].createdAt.toISOString(),
              }
            : null,
        })),
        stats: {
          byStatus,
          confirmed,
          capacity: config.capacity,
          ticketPriceCentavos: config.ticketPriceCentavos,
          venue: config.venue,
          startsAt: config.startsAt?.toISOString() ?? null,
        },
      };
    }),

  confirmPayment: adminProcedure
    .input(
      z.object({
        rsvpId: z.string().min(1),
        paymentId: z.string().min(1),
        note: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const config = await getEventConfig(prisma);
      const confirmed = await confirmedCount(prisma);
      if (confirmed >= config.capacity) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Capacity is full. Raise the cap or cancel a confirmed guest first.",
        });
      }

      const rsvp = await prisma.rsvp.findUnique({
        where: { id: input.rsvpId },
        include: { payments: true },
      });
      if (!rsvp || rsvp.status !== RsvpStatus.PAYMENT_SUBMITTED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This RSVP is not waiting on payment review",
        });
      }

      const payment = rsvp.payments.find((row) => row.id === input.paymentId);
      if (!payment || payment.review !== PaymentReview.PENDING) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "That payment is not pending review",
        });
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            review: PaymentReview.ACCEPTED,
            reviewedAt: new Date(),
            reviewedByEmail: ctx.session.user.email,
            reviewNote: input.note,
          },
        }),
        prisma.rsvp.update({
          where: { id: rsvp.id },
          data: {
            status: RsvpStatus.CONFIRMED,
            confirmedAt: new Date(),
            expiresAt: null,
          },
        }),
      ]);

      await audit(prisma, ctx.session.user.email, "confirmPayment", rsvp.id, {
        paymentId: payment.id,
      });
      return { ok: true as const };
    }),

  confirmManually: adminProcedure
    .input(
      z.object({
        rsvpId: z.string().min(1),
        note: z.string().trim().max(280).optional(),
        receiptKey: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const config = await getEventConfig(prisma);
      const confirmed = await confirmedCount(prisma);
      if (confirmed >= config.capacity) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Capacity is full. Raise the cap or cancel a confirmed guest first.",
        });
      }

      const rsvp = await prisma.rsvp.findUnique({
        where: { id: input.rsvpId },
        include: { payments: true },
      });
      if (!rsvp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RSVP not found" });
      }
      if (rsvp.status === RsvpStatus.CONFIRMED) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already confirmed",
        });
      }

      if (input.receiptKey) {
        assertReceiptForUser(input.receiptKey, rsvp.userId);
      }

      const pendingIds = rsvp.payments
        .filter((row) => row.review === PaymentReview.PENDING)
        .map((row) => row.id);
      const note = input.note?.trim() || "Confirmed off-channel";

      await prisma.$transaction([
        ...pendingIds.map((id) =>
          prisma.payment.update({
            where: { id },
            data: {
              review: PaymentReview.ACCEPTED,
              reviewedAt: new Date(),
              reviewedByEmail: ctx.session.user.email,
              reviewNote: note,
            },
          }),
        ),
        prisma.payment.create({
          data: {
            rsvpId: rsvp.id,
            method: "OTHER",
            amountCentavos: config.ticketPriceCentavos,
            referenceNote: note,
            receiptKey: input.receiptKey,
            review: PaymentReview.ACCEPTED,
            reviewedAt: new Date(),
            reviewedByEmail: ctx.session.user.email,
            reviewNote: note,
          },
        }),
        prisma.rsvp.update({
          where: { id: rsvp.id },
          data: {
            status: RsvpStatus.CONFIRMED,
            confirmedAt: new Date(),
            expiresAt: null,
            rejectedAt: null,
            rejectReason: null,
            cancelledAt: null,
          },
        }),
      ]);

      await audit(prisma, ctx.session.user.email, "confirmManually", rsvp.id, {
        note,
        previousStatus: rsvp.status,
        receiptKey: input.receiptKey ?? null,
      });
      return { ok: true as const };
    }),

  attachPaymentProof: adminProcedure
    .input(
      z.object({
        rsvpId: z.string().min(1),
        receiptKey: z.string().min(1),
        note: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const config = await getEventConfig(prisma);
      const rsvp = await prisma.rsvp.findUnique({
        where: { id: input.rsvpId },
        include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (!rsvp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RSVP not found" });
      }
      if (rsvp.status !== RsvpStatus.CONFIRMED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only confirmed guests can get proof attached this way",
        });
      }

      assertReceiptForUser(input.receiptKey, rsvp.userId);
      const note = input.note?.trim() || "Proof attached by admin";
      const latest = rsvp.payments[0];

      if (latest && !latest.receiptKey) {
        await prisma.payment.update({
          where: { id: latest.id },
          data: {
            receiptKey: input.receiptKey,
            reviewNote: note,
            reviewedAt: new Date(),
            reviewedByEmail: ctx.session.user.email,
          },
        });
        await audit(prisma, ctx.session.user.email, "attachPaymentProof", rsvp.id, {
          paymentId: latest.id,
          receiptKey: input.receiptKey,
        });
        return { ok: true as const, paymentId: latest.id };
      }

      const payment = await prisma.payment.create({
        data: {
          rsvpId: rsvp.id,
          method: "OTHER",
          amountCentavos: config.ticketPriceCentavos,
          referenceNote: note,
          receiptKey: input.receiptKey,
          review: PaymentReview.ACCEPTED,
          reviewedAt: new Date(),
          reviewedByEmail: ctx.session.user.email,
          reviewNote: note,
        },
      });

      await audit(prisma, ctx.session.user.email, "attachPaymentProof", rsvp.id, {
        paymentId: payment.id,
        receiptKey: input.receiptKey,
      });
      return { ok: true as const, paymentId: payment.id };
    }),

  clearPaymentProof: adminProcedure
    .input(
      z.object({
        rsvpId: z.string().min(1),
        note: z.string().trim().max(280).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rsvp = await prisma.rsvp.findUnique({
        where: { id: input.rsvpId },
        include: {
          payments: {
            where: { receiptKey: { not: null } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!rsvp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RSVP not found" });
      }
      if (rsvp.status !== RsvpStatus.CONFIRMED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only confirmed guests can have proof cleared this way",
        });
      }
      if (rsvp.payments.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No proof on file for this guest",
        });
      }

      const note = input.note?.trim() || "Placeholder proof cleared — pay later";
      const clearedKeys = rsvp.payments
        .map((payment) => payment.receiptKey)
        .filter((key): key is string => Boolean(key));

      await prisma.$transaction(
        rsvp.payments.map((payment) =>
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              receiptKey: null,
              reviewNote: note,
              reviewedAt: new Date(),
              reviewedByEmail: ctx.session.user.email,
            },
          }),
        ),
      );

      for (const key of clearedKeys) {
        try {
          const abs = `${env.RECEIPT_STORAGE_DIR}/${key}`;
          if (existsSync(abs)) {
            await unlink(abs);
          }
        } catch {
          // Keep going — DB already cleared; missing files are fine.
        }
      }

      await audit(prisma, ctx.session.user.email, "clearPaymentProof", rsvp.id, {
        paymentIds: rsvp.payments.map((payment) => payment.id),
        clearedKeys,
        note,
        statusUnchanged: RsvpStatus.CONFIRMED,
      });
      return { ok: true as const, cleared: clearedKeys.length };
    }),

  unconfirm: adminProcedure
    .input(z.object({ rsvpId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const rsvp = await prisma.rsvp.findUnique({ where: { id: input.rsvpId } });
      if (!rsvp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RSVP not found" });
      }
      if (rsvp.status !== RsvpStatus.CONFIRMED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only confirmed guests can be moved back to payment",
        });
      }

      await prisma.rsvp.update({
        where: { id: rsvp.id },
        data: {
          status: RsvpStatus.PAYMENT_PENDING,
          confirmedAt: null,
          paymentSubmittedAt: null,
          expiresAt: null,
        },
      });

      await audit(prisma, ctx.session.user.email, "unconfirm", rsvp.id, {
        previousStatus: rsvp.status,
      });
      return { ok: true as const };
    }),

  rejectPayment: adminProcedure
    .input(
      z.object({
        rsvpId: z.string().min(1),
        paymentId: z.string().min(1),
        note: z.string().trim().min(1).max(280),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rsvp = await prisma.rsvp.findUnique({
        where: { id: input.rsvpId },
      });
      if (!rsvp || rsvp.status !== RsvpStatus.PAYMENT_SUBMITTED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This RSVP is not waiting on payment review",
        });
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: input.paymentId },
          data: {
            review: PaymentReview.REJECTED,
            reviewedAt: new Date(),
            reviewedByEmail: ctx.session.user.email,
            reviewNote: input.note,
          },
        }),
        prisma.rsvp.update({
          where: { id: rsvp.id },
          data: {
            status: RsvpStatus.PAYMENT_PENDING,
            paymentSubmittedAt: null,
            expiresAt: null,
          },
        }),
      ]);

      await audit(prisma, ctx.session.user.email, "rejectPayment", rsvp.id, {
        paymentId: input.paymentId,
        note: input.note,
      });
      return { ok: true as const };
    }),

  rejectRsvp: adminProcedure
    .input(
      z.object({
        rsvpId: z.string().min(1),
        reason: z.string().trim().min(1).max(280),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rsvp = await prisma.rsvp.findUnique({ where: { id: input.rsvpId } });
      if (!rsvp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RSVP not found" });
      }

      await prisma.rsvp.update({
        where: { id: rsvp.id },
        data: {
          status: RsvpStatus.REJECTED,
          rejectedAt: new Date(),
          rejectReason: input.reason,
          slotClaimedAt: null,
          expiresAt: null,
        },
      });

      await audit(prisma, ctx.session.user.email, "rejectRsvp", rsvp.id, {
        reason: input.reason,
      });
      return { ok: true as const };
    }),

  updateCapacity: adminProcedure
    .input(z.object({ capacity: z.number().int().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const confirmed = await confirmedCount(prisma);
      if (input.capacity < confirmed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Capacity cannot drop below ${confirmed} confirmed guests`,
        });
      }
      await prisma.eventConfig.update({
        where: { id: 1 },
        data: { capacity: input.capacity },
      });
      await audit(prisma, ctx.session.user.email, "updateCapacity", undefined, {
        capacity: input.capacity,
      });
      return { ok: true as const, capacity: input.capacity };
    }),

  addGuestsByEmail: adminProcedure
    .input(
      z.object({
        emails: z.array(z.string().trim().email().max(160)).min(1).max(40),
        displayName: z.string().trim().min(1).max(80).optional(),
        confirmNow: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const config = await getEventConfig(prisma);
      const uniqueEmails = [
        ...new Set(input.emails.map(normalizeEmail).filter(Boolean)),
      ];
      if (uniqueEmails.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add at least one email",
        });
      }

      const added: string[] = [];
      const skipped: { email: string; reason: string }[] = [];
      const join = nextJoinStatus(config);
      let confirmed = await confirmedCount(prisma);

      for (const email of uniqueEmails) {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const now = new Date();
          user = await prisma.user.create({
            data: {
              id: createAuthStyleId(),
              email,
              name:
                uniqueEmails.length === 1 && input.displayName
                  ? input.displayName
                  : nameFromEmail(email),
              emailVerified: false,
              createdAt: now,
              updatedAt: now,
            },
          });
        }

        const existing = await prisma.rsvp.findUnique({
          where: { userId: user.id },
        });
        if (existing && ACTIVE.includes(existing.status)) {
          skipped.push({
            email,
            reason: `Already ${existing.status.toLowerCase().replace(/_/g, " ")}`,
          });
          continue;
        }

        const displayName =
          uniqueEmails.length === 1 && input.displayName
            ? input.displayName
            : existing?.displayName || user.name || nameFromEmail(email);

        if (input.confirmNow) {
          if (confirmed >= config.capacity) {
            skipped.push({ email, reason: "Capacity is full" });
            continue;
          }
          const note = "Added by admin";
          await prisma.$transaction(async (tx) => {
            const rsvp = await tx.rsvp.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                status: RsvpStatus.CONFIRMED,
                displayName,
                confirmedAt: new Date(),
                slotClaimedAt: new Date(),
                expiresAt: null,
              },
              update: {
                status: RsvpStatus.CONFIRMED,
                displayName,
                confirmedAt: new Date(),
                paymentSubmittedAt: null,
                cancelledAt: null,
                rejectedAt: null,
                rejectReason: null,
                expiresAt: null,
                slotClaimedAt: new Date(),
                waitlistedAt: new Date(),
              },
            });
            await tx.payment.create({
              data: {
                rsvpId: rsvp.id,
                method: "OTHER",
                amountCentavos: config.ticketPriceCentavos,
                referenceNote: note,
                review: PaymentReview.ACCEPTED,
                reviewedAt: new Date(),
                reviewedByEmail: ctx.session.user.email,
                reviewNote: note,
              },
            });
          });
          confirmed += 1;
        } else {
          await prisma.rsvp.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              status: join.status,
              displayName,
              expiresAt: join.expiresAt,
              slotClaimedAt: join.slotClaimedAt,
            },
            update: {
              status: join.status,
              displayName,
              expiresAt: join.expiresAt,
              slotClaimedAt: join.slotClaimedAt,
              paymentSubmittedAt: null,
              confirmedAt: null,
              cancelledAt: null,
              rejectedAt: null,
              rejectReason: null,
              waitlistedAt: new Date(),
            },
          });
        }

        added.push(email);
      }

      await audit(prisma, ctx.session.user.email, "addGuestsByEmail", undefined, {
        added,
        skipped,
        confirmNow: input.confirmNow,
      });

      return {
        ok: true as const,
        added,
        skipped,
      };
    }),
});
