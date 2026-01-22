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
  /**
   * Whether this message should be hidden from the UI (e.g., system continuations)
   */
  hidden: z.boolean().optional(),
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
export function createMessageMetadata(options?: { hidden?: boolean }): ChatMessageMetadata {
  return {
    timestamp: new Date().toISOString(),
    hidden: options?.hidden,
  };
}
