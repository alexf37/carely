import { streamText, convertToModelMessages, stepCountIs, generateText } from 'ai';
import { openai } from "@ai-sdk/openai";
import { eq } from "drizzle-orm";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { chats, history } from "@/server/db/schema";
import { type ChatUIMessage, createMessageMetadata } from "@/lib/chat-types";
import { tools } from "@/ai/tools";
import { getSystemPrompt } from "@/ai/system-prompt";

async function generateAppointmentDescription(userMessage: string): Promise<string | null> {
  try {
    const result = await generateText({
      model: openai("gpt-5-nano"),
      system: `You generate very brief appointment descriptions (2-5 words) for medical visits based on the patient's first message. 
Examples:
- "I have a headache" -> "Headache"
- "My throat hurts and I have a fever" -> "Sore throat, fever"
- "I think I sprained my ankle yesterday" -> "Ankle injury"
- "I've been feeling really tired lately" -> "Fatigue"
- "I have a rash on my arm" -> "Skin rash"

If the message is not medically relevant (just a greeting, gibberish, or off-topic), respond with exactly "SKIP".
Only output the brief description or "SKIP", nothing else.`,
      prompt: userMessage,
      providerOptions: {
        openai: {
          reasoningEffort: "minimal"
        }
      },
    });
    
    const description = result.text.trim();
    if (description === "SKIP" || description.length === 0) {
      return null;
    }
    return description;
  } catch (error) {
    console.error("Failed to generate appointment description:", error);
    return null;
  }
}

// Get the base system prompt from the shared module
const BASE_SYSTEM_PROMPT = getSystemPrompt({
  includeDeveloperBackdoor: process.env.NODE_ENV === "development",
});


export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, chatPublicId }: { messages: ChatUIMessage[]; chatPublicId?: string } = await req.json();

  if (!chatPublicId) {
    return new Response("Chat public ID is required", { status: 400 });
  }

  // Ensure all incoming messages have timestamp metadata
  const messagesWithMetadata: ChatUIMessage[] = messages.map((msg) => ({
    ...msg,
    metadata: msg.metadata ?? createMessageMetadata(),
  }));

  // If chatPublicId is provided, verify ownership
  const chatRecord = await db.query.chats.findFirst({
    where: eq(chats.publicId, chatPublicId),
  });
  

    if (!chatRecord) {
      return new Response("Chat not found", { status: 404 });
    }

    if (chatRecord.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

  // Fetch user's medical history
  const userHistory = await db.query.history.findMany({
    where: eq(history.userId, session.user.id),
  });

  // Build system prompt with history and user info appended
  let systemPrompt = BASE_SYSTEM_PROMPT;
  
  // Add user info for tools that need patient context
  const userInfoSection = `
---
**Patient Information (for tools):**
- Name: ${session.user.name}
- Email: ${session.user.email}
- User ID: ${session.user.id}
- Appointment ID: ${chatRecord.publicId}
`;
  systemPrompt = systemPrompt + userInfoSection;

  if (userHistory.length > 0) {
    const historySection = `
---
The following is the patient's known medical history. This may not be complete, so some things are still worth asking about. Do not proactively bring up or reference this history unless it is directly relevant to what the patient is discussing. Use it only as background context to inform your responses.

${userHistory.map((h) => `${h.content}`).join("\n")}
`;
    systemPrompt = systemPrompt + historySection;
  }

  // Capture the timestamp when the assistant message starts
  let assistantMessageMetadata: ReturnType<typeof createMessageMetadata> | null = null;

  const result = streamText({
    system: systemPrompt,
    model: openai("gpt-5.2"),
    messages: await convertToModelMessages(messagesWithMetadata),
    tools,
    stopWhen: stepCountIs(5),
    providerOptions: {
        openai: {
            reasoningEffort: "medium"
        }
    },
    async onFinish({ response }) {
      // Persist messages if we have a chatPublicId
        // The messages array already contains the user's message
        // We need to add the assistant's response to it
        const assistantContent = response.messages[0]?.content;
        const textContent = typeof assistantContent === "string"
          ? assistantContent
          : Array.isArray(assistantContent)
            ? assistantContent
                .filter((part): part is { type: "text"; text: string } => part.type === "text")
                .map(part => part.text)
                .join("")
            : "";

        const assistantMessage: ChatUIMessage = {
          id: response.id,
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: textContent }],
          metadata: assistantMessageMetadata ?? createMessageMetadata(),
        };

        const updatedMessages = [...messagesWithMetadata, assistantMessage];

        // Check if we should generate a description for this appointment
        let descriptionUpdate: { description: string } | Record<string, never> = {};
        if (!chatRecord.description) {
          // Find the first user message with actual content
          const firstUserMessage = messagesWithMetadata.find(
            (msg) => msg.role === "user" && msg.parts?.some((part) => part.type === "text" && part.text?.trim())
          );
          
          if (firstUserMessage) {
            const userText = firstUserMessage.parts
              ?.filter((part): part is { type: "text"; text: string } => part.type === "text")
              .map((part) => part.text)
              .join(" ")
              .trim();
            
            if (userText) {
              const description = await generateAppointmentDescription(userText);
              if (description) {
                descriptionUpdate = { description };
              }
            }
          }
        }

        await db
          .update(chats)
          .set({ content: { messages: updatedMessages }, ...descriptionUpdate })
          .where(eq(chats.id, chatRecord.id));
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      // Set timestamp when the assistant message starts streaming
      if (part.type === "start") {
        assistantMessageMetadata = createMessageMetadata();
        return assistantMessageMetadata;
      }
      // Return the same metadata on finish to ensure consistency
      return assistantMessageMetadata ?? createMessageMetadata();
    },
  });
}