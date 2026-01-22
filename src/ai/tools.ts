import { tool as createTool, generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import Exa from "exa-js";
import { eq, inArray } from "drizzle-orm";
import { sendFollowUpEmail } from "@/email";
import { followUpEmailWorkflow } from "@/app/workflows/follow-up-email-workflow";
import { db } from "@/server/db";
import { history } from "@/server/db/schema";

export const emergencyHotlinesTool = createTool({
  description:
    "Display emergency hotline phone numbers for the patient to call. Use this tool when the patient describes a medical emergency, crisis situation, or needs specialized support resources.",
  inputSchema: z.object({
    types: z
      .array(
        z.enum([
          "general",
          "poison",
          "suicide",
          "domesticViolence",
          "sexualAssault",
          "childAbuse",
          "substanceAbuse",
          "veterans",
          "lgbtqYouth",
          "eatingDisorders",
        ])
      )
      .min(1)
      .describe(
        "Which emergency hotlines to display: 'general' for 911, 'poison' for Poison Control, 'suicide' for 988 Crisis Lifeline, 'domesticViolence' for National Domestic Violence Hotline, 'sexualAssault' for RAINN, 'childAbuse' for Childhelp, 'substanceAbuse' for SAMHSA, 'veterans' for Veterans Crisis Line, 'lgbtqYouth' for Trevor Project, 'eatingDisorders' for Eating Disorders Hotline"
      ),
  }),
  execute: async function ({ types }) {
    console.log("displayEmergencyHotlines tool executed", { types });
    return { types };
  },
});

export const scheduleFollowUpTool = createTool({
  description:
    "Present follow-up options to the patient when a follow-up is recommended. Use this tool after discussing a condition that requires follow-up care. The patient will be presented with options to: add to calendar, receive an email now, or receive an email reminder at the follow-up date. IMPORTANT: Since tool calls are generated before text content, you MUST include what you want to say to the patient in the 'message' parameter. This message will be displayed above the follow-up options.",
  inputSchema: z.object({
    message: z
      .string()
      .describe("The message to display to the patient before the follow-up options. This is REQUIRED because tool calls are generated before text content. Include your response about their condition and why you're recommending a follow-up."),
    reason: z
      .string()
      .describe("Brief description of why the follow-up is needed (e.g., 'Check on cold symptoms', 'Review blood pressure')"),
    recommendedDate: z
      .string()
      .describe("The recommended follow-up date in a human-readable format (e.g., 'in 3 days', 'January 25, 2026', 'next week')"),
    additionalNotes: z
      .string()
      .optional()
      .describe("Any additional notes or instructions for the patient"),
  }),
});

export const sendFollowUpEmailNowTool = createTool({
  description:
    "Send a follow-up reminder email to the patient immediately. Only call this tool after the patient has selected the 'email now' option from scheduleFollowUp.",
  inputSchema: z.object({
    reason: z.string().describe("The reason for the follow-up"),
    recommendedDate: z.string().describe("The recommended follow-up date"),
    additionalNotes: z.string().optional().describe("Additional notes for the patient"),
    patientEmail: z.string().describe("The patient's email address"),
    patientName: z.string().describe("The patient's name"),
    appointmentId: z.string().describe("The current appointment/chat ID to link back to"),
  }),
  execute: async function ({ reason, recommendedDate, additionalNotes, patientEmail, patientName, appointmentId }) {
    try {
      await sendFollowUpEmail({
        to: patientEmail,
        patientName,
        followUpReason: reason,
        followUpDate: recommendedDate,
        additionalNotes,
        appointmentId,
      });
      return { success: true, message: "Follow-up email sent successfully" };
    } catch (error) {
      console.error("Failed to send follow-up email:", error);
      return { success: false, message: "Failed to send email" };
    }
  },
});

export const scheduleFollowUpEmailTool = createTool({
  description:
    "Schedule a follow-up reminder email to be sent to the patient at the time of the follow-up. Only call this tool after the patient has selected the 'email at follow-up time' option from scheduleFollowUp.",
  inputSchema: z.object({
    reason: z.string().describe("The reason for the follow-up"),
    recommendedDate: z.string().describe("The recommended follow-up date"),
    scheduledDateTime: z.string().describe("The ISO 8601 date-time when the email should be sent"),
    additionalNotes: z.string().optional().describe("Additional notes for the patient"),
    patientEmail: z.string().describe("The patient's email address"),
    patientName: z.string().describe("The patient's name"),
    appointmentId: z.string().describe("The current appointment/chat ID to link back to"),
  }),
  execute: async function ({ reason, recommendedDate, scheduledDateTime, additionalNotes, patientEmail, patientName, appointmentId }) {
    try {
      await followUpEmailWorkflow({
        patientEmail,
        patientName,
        followUpReason: reason,
        followUpDate: recommendedDate,
        additionalNotes,
        scheduledDateTime,
        appointmentId,
      });
      return { success: true, message: `Follow-up email scheduled for ${recommendedDate}` };
    } catch (error) {
      console.error("Failed to schedule follow-up email:", error);
      return { success: false, message: "Failed to schedule email" };
    }
  },
});

export const getUserLocationTool = createTool({
  description:
    "Request the user's current location using their browser's geolocation. This is a client-side tool that will prompt the user for location permission. Use this BEFORE calling findNearbyHealthcare when you need to find nearby clinics, specialists, or hospitals. If the user denies permission, you should acknowledge this and offer alternatives like asking them to share their city/zip code.",
  inputSchema: z.object({
    reason: z
      .string()
      .describe("A brief explanation of why location is needed, shown to the user (e.g., 'to find urgent care clinics near you')"),
  }),
});

const healthcareFacilitySchema = z.object({
  name: z.string().describe("Name of the healthcare facility"),
  type: z.string().describe("Type of facility (e.g., 'Urgent Care', 'Hospital', 'Clinic', 'Pharmacy')"),
  address: z.string().describe("Full address of the facility"),
  city: z.string().describe("City where the facility is located"),
  phone: z.string().nullable().describe("Phone number if available, null if not found"),
  hours: z.string().nullable().describe("Operating hours if available, null if not found"),
  rating: z.number().nullable().describe("Rating if available (1-5), null if not found"),
  description: z.string().nullable().describe("Brief description or relevant details, null if not found"),
});

export type HealthcareFacility = z.infer<typeof healthcareFacilitySchema>;

export const findNearbyHealthcareTool = createTool({
  description:
    "Search for nearby healthcare facilities (clinics, hospitals, specialists, pharmacies, etc.) based on the user's location. Only call this tool AFTER successfully obtaining the user's location via getUserLocation. If getUserLocation returned an error or denied permission, do NOT call this tool - instead ask the user for their city/zip code. Do not call this tool if the user has not granted permission to access their location. When you call this tool, don't list the things that you listed in this tool call in your message. They will already be shown to the user in some custom UI, so you don't need to repeat it.",
  inputSchema: z.object({
    latitude: z.number().describe("The user's latitude from getUserLocation"),
    longitude: z.number().describe("The user's longitude from getUserLocation"),
    city: z.string().optional().describe("The city name if known (helps improve search results)"),
    searchQuery: z
      .string()
      .describe("What type of healthcare to search for (e.g., 'urgent care clinic', 'pharmacy', 'dermatologist', 'hospital with strep test')"),
    additionalContext: z
      .string()
      .optional()
      .describe("Any additional context to refine the search (e.g., 'open now', 'accepts walk-ins', 'pediatric')"),
  }),
  execute: async function ({ latitude, longitude, city, searchQuery, additionalContext }) {
    try {
      const locationContext = city 
        ? `near ${city}` 
        : `near coordinates ${latitude}, ${longitude}`;
      
      const fullSearchQuery = additionalContext
        ? `${searchQuery} ${additionalContext} ${locationContext}`
        : `${searchQuery} ${locationContext}`;

      console.log("[findNearbyHealthcare] Searching for:", fullSearchQuery);

      const exa = new Exa(process.env.EXA_API_KEY);
      const searchResult = await exa.searchAndContents(fullSearchQuery, {
        text: true,
        type: "auto",
        numResults: 10,
      });

      console.log("[findNearbyHealthcare] Exa search result:", searchResult.results.length, "results");

      const searchText = searchResult.results
        .map((r) => `${r.title}\n${r.url}\n${r.text || ""}`)
        .join("\n\n---\n\n");

      const extractionResult = await generateText({
        model: openai("gpt-5-nano"),
        providerOptions: {
          openai: {
            reasoningEffort: "minimal",
          },
        },
        output: Output.array({
          name: "healthcare_facilities",
          description: "List of healthcare facilities extracted from the search results",
          element: healthcareFacilitySchema,
        }),
        prompt: `Extract up to 5 healthcare facilities from this text. Only include real facilities with names and locations. Focus on extracting facility names, addresses, phone numbers, and hours:\n\n${searchText}`,
      });

      console.log("[findNearbyHealthcare] Extraction result:", extractionResult.output);

      const facilities = extractionResult.output || [];

      return {
        success: true,
        facilities,
        searchContext: fullSearchQuery,
        searchQuery: fullSearchQuery,
      };
    } catch (error) {
      console.error("[findNearbyHealthcare] Error:", error);
      return {
        success: false,
        facilities: [],
        searchContext: "Failed to search for healthcare facilities",
        searchQuery: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

const historyAnalysisSchema = z.object({
  contradictedPrimaryKeys: z
    .array(z.string())
    .describe(
      "Primary keys (UUIDs) of existing history facts that are now contradicted or superseded by new facts. Only include facts where new information directly contradicts old information."
    ),
  redundantNewFactIndices: z
    .array(z.number())
    .describe(
      "Indices (0-based) of new facts that are completely redundant with existing history and should NOT be added. Only mark as redundant if the new fact adds NO new information. If a new fact contains some redundant info alongside new info, do NOT include it here - it should still be added."
    ),
});

export type AddFactsToHistoryResult = {
  success: boolean;
  factsAdded: number;
  factsSkippedAsRedundant: number;
  oldFactsRemoved: number;
  message: string;
  error?: string;
};

export type AddFactsToHistoryOptions = {
  facts: string[];
  userId: string;
  /** Optional document ID to link facts to their source document */
  documentId?: string;
};

/**
 * Add facts to a patient's permanent medical history.
 * This function handles deduplication and contradiction detection.
 */
export async function addFactsToHistory(
  options: AddFactsToHistoryOptions
): Promise<AddFactsToHistoryResult> {
  const { facts, userId, documentId } = options;
  try {
    const existingHistory = await db.query.history.findMany({
      where: eq(history.userId, userId),
    });

    console.log("[addFactsToHistory] Existing history entries:", existingHistory.length);
    console.log("[addFactsToHistory] New facts to evaluate:", facts.length);

    const existingHistoryText =
      existingHistory.length > 0
        ? existingHistory
            .map((h) => `[PK: ${h.id}] ${h.content}`)
            .join("\n")
        : "No existing history entries.";

    const newFactsText = facts
      .map((fact, index) => `[Index: ${index}] ${fact}`)
      .join("\n");

    const analysisPrompt = `You are analyzing a patient's medical history to identify contradictions and redundancy.

EXISTING HISTORY (with primary keys):
${existingHistoryText}

NEW FACTS TO ADD (with indices):
${newFactsText}

Your task:
1. Identify any EXISTING history entries that are now CONTRADICTED by new facts. For example:
   - If existing says "Patient does not smoke" and new says "Patient smokes 1 pack per day", the old entry is contradicted.
   - If existing says "Patient takes Lisinopril 10mg" and new says "Patient stopped taking Lisinopril", the old entry is contradicted.
   - Only mark as contradicted if the new information directly conflicts with the old - not just if it provides more detail.

2. Identify any NEW facts that are COMPLETELY REDUNDANT with existing history and add no new information. For example:
   - If existing says "Patient is allergic to penicillin" and new says "Patient has penicillin allergy", the new fact is redundant.
   - BUT if existing says "Patient is allergic to penicillin" and new says "Patient is allergic to penicillin and amoxicillin", the new fact is NOT redundant because it adds new information about amoxicillin.
   - When in doubt, do NOT mark as redundant - it's better to have slightly duplicative information than to lose new details.

Return your analysis.`;

    const analysisResult = await generateText({
      model: openai("gpt-5-mini"),
      providerOptions: {
        openai: {
          reasoningEffort: "minimal",
        },
      },
      output: Output.object({
        schema: historyAnalysisSchema,
      }),
      prompt: analysisPrompt,
    });

    const analysis = analysisResult.output;

    if (!analysis) {
      throw new Error("Failed to get analysis from LLM");
    }

    console.log("[addFactsToHistory] Analysis result:", analysis);

    if (analysis.contradictedPrimaryKeys.length > 0) {
      await db
        .delete(history)
        .where(inArray(history.id, analysis.contradictedPrimaryKeys));
      console.log(
        "[addFactsToHistory] Deleted contradicted entries:",
        analysis.contradictedPrimaryKeys.length
      );
    }

    const redundantIndices = new Set(analysis.redundantNewFactIndices);
    const factsToAdd = facts.filter((_, index) => !redundantIndices.has(index));

    if (factsToAdd.length > 0) {
      const newHistoryRecords = factsToAdd.map((content) => ({
        id: crypto.randomUUID(),
        userId,
        documentId,
        createdAt: new Date(),
        content,
      }));

      await db.insert(history).values(newHistoryRecords);
      console.log("[addFactsToHistory] Added new entries:", factsToAdd.length);
    }

    return {
      success: true,
      factsAdded: factsToAdd.length,
      factsSkippedAsRedundant: facts.length - factsToAdd.length,
      oldFactsRemoved: analysis.contradictedPrimaryKeys.length,
      message: `Successfully updated patient history: added ${factsToAdd.length} new fact(s), removed ${analysis.contradictedPrimaryKeys.length} outdated fact(s), skipped ${facts.length - factsToAdd.length} redundant fact(s).`,
    };
  } catch (error) {
    console.error("[addFactsToHistory] Error:", error);
    return {
      success: false,
      factsAdded: 0,
      factsSkippedAsRedundant: 0,
      oldFactsRemoved: 0,
      message: "Failed to update patient history",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const addToHistoryTool = createTool({
  description:
    "Add facts to the patient's permanent medical history. Use this tool when the patient reveals information that should be recorded for future reference across appointments. This includes: chronic conditions, past surgeries/hospitalizations, allergies, lifestyle factors (smoking history, alcohol use, drug use), family medical history, long-term medications, and other persistent health information. Do NOT use this for temporary symptoms like 'sore throat', 'headache', or 'fever' that are only relevant to the current appointment. The facts you add should be written as clear, concise statements.",
  inputSchema: z.object({
    facts: z
      .array(z.string())
      .min(1)
      .describe(
        "Array of facts to add to the patient's medical history. Each fact should be a concise, standalone statement about permanent medical history (e.g., 'Patient has a history of smoking for 10 years', 'Patient is allergic to penicillin', 'Patient had appendectomy in 2015')."
      ),
    userId: z
      .string()
      .describe("The patient's user ID (from the patient information in the system context)"),
  }),
  execute: async function ({ facts, userId }) {
    return addFactsToHistory({ facts, userId });
  },
});

export const tools = {
  displayEmergencyHotlines: emergencyHotlinesTool,
  scheduleFollowUp: scheduleFollowUpTool,
  sendFollowUpEmailNow: sendFollowUpEmailNowTool,
  scheduleFollowUpEmail: scheduleFollowUpEmailTool,
  getUserLocation: getUserLocationTool,
  findNearbyHealthcare: findNearbyHealthcareTool,
  addToHistory: addToHistoryTool,
};
