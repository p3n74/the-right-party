import { existsSync } from "node:fs";
import prisma, { PaymentReview, RsvpStatus } from "@the-right-party/db";
import { env } from "@the-right-party/env/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
  assertCanJoin,
  canSubmitPayment,
  expireOverdueSlots,
  getEventConfig,
  listGoing,
  loadRsvp,
  nextJoinStatus,
  serializeMe,
} from "../lib/rsvp";

async function mePayload(
  prisma: Parameters<typeof serializeMe>[0],
  user: { id: string; name: string; email: string; image?: string | null },
) {
  const config = await getEventConfig(prisma);
  const rsvp = await loadRsvp(prisma, user.id);
  return serializeMe(prisma, user, rsvp, config);
}

export const rsvpRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    await expireOverdueSlots(prisma);
    return mePayload(prisma, ctx.session.user);
  }),

  going: protectedProcedure.query(async () => {
    return listGoing(prisma);
  }),

  joinWaitlist: protectedProcedure
    .input(
      z
        .object({
          displayName: z.string().trim().min(1).max(80).optional(),
          phone: z.string().trim().max(32).optional(),
          affiliation: z.string().trim().max(120).optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      await expireOverdueSlots(prisma);
      const config = await getEventConfig(prisma);
      const existing = await prisma.rsvp.findUnique({
        where: { userId: ctx.session.user.id },
      });
      assertCanJoin(existing, config);

      const next = nextJoinStatus(config);
      const displayName = input?.displayName ?? ctx.session.user.name;

      await prisma.rsvp.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          status: next.status,
          displayName,
          phone: input?.phone,
          affiliation: input?.affiliation,
          expiresAt: next.expiresAt,
          slotClaimedAt: next.slotClaimedAt,
        },
        update: {
          status: next.status,
          displayName,
          phone: input?.phone,
          affiliation: input?.affiliation,
          expiresAt: next.expiresAt,
          slotClaimedAt: next.slotClaimedAt,
          paymentSubmittedAt: null,
          confirmedAt: null,
          cancelledAt: null,
          rejectedAt: null,
          rejectReason: null,
          waitlistedAt: new Date(),
        },
      });

      return mePayload(prisma, ctx.session.user);
    }),

  markPaid: protectedProcedure
    .input(
      z.object({
        method: z.enum(["GCASH", "MAYA", "OTHER"]),
        referenceNote: z.string().trim().max(64).optional(),
        receiptKey: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await expireOverdueSlots(prisma);
      const config = await getEventConfig(prisma);
      const rsvp = await prisma.rsvp.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!rsvp || !canSubmitPayment(rsvp.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Payment is not open for this RSVP",
        });
      }

      const needsReceipt =
        config.requireReceipt || rsvp.status === RsvpStatus.REJECTED;
      if (needsReceipt && !input.receiptKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A receipt photo is required",
        });
      }

      if (input.receiptKey) {
        const prefix = `${ctx.session.user.id}/`;
        if (!input.receiptKey.startsWith(prefix)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invalid receipt",
          });
        }
        const filePath = `${env.RECEIPT_STORAGE_DIR}/${input.receiptKey}`;
        if (!existsSync(filePath)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Receipt was not found. Upload it again.",
          });
        }
      }

      await prisma.$transaction([
        prisma.payment.create({
          data: {
            rsvpId: rsvp.id,
            method: input.method,
            amountCentavos: config.ticketPriceCentavos,
            referenceNote: input.referenceNote,
            receiptKey: input.receiptKey,
            review: PaymentReview.PENDING,
          },
        }),
        prisma.rsvp.update({
          where: { id: rsvp.id },
          data: {
            status: RsvpStatus.PAYMENT_SUBMITTED,
            paymentSubmittedAt: new Date(),
            rejectReason: null,
            rejectedAt: null,
            confirmedAt: null,
          },
        }),
      ]);

      return mePayload(prisma, ctx.session.user);
    }),

  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    await expireOverdueSlots(prisma);
    const rsvp = await prisma.rsvp.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!rsvp) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No RSVP" });
    }

    const cancellable: RsvpStatus[] = [
      RsvpStatus.WAITLISTED,
      RsvpStatus.PAYMENT_PENDING,
      RsvpStatus.CONFIRMED,
    ];
    if (!cancellable.includes(rsvp.status)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This RSVP cannot be cancelled right now",
      });
    }

    await prisma.rsvp.update({
      where: { id: rsvp.id },
      data: {
        status: RsvpStatus.CANCELLED,
        cancelledAt: new Date(),
        slotClaimedAt: null,
        expiresAt: null,
      },
    });

    return mePayload(prisma, ctx.session.user);
  }),
});
