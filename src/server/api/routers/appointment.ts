import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { chats, visits, user } from "@/server/db/schema";

export const appointmentRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const chatId = crypto.randomUUID();
    const visitId = crypto.randomUUID();

    // Create the chat first
    await ctx.db.insert(chats).values({
      id: chatId,
      userId: ctx.session.user.id,
      createdAt: new Date(),
      content: { messages: [] },
    });

    // Get the created chat to retrieve the auto-generated publicId
    const chat = await ctx.db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create chat",
      });
    }

    // Create the visit linked to the chat
    await ctx.db.insert(visits).values({
      id: visitId,
      userId: ctx.session.user.id,
      createdAt: new Date(),
      chatId: chatId,
    });

    return { publicId: chat.publicId };
  }),

  getByPublicId: protectedProcedure
    .input(z.object({ publicId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const chat = await ctx.db.query.chats.findFirst({
        where: eq(chats.publicId, input.publicId),
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      // Ensure the user owns this chat
      if (chat.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this appointment",
        });
      }

      return {
        publicId: chat.publicId,
        createdAt: chat.createdAt,
        messages: (chat.content as { messages?: unknown[] })?.messages ?? [],
      };
    }),

  completeIntake: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(user)
      .set({ hasCompletedIntake: true })
      .where(eq(user.id, ctx.session.user.id));

    return { success: true };
  }),
});
