"use client";

import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
    MessageResponse,
    MessageAttachments,
    MessageThinking,
} from "@/components/ai-elements/message";
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputButton,
    PromptInputTools,
    usePromptInputAttachments,
    type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useRef, useState, useEffect } from "react";
import { type ChatMessageMetadata, createMessageMetadata } from "@/lib/chat-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PaperclipIcon, PlusIcon, XIcon } from "lucide-react";
import type { FileUIPart } from "ai";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { PdfThumbnail } from "@/components/pdf-thumbnail";
import { EmergencyHotlines } from "@/components/emergency-hotlines";
import { FollowUpOptions } from "@/components/follow-up-options";
import { LocationRequest } from "@/components/location-request";
import { NearbyHealthcare } from "@/components/nearby-healthcare";
import type { HealthcareFacility } from "@/ai/tools";

function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
    return message.parts
        .filter((part) => part.type === "text" || part.type === "text-delta")
        .map((part) => part.text ?? "")
        .join("");
}

function formatMessageTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type MessageTimestampProps = {
    date: Date;
    align?: "left" | "right";
    animate?: boolean;
};

function MessageTimestamp({ date, align = "left", animate = false }: MessageTimestampProps) {
    if (animate) {
        return (
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                    "text-xs text-muted-foreground",
                    align === "right" && "ml-auto"
                )}
            >
                {formatMessageTime(date)}
            </motion.span>
        );
    }

    return (
        <span
            className={cn(
                "text-xs text-muted-foreground",
                align === "right" && "ml-auto"
            )}
        >
            {formatMessageTime(date)}
        </span>
    );
}

function getMessageFiles(message: { parts: Array<{ type: string; url?: string; mediaType?: string; filename?: string }> }): FileUIPart[] {
    return message.parts
        .filter((part): part is FileUIPart => part.type === "file")
        .map((part) => ({
            type: "file" as const,
            url: part.url ?? "",
            mediaType: part.mediaType,
            filename: part.filename,
        }));
}

type ChatAttachmentProps = {
    data: FileUIPart & { id: string };
    className?: string;
};

function ChatAttachment({ data, className }: ChatAttachmentProps) {
    const attachments = usePromptInputAttachments();
    const filename = data.filename || "";

    const isPdf = data.mediaType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    const isImage = data.mediaType?.startsWith("image/") && data.url;

    const attachmentLabel = filename || (isImage ? "Image" : isPdf ? "PDF" : "Attachment");

    function handleClick() {
        if (isPdf && data.url) {
            window.open(data.url, "_blank");
        }
    }

    function getIcon() {
        if (isImage) {
            return (
                <img
                    alt={filename || "attachment"}
                    className="size-5 object-cover"
                    height={20}
                    src={data.url}
                    width={20}
                />
            );
        }
        if (isPdf && data.url) {
            return <PdfThumbnail url={data.url} width={20} height={20} className="size-5 rounded-sm" />;
        }
        return <PaperclipIcon className="size-3" />;
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={cn(
                "group relative flex h-8 select-none items-center gap-1.5 rounded-md border border-border px-1.5 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
                isPdf && "cursor-pointer",
                className
            )}
            onClick={handleClick}
        >
            <div className="relative size-5 shrink-0">
                <div className="absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-background transition-opacity group-hover:opacity-0">
                    {getIcon()}
                </div>
                <Button
                    aria-label="Remove attachment"
                    className="absolute inset-0 size-5 cursor-pointer rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-2.5"
                    onClick={(e) => {
                        e.stopPropagation();
                        attachments.remove(data.id);
                    }}
                    type="button"
                    variant="ghost"
                >
                    <XIcon />
                    <span className="sr-only">Remove</span>
                </Button>
            </div>
            <span className="flex-1 truncate">{attachmentLabel}</span>
        </motion.div>
    );
}

function ChatAttachments({ className }: { className?: string }) {
    const attachments = usePromptInputAttachments();

    if (!attachments.files.length) {
        return null;
    }

    return (
        <div className={cn("flex w-full flex-wrap items-start justify-start gap-2", className)}>
            <AnimatePresence mode="popLayout">
                {attachments.files.map((file) => (
                    <ChatAttachment key={file.id} data={file} />
                ))}
            </AnimatePresence>
        </div>
    );
}

type SentMessageAttachmentProps = {
    data: FileUIPart;
    className?: string;
};

function SentMessageAttachment({ data, className }: SentMessageAttachmentProps) {
    const filename = data.filename || "";
    const isPdf = data.mediaType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    const isImage = data.mediaType?.startsWith("image/") && data.url;

    function handleClick() {
        if (data.url) {
            window.open(data.url, "_blank");
        }
    }

    return (
        <div
            className={cn(
                "group relative size-24 cursor-pointer border border-border overflow-hidden rounded-lg",
                className
            )}
            onClick={handleClick}
        >
            {isImage ? (
                <img
                    alt={filename || "attachment"}
                    className="size-full object-cover"
                    src={data.url}
                />
            ) : isPdf && data.url ? (
                <div className="flex size-full items-center justify-center bg-muted">
                    <PdfThumbnail url={data.url} width={96} height={96} className="size-full rounded-lg" />
                </div>
            ) : (
                <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                    <PaperclipIcon className="size-6" />
                </div>
            )}
        </div>
    );
}

function createChatTransport(chatPublicId?: string) {
    return new DefaultChatTransport({
        api: "/api/chat",
        body: chatPublicId ? { chatPublicId } : undefined,
    });
}

function AddAttachmentButton() {
    const attachments = usePromptInputAttachments();

    return (
        <PromptInputButton
            onClick={() => attachments.openFileDialog()}
            aria-label="Add attachment"
        >
            <PlusIcon className="size-4" />
            <span className="text-sm">Attachment</span>
        </PromptInputButton>
    );
}

type SubmitButtonProps = {
    input: string;
    status: "streaming" | "submitted" | "ready" | "error";
};

function SubmitButton({ input, status }: SubmitButtonProps) {
    const attachments = usePromptInputAttachments();
    const hasContent = input.trim() || attachments.files.length > 0;

    return (
        <PromptInputSubmit
            status={status}
            disabled={!hasContent || status === "streaming"}
        />
    );
}

type ChatProps = {
    chatPublicId?: string;
    initialMessages?: unknown[];
};

const DEFAULT_ASSISTANT_MESSAGE = {
    id: "initial-assistant-message",
    role: "assistant" as const,
    parts: [{ type: "text" as const, text: "Hi! I'm Carely, your primary care assistant. What brings you in today?" }],
    // No timestamp to avoid SSR hydration mismatch - timestamp display is skipped for this message
};

type EmergencyHotlineType =
    | "general"
    | "poison"
    | "suicide"
    | "domesticViolence"
    | "sexualAssault"
    | "childAbuse"
    | "substanceAbuse"
    | "veterans"
    | "lgbtqYouth"
    | "eatingDisorders";

type EmergencyHotlineToolResult = {
    types: EmergencyHotlineType[];
};

type FollowUpOption = "calendar" | "email_now" | "email_scheduled";

type ScheduleFollowUpInput = {
    message?: string;
    reason: string;
    recommendedDate: string;
    additionalNotes?: string;
};

type FollowUpToolState = {
    selectedOption?: FollowUpOption;
    isProcessing: boolean;
    isComplete: boolean;
};

type LocationToolState = {
    status: "idle" | "requesting" | "granted" | "denied";
    coordinates?: { latitude: number; longitude: number; city?: string };
    error?: string;
};

type GetUserLocationInput = {
    reason: string;
};

type FindNearbyHealthcareOutput = {
    success: boolean;
    facilities: HealthcareFacility[];
    searchContext?: string;
    searchQuery?: string;
    error?: string;
};

type ToolMessagePart = {
    type: string;
    state?: "input-available" | "output-available" | "partial-call" | "call" | "streaming";
    output?: unknown;
    input?: unknown;
    toolCallId?: string;
    toolName?: string;
};

function renderEmergencyHotlineToolPart(part: ToolMessagePart, partIndex: number) {
    if (part.type !== "tool-displayEmergencyHotlines") {
        return null;
    }

    // When output is available, render the emergency hotlines
    if (part.state === "output-available" && part.output) {
        const output = part.output as EmergencyHotlineToolResult | undefined;
        if (output?.types && output.types.length > 0) {
            return (
                <div key={partIndex} className="mt-1.5">
                    <EmergencyHotlines types={output.types} />
                </div>
            );
        }
    }

    // Show loading state while tool is executing
    return (
        <div key={partIndex} className="mt-3 text-sm text-muted-foreground">
            Loading emergency resources...
        </div>
    );
}

export function Chat({ chatPublicId, initialMessages = [] }: ChatProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [transport] = useState(() => createChatTransport(chatPublicId));
    const [followUpStates, setFollowUpStates] = useState<Record<string, FollowUpToolState>>({});
    const [locationStates, setLocationStates] = useState<Record<string, LocationToolState>>({});

    // Use the default assistant message if no initial messages are provided
    const messagesForChat = initialMessages.length > 0 ? initialMessages : [DEFAULT_ASSISTANT_MESSAGE];

    const { messages, sendMessage, status, addToolResult } = useChat({
        transport,
        // @ts-expect-error - messages prop exists but TypeScript can't infer it from union type
        messages: messagesForChat,
        // Allow multiple round trips for tool calls (e.g., scheduleFollowUp -> sendFollowUpEmailNow)
        maxSteps: 4,
    });

    // Track if we need to continue the conversation after adding a tool result
    const [pendingContinuation, setPendingContinuation] = useState<{ text: string; hidden?: boolean } | null>(null);

    // Ref to track which location tool calls have been handled (prevents duplicate processing)
    const handledLocationToolCallsRef = useRef<Set<string>>(new Set());

    // Effect to trigger continuation after tool result is added to messages
    useEffect(() => {
        if (pendingContinuation && status === "ready") {
            console.log("[Continuation] Triggering via sendMessage:", pendingContinuation.text, "hidden:", pendingContinuation.hidden);
            const { text, hidden } = pendingContinuation;
            setPendingContinuation(null);
            sendMessage({
                text,
                metadata: createMessageMetadata({ hidden })
            }).catch((err) => {
                console.error("[Continuation] Failed:", err);
            });
        }
    }, [pendingContinuation, status, sendMessage]);

    // Get the user-facing message for the selected follow-up option
    function getFollowUpMessage(option: FollowUpOption): string {
        switch (option) {
            case "calendar":
                return "I'll add this to my calendar myself.";
            case "email_now":
                return "Please send me an email with the follow-up details now.";
            case "email_scheduled":
                return "Send me a reminder email when it's time for the follow-up.";
        }
    }

    const handleFollowUpSelect = useCallback(
        (toolCallId: string, option: FollowUpOption, inputData: ScheduleFollowUpInput) => {
            console.log("[FollowUp] User selected option:", option, "for toolCallId:", toolCallId);

            // Update state to show processing
            setFollowUpStates((prev) => ({
                ...prev,
                [toolCallId]: { selectedOption: option, isProcessing: true, isComplete: false },
            }));

            // Prepare the output based on the option selected
            const output = {
                selectedOption: option,
                reason: inputData.reason,
                recommendedDate: inputData.recommendedDate,
                additionalNotes: inputData.additionalNotes,
            };

            console.log("[FollowUp] Calling addToolResult with output:", output);

            // Add the tool result
            addToolResult({
                tool: "scheduleFollowUp",
                toolCallId,
                output,
            });

            // Set the continuation message based on what the user selected
            const continuationMessage = getFollowUpMessage(option);
            console.log("[FollowUp] addToolResult called, setting continuation message:", continuationMessage);
            setPendingContinuation({ text: continuationMessage });

            // Mark as complete after a delay
            setTimeout(() => {
                setFollowUpStates((prev) => ({
                    ...prev,
                    [toolCallId]: { ...prev[toolCallId], isProcessing: false, isComplete: true },
                }));
            }, 2000);
        },
        [addToolResult]
    );

    const handleLocationGranted = useCallback(
        (toolCallId: string, coords: { latitude: number; longitude: number; city?: string }) => {
            // Guard: check if already handled using ref (works even with stale closures)
            if (handledLocationToolCallsRef.current.has(toolCallId)) {
                console.log("[Location] Already handled toolCallId (ref guard):", toolCallId);
                return;
            }

            // Mark as handled immediately to prevent any race conditions
            handledLocationToolCallsRef.current.add(toolCallId);

            console.log("[Location] User granted location:", coords, "for toolCallId:", toolCallId);

            // Update state
            setLocationStates((prev) => ({
                ...prev,
                [toolCallId]: { status: "granted", coordinates: coords },
            }));

            // Add the tool result with the coordinates
            addToolResult({
                tool: "getUserLocation",
                toolCallId,
                output: {
                    success: true,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    city: coords.city,
                },
            });

            // Trigger continuation so the AI can call findNearbyHealthcare (hidden from UI)
            const locationMessage = coords.city
                ? `I'm located in ${coords.city}.`
                : "Here's my location.";
            console.log("[Location] Setting hidden continuation:", locationMessage);
            setPendingContinuation({ text: locationMessage, hidden: true });
        },
        [addToolResult]
    );

    const handleLocationDenied = useCallback(
        (toolCallId: string, error: string) => {
            // Guard: check if already handled using ref (works even with stale closures)
            if (handledLocationToolCallsRef.current.has(toolCallId)) {
                console.log("[Location] Already handled toolCallId (ref guard):", toolCallId);
                return;
            }

            // Mark as handled immediately to prevent any race conditions
            handledLocationToolCallsRef.current.add(toolCallId);

            console.log("[Location] User denied location:", error, "for toolCallId:", toolCallId);

            // Update state
            setLocationStates((prev) => ({
                ...prev,
                [toolCallId]: { status: "denied", error },
            }));

            // Add the tool result with the error
            addToolResult({
                tool: "getUserLocation",
                toolCallId,
                output: {
                    success: false,
                    error,
                },
            });

            // Trigger continuation so the AI can ask for city/zip instead (hidden from UI)
            console.log("[Location] Setting hidden continuation for denied location");
            setPendingContinuation({ text: "I'd prefer not to share my exact location.", hidden: true });
        },
        [addToolResult]
    );

    function renderFollowUpToolPart(part: ToolMessagePart, partIndex: number) {
        if (part.type !== "tool-scheduleFollowUp") {
            return null;
        }

        const toolCallId = part.toolCallId;
        if (!toolCallId) return null;

        const input = part.input as ScheduleFollowUpInput | undefined;
        if (!input) return null;

        const toolState = followUpStates[toolCallId];

        // If output is available, the tool has been responded to
        if (part.state === "output-available") {
            // Try to get the selected option from the output if not in local state
            const output = part.output as { selectedOption?: FollowUpOption | "skipped"; skippedByUser?: boolean } | undefined;
            const selectedOption = toolState?.selectedOption ?? output?.selectedOption;

            // If user skipped by sending another message, don't show the UI at all
            if (output?.skippedByUser || selectedOption === "skipped") {
                return null;
            }

            return (
                <div key={partIndex} className="mt-1.5">
                    <FollowUpOptions
                        message={input.message}
                        reason={input.reason}
                        recommendedDate={input.recommendedDate}
                        additionalNotes={input.additionalNotes}
                        onSelect={() => { }}
                        selectedOption={selectedOption as FollowUpOption | undefined}
                        isProcessing={false}
                        isComplete={true}
                    />
                </div>
            );
        }

        // Tool is waiting for user input (call or input-available state)
        if (part.state === "call" || part.state === "input-available") {
            return (
                <div key={partIndex} className="mt-1.5">
                    <FollowUpOptions
                        message={input.message}
                        reason={input.reason}
                        recommendedDate={input.recommendedDate}
                        additionalNotes={input.additionalNotes}
                        onSelect={(option) => handleFollowUpSelect(toolCallId, option, input)}
                        selectedOption={toolState?.selectedOption}
                        isProcessing={toolState?.isProcessing}
                        isComplete={toolState?.isComplete}
                    />
                </div>
            );
        }

        // Show loading state for partial-call
        if (part.state === "partial-call") {
            return (
                <div key={partIndex} className="mt-3 text-sm text-muted-foreground">
                    Loading follow-up options...
                </div>
            );
        }

        return null;
    }

    function renderLocationToolPart(part: ToolMessagePart, partIndex: number) {
        if (part.type !== "tool-getUserLocation") {
            return null;
        }

        const toolCallId = part.toolCallId;
        if (!toolCallId) return null;

        const input = part.input as GetUserLocationInput | undefined;
        if (!input) return null;

        const toolState = locationStates[toolCallId];

        // If output is available, the tool has been responded to
        if (part.state === "output-available") {
            const output = part.output as { success: boolean; latitude?: number; longitude?: number; city?: string; error?: string } | undefined;

            if (output?.success) {
                return (
                    <div key={partIndex} className="mt-1.5">
                        <LocationRequest
                            reason={input.reason}
                            onLocationGranted={() => { }}
                            onLocationDenied={() => { }}
                            status="granted"
                        />
                    </div>
                );
            } else {
                return (
                    <div key={partIndex} className="mt-1.5">
                        <LocationRequest
                            reason={input.reason}
                            onLocationGranted={() => { }}
                            onLocationDenied={() => { }}
                            status="denied"
                        />
                    </div>
                );
            }
        }

        // Tool is waiting for user input
        if (part.state === "call" || part.state === "input-available") {
            return (
                <div key={partIndex} className="mt-1.5">
                    <LocationRequest
                        reason={input.reason}
                        onLocationGranted={(coords) => handleLocationGranted(toolCallId, coords)}
                        onLocationDenied={(error) => handleLocationDenied(toolCallId, error)}
                        status={toolState?.status || "idle"}
                    />
                </div>
            );
        }

        // Show loading state for partial-call
        if (part.state === "partial-call") {
            return (
                <div key={partIndex} className="mt-3 text-sm text-muted-foreground">
                    Preparing location request...
                </div>
            );
        }

        return null;
    }

    function renderHealthcareToolPart(part: ToolMessagePart, partIndex: number) {
        if (part.type !== "tool-findNearbyHealthcare") {
            return null;
        }

        // When output is available, render the healthcare facilities
        if (part.state === "output-available" && part.output) {
            const output = part.output as FindNearbyHealthcareOutput | undefined;
            if (output) {
                return (
                    <div key={partIndex} className="mt-1.5">
                        <NearbyHealthcare
                            facilities={output.facilities || []}
                            searchContext={output.searchContext}
                            isLoading={false}
                        />
                    </div>
                );
            }
        }

        // Show loading state while tool is executing
        if (part.state === "call" || part.state === "partial-call" || part.state === "streaming") {
            return (
                <div key={partIndex} className="mt-1.5">
                    <NearbyHealthcare
                        facilities={[]}
                        isLoading={true}
                    />
                </div>
            );
        }

        return null;
    }

    function getMessageTimestamp(message: { metadata?: unknown }): Date {
        const metadata = message.metadata as ChatMessageMetadata | undefined;
        if (metadata?.timestamp) {
            return new Date(metadata.timestamp);
        }
        return new Date();
    }

    // Find any pending scheduleFollowUp tool calls that haven't been resolved
    function findPendingFollowUpToolCalls(): Array<{ toolCallId: string; input: ScheduleFollowUpInput }> {
        const pending: Array<{ toolCallId: string; input: ScheduleFollowUpInput }> = [];

        for (const message of messages) {
            if (message.role !== "assistant") continue;

            for (const part of message.parts) {
                const toolPart = part as ToolMessagePart;
                if (
                    toolPart.type === "tool-scheduleFollowUp" &&
                    toolPart.toolCallId &&
                    (toolPart.state === "call" || toolPart.state === "input-available") &&
                    !followUpStates[toolPart.toolCallId]?.selectedOption
                ) {
                    pending.push({
                        toolCallId: toolPart.toolCallId,
                        input: toolPart.input as ScheduleFollowUpInput,
                    });
                }
            }
        }

        return pending;
    }

    // Find any pending getUserLocation tool calls that haven't been resolved
    function findPendingLocationToolCalls(): Array<{ toolCallId: string; input: GetUserLocationInput }> {
        const pending: Array<{ toolCallId: string; input: GetUserLocationInput }> = [];

        for (const message of messages) {
            if (message.role !== "assistant") continue;

            for (const part of message.parts) {
                const toolPart = part as ToolMessagePart;
                if (
                    toolPart.type === "tool-getUserLocation" &&
                    toolPart.toolCallId &&
                    (toolPart.state === "call" || toolPart.state === "input-available")
                ) {
                    const toolCallId = toolPart.toolCallId;
                    const currentStatus = locationStates[toolCallId]?.status;
                    // Only include if status is undefined or idle (not yet responded)
                    if (!currentStatus || currentStatus === "idle") {
                        pending.push({
                            toolCallId,
                            input: toolPart.input as GetUserLocationInput,
                        });
                    }
                }
            }
        }

        return pending;
    }

    function handleSubmit(message: PromptInputMessage) {
        if (!message.text.trim() && message.files.length === 0) return;

        // Auto-resolve any pending follow-up tool calls before sending new message
        const pendingFollowUpCalls = findPendingFollowUpToolCalls();
        for (const { toolCallId, input } of pendingFollowUpCalls) {
            addToolResult({
                tool: "scheduleFollowUp",
                toolCallId,
                output: {
                    selectedOption: "skipped",
                    reason: input.reason,
                    recommendedDate: input.recommendedDate,
                    additionalNotes: input.additionalNotes,
                    skippedByUser: true,
                },
            });
        }

        // Auto-resolve any pending location tool calls before sending new message
        const pendingLocationCalls = findPendingLocationToolCalls();
        for (const { toolCallId } of pendingLocationCalls) {
            addToolResult({
                tool: "getUserLocation",
                toolCallId,
                output: {
                    success: false,
                    error: "User continued conversation without sharing location",
                    skippedByUser: true,
                },
            });
        }

        sendMessage({
            text: message.text,
            files: message.files,
            metadata: createMessageMetadata(),
        });
        setInput("");
    }

    const handleAudioRecorded = useCallback(async (audioBlob: Blob): Promise<string> => {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Transcription failed");
        }

        const data = await response.json();
        return data.text;
    }, []);

    const handleTranscriptionChange = useCallback((text: string) => {
        setInput((prev) => {
            const newText = prev ? `${prev} ${text}` : text;
            return newText;
        });
    }, []);

    const handleRecordingComplete = useCallback(() => {
        textareaRef.current?.focus();
    }, []);

    return (
        <div className="flex flex-1 min-h-0 w-full flex-col">
            <Conversation className="relative overflow-x-hidden flex-1 min-h-0">
                {/* Top fade gradient */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-background to-transparent" />

                <ScrollArea className="h-full -mr-4">
                    <ConversationContent className="pr-4 pt-8 pb-8">
                        {messages.map((message, index) => {
                            // Skip hidden messages (e.g., system continuations for tool flows)
                            const metadata = message.metadata as ChatMessageMetadata | undefined;
                            if (metadata?.hidden) {
                                return null;
                            }

                            const files = getMessageFiles(message);
                            const text = getMessageText(message);
                            const isLastMessage = index === messages.length - 1;
                            const isAssistantThinking =
                                message.role === "assistant" &&
                                isLastMessage &&
                                !text &&
                                (status === "streaming" || status === "submitted");
                            const isAssistantStreaming =
                                message.role === "assistant" &&
                                isLastMessage &&
                                (status === "streaming" || status === "submitted");

                            // Check if this message has any visible tool UI
                            const hasVisibleToolUI = message.parts.some((part) => {
                                const toolPart = part as ToolMessagePart;
                                return (
                                    toolPart.type === "tool-displayEmergencyHotlines" ||
                                    toolPart.type === "tool-scheduleFollowUp" ||
                                    toolPart.type === "tool-getUserLocation" ||
                                    toolPart.type === "tool-findNearbyHealthcare"
                                );
                            });

                            // Skip empty completed messages (no text, no files, no visible tool UI)
                            const isEmptyCompletedMessage =
                                !text &&
                                files.length === 0 &&
                                !hasVisibleToolUI &&
                                !isAssistantStreaming;

                            if (isEmptyCompletedMessage) {
                                return null;
                            }
                            // Skip timestamp for the initial greeting message to avoid hydration issues
                            const isInitialGreeting = message.id === "initial-assistant-message";
                            const showTimestamp =
                                !isInitialGreeting && (message.role === "user" || !isAssistantStreaming);
                            return (
                                <Message key={message.id} from={message.role}>
                                    {message.role === "user" && files.length > 0 && (
                                        <MessageAttachments>
                                            {files.map((file, fileIndex) => (
                                                <SentMessageAttachment key={fileIndex} data={file} />
                                            ))}
                                        </MessageAttachments>
                                    )}
                                    {isAssistantThinking ? (
                                        <MessageThinking />
                                    ) : text ? (
                                        <MessageContent>
                                            {message.role === "assistant" ? (
                                                <MessageResponse>{text}</MessageResponse>
                                            ) : (
                                                text
                                            )}
                                        </MessageContent>
                                    ) : null}
                                    {/* Render tool UI components */}
                                    {message.parts.map((part, partIndex) => {
                                        const toolPart = part as ToolMessagePart;
                                        // For follow-up and location tools, render even while streaming since they need user input
                                        if (toolPart.type === "tool-scheduleFollowUp") {
                                            return renderFollowUpToolPart(toolPart, partIndex);
                                        }
                                        if (toolPart.type === "tool-getUserLocation") {
                                            return renderLocationToolPart(toolPart, partIndex);
                                        }
                                        // For healthcare results, render during streaming to show loading state
                                        if (toolPart.type === "tool-findNearbyHealthcare") {
                                            return renderHealthcareToolPart(toolPart, partIndex);
                                        }
                                        // For other tools, only render after streaming is complete
                                        if (!isAssistantStreaming) {
                                            return renderEmergencyHotlineToolPart(toolPart, partIndex);
                                        }
                                        return null;
                                    })}
                                    {showTimestamp && (
                                        <MessageTimestamp
                                            date={getMessageTimestamp(message)}
                                            align={message.role === "user" ? "right" : "left"}
                                            animate={message.role === "assistant"}
                                        />
                                    )}
                                </Message>
                            );
                        })}
                        {status === "submitted" && messages[messages.length - 1]?.role === "user" && (
                            <Message from="assistant">
                                <MessageThinking />
                            </Message>
                        )}
                    </ConversationContent>
                </ScrollArea>

                {/* Bottom fade gradient */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-background to-transparent" />

                <ConversationScrollButton />
            </Conversation>

            <div className="py-4 shrink-0">
                <PromptInput
                    onSubmit={(message) => handleSubmit(message)}
                    accept="image/*,application/pdf,.txt,.md,.doc,.docx"
                    multiple
                >
                    <ChatAttachments className="pl-2 pt-2 pr-2 pb-0" />
                    <PromptInputTextarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        autoFocus
                    />
                    <PromptInputFooter>
                        <PromptInputTools>
                            <AddAttachmentButton />
                        </PromptInputTools>
                        <PromptInputTools>
                            <SpeechInput
                                onTranscriptionChange={handleTranscriptionChange}
                                onAudioRecorded={handleAudioRecorded}
                                onRecordingComplete={handleRecordingComplete}
                                size="icon-sm"
                                variant="ghost"
                            />
                            <SubmitButton input={input} status={status} />
                        </PromptInputTools>
                    </PromptInputFooter>
                </PromptInput>
            </div>
        </div>
    );
}
