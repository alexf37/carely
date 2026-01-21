import { streamText, type UIMessage, convertToModelMessages } from 'ai';
import { openai } from "@ai-sdk/openai";
import { getSession } from "@/server/better-auth/server";

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-5-nano"),
    messages: await convertToModelMessages(messages),
    providerOptions: {
        openai: {
            reasoningEffort: "minimal"
        }
    }
  });

  return result.toUIMessageStreamResponse();
}