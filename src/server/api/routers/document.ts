import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { del } from "@vercel/blob";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { documents } from "@/server/db/schema";

export const documentRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userDocuments = await ctx.db.query.documents.findMany({
      where: eq(documents.userId, ctx.session.user.id),
      orderBy: [desc(documents.createdAt)],
    });

    return userDocuments.map((doc) => ({
      id: doc.id,
      url: doc.url,
      filename: doc.filename,
      createdAt: doc.createdAt,
    }));
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.id),
      });

      if (!document || document.userId !== ctx.session.user.id) {
        throw new Error("Document not found or access denied");
      }

      await del(document.url);

      await ctx.db.delete(documents).where(eq(documents.id, input.id));

      return { success: true };
    }),
});
