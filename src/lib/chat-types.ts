import type { UIMessage } from "ai";
import { z } from "zod";

/**
 * Zod schema for chat message metadata
 * Following Vercel AI SDK v6 recommended pattern for type-safe metadata
 */
export const chatMessageMetadataSchema = z.object({
  /**
   * Timestamp when the message was created, stored as ISO string
   */
  timestamp: z.string().datetime(),
});

/**
 * Metadata type inferred from the Zod schema
 */
export type ChatMessageMetadata = z.infer<typeof chatMessageMetadataSchema>;

/**
 * Custom UIMessage type with timestamp metadata
 * This type should be used on both frontend and backend for type safety
 */
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

/**
 * Creates metadata with the current timestamp
 */
export function createMessageMetadata(): ChatMessageMetadata {
  return {
    timestamp: new Date().toISOString(),
  };
}
