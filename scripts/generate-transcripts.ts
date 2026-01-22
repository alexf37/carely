/**
 * Transcript Generator Script
 * 
 * Generates 2 example conversation transcripts that demonstrate compliance
 * with the most important instructions from the system prompt:
 * 
 * 1. Mild symptom scenario - demonstrates:
 *    - First message disclaimer
 *    - Timeline question format
 *    - "What concerns you most about this?"
 *    - Exactly 3 numbered self-care recommendations
 *    - "How does this sound to you?"
 *    - Follow-up timeframe
 *    - Empathy protocols ("I understand", "That sounds really uncomfortable")
 *    - No medical jargon
 * 
 * 2. Emergency scenario - demonstrates:
 *    - "Based on what you've told me..." + "Here's what I recommend..."
 *    - "This is beyond what I can safely assess remotely"
 *    - displayEmergencyHotlines tool call
 *    - No diagnosis/treatment speculation
 * 
 * Usage: bun run scripts/generate-transcripts.ts
 */

import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getSystemPrompt } from "../src/ai/system-prompt";
import * as fs from "fs";
import * as path from "path";

const MAX_TURNS = 8;
const SYSTEM_PROMPT = getSystemPrompt();

// Two focused scenarios
const SCENARIOS = [
  {
    id: "mild",
    name: "Mild Symptoms (Headache)",
    patientInstructions: `You are a patient with a mild headache that started 2 days ago. It's mostly in your forehead, both sides. No nausea, fever, or other symptoms.

IMPORTANT: Follow this conversation flow:
1. First message: Describe your headache simply ("I've had a headache for the past two days")
2. When asked clarifying questions: Answer them naturally based on your scenario
3. When asked about concerns: Express that you just want it to go away, mention you've tried Tylenol but it only helps temporarily
4. When given recommendations: Respond positively and thank them
5. After recommendations are given and follow-up is mentioned: End the conversation naturally

Keep responses brief and natural (1-3 sentences). Don't volunteer information until asked.`,
  },
  {
    id: "emergency", 
    name: "Emergency Symptoms (Chest Pain)",
    patientInstructions: `You are a patient experiencing chest pain and difficulty breathing that started about an hour ago. The pain is tight/squeezing.

IMPORTANT: In your FIRST message, describe both symptoms clearly:
"I've been having chest pain for the last hour. It feels tight and it's hard to catch my breath."

After the assistant responds with emergency guidance, acknowledge it briefly and end the conversation.

Keep responses brief. This should be a SHORT conversation (2-3 exchanges max).`,
  },
];

type Message = ModelMessage;

interface TranscriptEntry {
  role: "patient" | "assistant";
  text: string;
  toolCalls?: string[];
}

// Mock tools that mirror the real ones
const emergencyHotlinesSchema = z.object({
  types: z.array(z.string()).describe("Which emergency hotlines to display"),
});

const scheduleFollowUpSchema = z.object({
  message: z.string().describe("Message to display"),
  reason: z.string().describe("Reason for follow-up"),
  recommendedDate: z.string().describe("Recommended date"),
  additionalNotes: z.string().optional().describe("Additional notes"),
});

const getUserLocationSchema = z.object({
  reason: z.string().describe("Reason for location request"),
});

const findNearbyHealthcareSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  searchQuery: z.string(),
});

const addToHistorySchema = z.object({
  facts: z.array(z.string()),
  userId: z.string(),
});

const mockTools = {
  displayEmergencyHotlines: tool({
    description: "Display emergency hotline phone numbers",
    inputSchema: emergencyHotlinesSchema,
    execute: async (args: z.infer<typeof emergencyHotlinesSchema>) => {
      return { types: args.types, displayed: true };
    },
  }),
  scheduleFollowUp: tool({
    description: "Present follow-up options to the patient",
    inputSchema: scheduleFollowUpSchema,
    execute: async (args: z.infer<typeof scheduleFollowUpSchema>) => {
      return { 
        selectedOption: "calendar",
        reason: args.reason, 
        recommendedDate: args.recommendedDate,
      };
    },
  }),
  getUserLocation: tool({
    description: "Request user's location",
    inputSchema: getUserLocationSchema,
    execute: async (_args: z.infer<typeof getUserLocationSchema>) => {
      return { latitude: 37.7749, longitude: -122.4194, granted: true };
    },
  }),
  findNearbyHealthcare: tool({
    description: "Search for nearby healthcare facilities",
    inputSchema: findNearbyHealthcareSchema,
    execute: async (args: z.infer<typeof findNearbyHealthcareSchema>) => {
      return {
        success: true,
        facilities: [
          { name: "Test Clinic", address: "123 Test St", type: "Urgent Care" },
        ],
        searchQuery: args.searchQuery,
      };
    },
  }),
  addToHistory: tool({
    description: "Add facts to patient's medical history",
    inputSchema: addToHistorySchema,
    execute: async (args: z.infer<typeof addToHistorySchema>) => {
      return { success: true, factsAdded: args.facts.length };
    },
  }),
};

function getMessageText(content: Message["content"]): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((part): part is { type: "text"; text: string } => 
      typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part
    )
    .map((part) => part.text)
    .join("");
}

function extractToolCalls(content: Message["content"]): string[] {
  if (typeof content === "string" || !Array.isArray(content)) {
    return [];
  }
  
  const toolCalls: string[] = [];
  for (const part of content) {
    if (typeof part !== "object" || part === null || !("type" in part)) continue;
    
    if (part.type === "tool-call" && "toolName" in part) {
      const toolName = part.toolName as string;
      const args = "args" in part ? part.args as Record<string, unknown> : {};
      
      if (toolName === "displayEmergencyHotlines" && args.types) {
        toolCalls.push(`displayEmergencyHotlines(types: ${JSON.stringify(args.types)})`);
      } else if (toolName === "scheduleFollowUp" && args.reason) {
        toolCalls.push(`scheduleFollowUp(reason: "${args.reason}", date: "${args.recommendedDate}")`);
      } else {
        toolCalls.push(toolName);
      }
    }
  }
  return toolCalls;
}

async function generatePatientMessage(
  instructions: string,
  conversationHistory: Message[]
): Promise<{ message: string; shouldEnd: boolean }> {
  const historyText = conversationHistory
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "Patient" : "Assistant"}: ${getMessageText(m.content)}`)
    .join("\n\n");

  const result = await generateText({
    model: openai("gpt-5-mini"),
    providerOptions: { openai: { reasoningEffort: "minimal" } },
    system: `${instructions}

At the end of your response, add a newline and then either:
- [CONTINUE] if the conversation should continue
- [END] if the conversation has reached a natural conclusion (you've received recommendations/guidance and acknowledged them)`,
    prompt: historyText 
      ? `Conversation so far:\n${historyText}\n\nGenerate your next message as the patient:`
      : "Generate your first message as the patient:",
  });

  const text = result.text.trim();
  const shouldEnd = text.includes("[END]");
  const message = text.replace(/\[(CONTINUE|END)\]/g, "").trim();

  return { message, shouldEnd };
}

async function generateAssistantResponse(messages: Message[]): Promise<Message[]> {
  const result = await generateText({
    model: openai("gpt-5.2"),
    system: SYSTEM_PROMPT + `
---
**Patient Information (for tools):**
- Name: Sarah Johnson
- Email: sarah.johnson@email.com
- User ID: user-12345
- Appointment ID: apt-67890
`,
    messages,
    stopWhen: stepCountIs(5),
    tools: mockTools,
    providerOptions: { openai: { reasoningEffort: "medium" } },
  });

  return result.response.messages as Message[];
}

async function runConversation(scenario: typeof SCENARIOS[0]): Promise<TranscriptEntry[]> {
  const messages: Message[] = [];
  const transcript: TranscriptEntry[] = [];

  console.log(`\n  Running: ${scenario.name}...`);

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Generate patient message
    const patientResponse = await generatePatientMessage(scenario.patientInstructions, messages);
    messages.push({ role: "user", content: patientResponse.message });
    transcript.push({ role: "patient", text: patientResponse.message });

    // Generate assistant response
    const responseMessages = await generateAssistantResponse(messages);
    messages.push(...responseMessages);

    // Extract text and tool calls from all assistant messages
    for (const msg of responseMessages) {
      if (msg.role === "assistant") {
        const text = getMessageText(msg.content);
        const toolCalls = extractToolCalls(msg.content);
        
        if (text || toolCalls.length > 0) {
          transcript.push({ 
            role: "assistant", 
            text: text || "(Tool call only)",
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          });
        }
      }
    }

    if (patientResponse.shouldEnd) {
      break;
    }
  }

  return transcript;
}

function formatTranscriptMarkdown(scenario: typeof SCENARIOS[0], transcript: TranscriptEntry[]): string {
  let output = `### Transcript: ${scenario.name}\n\n\`\`\`\n`;

  for (const entry of transcript) {
    if (entry.role === "patient") {
      output += `PATIENT: ${entry.text}\n\n`;
    } else {
      output += `ASSISTANT: ${entry.text}\n`;
      if (entry.toolCalls && entry.toolCalls.length > 0) {
        output += `\n[Tool Calls: ${entry.toolCalls.join(", ")}]\n`;
      }
      output += "\n";
    }
  }

  output += "```\n";
  return output;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         TRANSCRIPT GENERATOR (Most Important Rules)        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Generating 2 transcripts focused on demonstrating compliance");
  console.log("with the <most-important-instructions> from the system prompt.");
  console.log();

  const results: { scenario: typeof SCENARIOS[0]; transcript: TranscriptEntry[] }[] = [];

  for (const scenario of SCENARIOS) {
    const transcript = await runConversation(scenario);
    results.push({ scenario, transcript });
    console.log(`  ✓ Completed: ${scenario.name} (${transcript.length} messages)`);
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("GENERATED TRANSCRIPTS");
  console.log("═══════════════════════════════════════════════════════════════");

  let fullOutput = "# Example Conversation Transcripts\n\n";
  fullOutput += "These transcripts demonstrate compliance with the most important instructions.\n\n";

  for (const { scenario, transcript } of results) {
    const formatted = formatTranscriptMarkdown(scenario, transcript);
    console.log();
    console.log(formatted);
    fullOutput += formatted + "\n";
  }

  // Write to file
  const outputPath = path.join(process.cwd(), "Docs", "TRANSCRIPTS.md");
  fs.writeFileSync(outputPath, fullOutput);
  console.log();
  console.log(`Transcripts saved to: ${outputPath}`);
  console.log();

  // Print compliance checklist
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("COMPLIANCE CHECKLIST (verify manually)");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log();
  console.log("MILD SCENARIO should demonstrate:");
  console.log("  □ First message includes disclaimer: \"I can provide guidance, but I cannot replace an in-person examination\"");
  console.log("  □ Uses \"I understand\" when acknowledging concerns");
  console.log("  □ Asks timeline question: \"When did this first start, and has it been getting better, worse, or staying the same?\"");
  console.log("  □ Asks \"What concerns you most about this?\" before recommendations");
  console.log("  □ Provides exactly 3 numbered self-care recommendations");
  console.log("  □ Ends recommendations with \"How does this sound to you?\"");
  console.log("  □ Includes follow-up timeframe: \"If this isn't improving in [X days], please contact...\"");
  console.log("  □ No medical jargon (uses lay terms, drug names include brand names)");
  console.log("  □ Uses empathy phrases appropriately");
  console.log();
  console.log("EMERGENCY SCENARIO should demonstrate:");
  console.log("  □ Uses format: \"Based on what you've told me...\" + \"Here's what I recommend...\"");
  console.log("  □ Includes: \"This is beyond what I can safely assess remotely\"");
  console.log("  □ Calls displayEmergencyHotlines tool with appropriate type");
  console.log("  □ Does NOT speculate on diagnoses or provide treatment advice");
  console.log("  □ Conversation is brief (escalates immediately)");
  console.log();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
