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
import { useCallback, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PaperclipIcon, PlusIcon, XIcon } from "lucide-react";
import type { FileUIPart } from "ai";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { PdfThumbnail } from "@/components/pdf-thumbnail";

function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
    return message.parts
        .filter((part) => part.type === "text" || part.type === "text-delta")
        .map((part) => part.text ?? "")
        .join("");
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

const chatTransport = new DefaultChatTransport({
    api: "/api/chat",
});

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

export function Chat() {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { messages, sendMessage, status } = useChat({
        transport: chatTransport,
    });

    function handleSubmit(message: PromptInputMessage) {
        if (!message.text.trim() && message.files.length === 0) return;
        sendMessage({
            text: message.text,
            files: message.files,
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
                        {messages.map((message) => {
                            const files = getMessageFiles(message);
                            const text = getMessageText(message);

                            return (
                                <Message key={message.id} from={message.role}>
                                    {message.role === "user" && files.length > 0 && (
                                        <MessageAttachments>
                                            {files.map((file, index) => (
                                                <SentMessageAttachment key={index} data={file} />
                                            ))}
                                        </MessageAttachments>
                                    )}
                                    {text && (
                                        <MessageContent>
                                            {message.role === "assistant" ? (
                                                <MessageResponse>{text}</MessageResponse>
                                            ) : (
                                                text
                                            )}
                                        </MessageContent>
                                    )}
                                </Message>
                            );
                        })}
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
