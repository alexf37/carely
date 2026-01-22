import { tool as createTool, generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import Exa from "exa-js";
import { sendFollowUpEmail } from "@/email";
import { followUpEmailWorkflow } from "@/app/workflows/follow-up-email-workflow";

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

// Client-side tool - no execute function
// This will show UI options and wait for user selection via addToolResult
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
  // No execute function - this is a client-side tool that waits for user input
});

// Server-side tool - sends email immediately
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

// Server-side tool - schedules email for the follow-up date using Vercel Workflow
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

// Client-side tool - requests user's location via browser Geolocation API
// This handles the browser permission flow and returns coordinates or an error
export const getUserLocationTool = createTool({
  description:
    "Request the user's current location using their browser's geolocation. This is a client-side tool that will prompt the user for location permission. Use this BEFORE calling findNearbyHealthcare when you need to find nearby clinics, specialists, or hospitals. If the user denies permission, you should acknowledge this and offer alternatives like asking them to share their city/zip code.",
  inputSchema: z.object({
    reason: z
      .string()
      .describe("A brief explanation of why location is needed, shown to the user (e.g., 'to find urgent care clinics near you')"),
  }),
  // No execute function - this is a client-side tool
});

// Schema for healthcare facility results
// Note: Using .nullable() instead of .optional() because OpenAI's structured output
// requires all properties to be in the 'required' array
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

// Server-side tool - searches for nearby healthcare using OpenAI web search
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
      // Construct a search query with location context
      const locationContext = city 
        ? `near ${city}` 
        : `near coordinates ${latitude}, ${longitude}`;
      
      const fullSearchQuery = additionalContext
        ? `${searchQuery} ${additionalContext} ${locationContext}`
        : `${searchQuery} ${locationContext}`;

      console.log("[findNearbyHealthcare] Searching for:", fullSearchQuery);

      // Step 1: Use Exa to search for healthcare facilities
      const exa = new Exa(process.env.EXA_API_KEY);
      const searchResult = await exa.searchAndContents(fullSearchQuery, {
        text: true,
        type: "auto",
        numResults: 10,
      });

      console.log("[findNearbyHealthcare] Exa search result:", searchResult.results.length, "results");

      // Combine search results into text for extraction
      const searchText = searchResult.results
        .map((r) => `${r.title}\n${r.url}\n${r.text || ""}`)
        .join("\n\n---\n\n");

      // Step 2: Extract structured data from the search results using structured outputs
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

export const tools = {
  displayEmergencyHotlines: emergencyHotlinesTool,
  scheduleFollowUp: scheduleFollowUpTool,
  sendFollowUpEmailNow: sendFollowUpEmailNowTool,
  scheduleFollowUpEmail: scheduleFollowUpEmailTool,
  getUserLocation: getUserLocationTool,
  findNearbyHealthcare: findNearbyHealthcareTool,
};
