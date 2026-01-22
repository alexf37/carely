"use client";

import { CalendarIcon, MailIcon, ClockIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type FollowUpOption = "calendar" | "email_now" | "email_scheduled";

type FollowUpOptionsProps = {
  message?: string;
  reason: string;
  recommendedDate: string;
  additionalNotes?: string;
  onSelect: (option: FollowUpOption) => void;
  selectedOption?: FollowUpOption;
  isProcessing?: boolean;
  isComplete?: boolean;
};

const OPTIONS = [
  {
    id: "calendar" as const,
    icon: CalendarIcon,
    label: "Add to calendar",
    description: "Download a calendar event file",
  },
  {
    id: "email_now" as const,
    icon: MailIcon,
    label: "Email me now",
    description: "Send details to my email right away",
  },
  {
    id: "email_scheduled" as const,
    icon: ClockIcon,
    label: "Remind me later",
    description: "Send a reminder when it's time",
  },
];

/**
 * Generate an .ics calendar file content
 */
function generateICSFile(reason: string, recommendedDate: string, additionalNotes?: string): string {
  // Parse the recommended date - try to extract a reasonable date
  const eventDate = parseRecommendedDate(recommendedDate);

  // Format dates for ICS (YYYYMMDD format for all-day events)
  const startDate = formatICSDate(eventDate);
  const endDate = formatICSDate(new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)); // Next day for all-day event

  const uid = `carely-followup-${Date.now()}@carely.app`;
  const now = formatICSDateTime(new Date());

  const description = additionalNotes
    ? `Follow-up: ${reason}\\n\\nNotes: ${additionalNotes}`
    : `Follow-up: ${reason}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carely//Follow-up Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:Carely Follow-up: ${reason}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Carely Follow-up Reminder",
    "TRIGGER:-PT9H", // Reminder at 9am on the day
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Parse a human-readable date string into a Date object
 */
function parseRecommendedDate(dateStr: string): Date {
  const now = new Date();
  const lowerStr = dateStr.toLowerCase();

  // Handle relative dates like "in 3 days", "in a week"
  const inDaysMatch = lowerStr.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1] ?? "0", 10);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const inWeeksMatch = lowerStr.match(/in (\d+) weeks?/);
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1] ?? "0", 10);
    return new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  }

  if (lowerStr.includes("next week")) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  if (lowerStr.includes("tomorrow")) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  // Try to parse as a date string
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Default to 3 days from now
  return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
}

/**
 * Format date as YYYYMMDD for ICS all-day events
 */
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Format date as ICS datetime (YYYYMMDDTHHMMSSZ)
 */
function formatICSDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Download the ICS file
 */
function downloadICSFile(reason: string, recommendedDate: string, additionalNotes?: string) {
  const icsContent = generateICSFile(reason, recommendedDate, additionalNotes);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `carely-followup-${Date.now()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FollowUpOptions({
  message,
  reason,
  recommendedDate,
  additionalNotes,
  onSelect,
  selectedOption,
  isProcessing,
  isComplete,
}: FollowUpOptionsProps) {
  function handleSelect(option: FollowUpOption) {
    // For calendar option, trigger the download before notifying parent
    if (option === "calendar") {
      downloadICSFile(reason, recommendedDate, additionalNotes);
    }
    onSelect(option);
  }

  function getCompletionMessage() {
    switch (selectedOption) {
      case "calendar":
        return "Calendar event downloaded. I'll follow up with you then.";
      case "email_now":
        return "Email sent to your inbox.";
      case "email_scheduled":
        return "Reminder scheduled for the follow-up date.";
      default:
        return "Got it!";
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-sm whitespace-pre-wrap">{message}</p>
      )}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-lg border bg-card overflow-hidden"
      >
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-medium">Follow-up Recommended</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {reason} — {recommendedDate}
          </p>
          {additionalNotes && (
            <p className="text-xs text-muted-foreground mt-1">{additionalNotes}</p>
          )}
        </div>

        <div className="p-2">
          {isComplete ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <CheckIcon className="size-4 text-green-500" />
              <span>{getCompletionMessage()}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedOption === option.id;
                const isDisabled = (selectedOption && !isSelected) || isProcessing;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !isDisabled && handleSelect(option.id)}
                    disabled={isDisabled}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all",
                      "hover:bg-muted/50 active:scale-[0.99]",
                      isSelected && "bg-primary/10 border border-primary/20",
                      isDisabled && !isSelected && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center size-8 rounded-md transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isSelected && isProcessing ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && !isProcessing && (
                      <CheckIcon className="size-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}

            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
