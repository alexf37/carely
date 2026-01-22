import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { chats, visits, user, history } from "@/server/db/schema";

// Zod schemas for intake form data
const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  notes: z.string(),
});

const medicalEventSchema = z.object({
  type: z.enum(["surgery", "hospitalization", "illness"]),
  description: z.string(),
  year: z.string(),
});

const lifestyleAnswersSchema = z.object({
  smoking: z.enum(["yes", "no"]).nullable(),
  formerSmoker: z.enum(["yes", "no"]).nullable(),
  alcohol: z.enum(["yes", "no"]).nullable(),
  recreationalDrugs: z.enum(["yes", "no"]).nullable(),
  sexuallyActive: z.enum(["yes", "no"]).nullable(),
  exercise: z.enum(["yes", "no"]).nullable(),
});

const intakeFormSchema = z.object({
  dateOfBirth: z.string(),
  sexAssignedAtBirth: z.string(),
  gender: z.string(),
  allergies: z.string(),
  chronicIllnesses: z.array(z.string()),
  medicalHistory: z.array(medicalEventSchema),
  currentMedications: z.array(medicationSchema),
  lifestyleAnswers: lifestyleAnswersSchema,
});

// Label mappings for displaying readable values
const SEX_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  intersex: "Intersex",
  "prefer-not-to-say": "Prefer not to say",
};

const GENDER_LABELS: Record<string, string> = {
  woman: "Woman",
  man: "Man",
  "trans-woman": "Trans woman",
  "trans-man": "Trans man",
  "non-binary": "Non-binary",
  "prefer-not-to-say": "Prefer not to say",
};

const LIFESTYLE_PHRASES: Record<string, { yes: string; no: string }> = {
  smoking: {
    yes: "Patient currently smokes (including vapes)",
    no: "Patient does not currently smoke",
  },
  formerSmoker: {
    yes: "Patient is a former smoker",
    no: "Patient is not a former smoker",
  },
  alcohol: {
    yes: "Patient drinks alcohol",
    no: "Patient does not drink alcohol",
  },
  recreationalDrugs: {
    yes: "Patient uses recreational drugs",
    no: "Patient does not use recreational drugs",
  },
  sexuallyActive: {
    yes: "Patient is sexually active",
    no: "Patient is not sexually active",
  },
  exercise: {
    yes: "Patient exercises regularly",
    no: "Patient does not exercise regularly",
  },
};

// Helper to transform intake data into history content strings
function buildHistoryRecords(data: z.infer<typeof intakeFormSchema>): string[] {
  const records: string[] = [];

  // Date of birth
  if (data.dateOfBirth.trim()) {
    records.push(`Patient's date of birth is ${data.dateOfBirth}.`);
  }

  // Sex assigned at birth
  if (data.sexAssignedAtBirth.trim()) {
    const label = SEX_LABELS[data.sexAssignedAtBirth] ?? data.sexAssignedAtBirth;
    records.push(`Sex assigned at birth: ${label}.`);
  }

  // Gender identity
  if (data.gender.trim()) {
    const label = GENDER_LABELS[data.gender] ?? data.gender;
    records.push(`Gender identity: ${label}.`);
  }

  // Allergies
  if (data.allergies.trim()) {
    records.push(`Known allergies include: ${data.allergies}.`);
  }

  // Chronic conditions
  if (data.chronicIllnesses.length > 0) {
    records.push(`Chronic conditions: ${data.chronicIllnesses.join(", ")}.`);
  }

  // Medical history events
  const filledEvents = data.medicalHistory.filter(
    (e) => e.description.trim() || e.year.trim()
  );
  if (filledEvents.length > 0) {
    const eventDescriptions = filledEvents.map((event) => {
      const typeLabel =
        event.type === "surgery"
          ? "Surgery"
          : event.type === "hospitalization"
            ? "Hospitalization"
            : "Major illness";
      const yearPart = event.year ? ` (${event.year})` : "";
      const descPart = event.description || "unspecified";
      return `${typeLabel}: ${descPart}${yearPart}`;
    });
    records.push(`Past medical history includes: ${eventDescriptions.join("; ")}.`);
  }

  // Current medications
  const filledMeds = data.currentMedications.filter((m) => m.name.trim());
  if (filledMeds.length > 0) {
    const medDescriptions = filledMeds.map((med) => {
      let desc = med.name;
      if (med.dosage.trim()) {
        desc += ` (${med.dosage})`;
      }
      if (med.notes.trim()) {
        desc += ` - ${med.notes}`;
      }
      return desc;
    });
    records.push(`Current medications: ${medDescriptions.join("; ")}.`);
  }

  // Lifestyle answers - only include answered questions
  const answeredLifestyle = Object.entries(data.lifestyleAnswers).filter(
    ([, answer]) => answer !== null
  ) as [keyof typeof LIFESTYLE_PHRASES, "yes" | "no"][];

  if (answeredLifestyle.length > 0) {
    const lifestyleParts = answeredLifestyle.map(([key, answer]) => {
      const phrases = LIFESTYLE_PHRASES[key];
      return phrases?.[answer] ?? "";
    }).filter(Boolean);
    records.push(`Lifestyle: ${lifestyleParts.join(". ")}.`);
  }

  return records;
}

const APPOINTMENTS_PAGE_SIZE = 10;

export const appointmentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(APPOINTMENTS_PAGE_SIZE),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;

      const userVisits = await ctx.db.query.visits.findMany({
        where: cursor
          ? (visits, { eq, and, lt }) =>
              and(
                eq(visits.userId, ctx.session.user.id),
                lt(visits.createdAt, new Date(cursor))
              )
          : eq(visits.userId, ctx.session.user.id),
        orderBy: [desc(visits.createdAt)],
        limit: limit + 1,
        with: {
          chat: {
            columns: {
              publicId: true,
              description: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (userVisits.length > limit) {
        const nextItem = userVisits.pop();
        nextCursor = nextItem?.createdAt.toISOString();
      }

      return {
        items: userVisits.map((visit) => ({
          id: visit.id,
          createdAt: visit.createdAt,
          publicId: visit.chat.publicId,
          description: visit.chat.description,
        })),
        nextCursor,
      };
    }),

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

  submitIntake: protectedProcedure
    .input(intakeFormSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Build natural language history records from intake data
      const contentStrings = buildHistoryRecords(input);

      // Insert history records (only for non-empty steps)
      if (contentStrings.length > 0) {
        const historyRecords = contentStrings.map((content) => ({
          id: crypto.randomUUID(),
          userId,
          createdAt: new Date(),
          content,
        }));

        await ctx.db.insert(history).values(historyRecords);
      }

      // Mark intake as complete
      await ctx.db
        .update(user)
        .set({ hasCompletedIntake: true })
        .where(eq(user.id, userId));

      return { success: true, recordsCreated: contentStrings.length };
    }),
});
