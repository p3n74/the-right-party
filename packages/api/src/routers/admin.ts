import prisma, { PaymentReview, RsvpStatus } from "@the-right-party/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, router } from "../index";
import {
  audit,
  confirmedCount,
  getEventConfig,
} from "../lib/rsvp";

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
          user: { select: { email: true, name: true, image: true } },
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
});
