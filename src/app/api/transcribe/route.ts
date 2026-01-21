import { experimental_transcribe as transcribe } from "ai";
import { getSession } from "@/server/better-auth/server";
import { groq } from "@ai-sdk/groq";

const EMPTY_RESPONSE = Response.json({ text: "" });

// Common Whisper hallucinations when there's silence or no speech
const SILENCE_HALLUCINATIONS = [
  "thank you",
  "thanks",
  "thanks for watching",
  "thank you for watching",
  "thank you for listening",
  "thanks for listening",
  "bye",
  "goodbye",
  "see you",
  "you",
  "silence",
  "no speech",
  "no audio",
  "...",
  "…",
];

// Check if text contains at least one letter
function containsLetters(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

// Check if the transcription matches known hallucination patterns
function matchesHallucinationPattern(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[.\[\]()!?,]/g, "")
    .trim();

  // Check exact matches against known hallucinations
  if (SILENCE_HALLUCINATIONS.includes(normalized)) {
    return true;
  }

  // Check if text is very short (1-2 words) and matches common patterns
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    // Single word or two word responses that start with common hallucination words
    if (normalized.startsWith("thank") || normalized.startsWith("bye")) {
      return true;
    }
  }

  return false;
}

// Analyze audio buffer to detect if it contains actual sound or is mostly silent
function isAudioSilent(buffer: Buffer): boolean {
  // Skip potential headers (WAV header is 44 bytes, but we'll skip more to be safe)
  const headerOffset = 100;
  if (buffer.length < headerOffset + 1000) {
    // Audio too short to analyze reliably
    return true;
  }

  // Sample the audio data (skip header area)
  const samples: number[] = [];
  const sampleStep = Math.max(1, Math.floor((buffer.length - headerOffset) / 5000));

  for (let i = headerOffset; i < buffer.length; i += sampleStep) {
    const sample = buffer[i];
    if (sample !== undefined) {
      samples.push(sample);
    }
  }

  if (samples.length === 0) return true;

  // Calculate mean
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

  // Calculate standard deviation (measure of signal energy/variation)
  const variance =
    samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    samples.length;
  const stdDev = Math.sqrt(variance);

  // Silent audio typically has low standard deviation
  // Compressed formats (WebM/Opus) may have higher baseline variation
  // Actual speech usually has stdDev > 25-30
  const SILENCE_THRESHOLD = 80;

  return stdDev < SILENCE_THRESHOLD;
}

export async function POST(req: Request) {
  const session = await getSession();

  if (!session) {
    return EMPTY_RESPONSE;
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return EMPTY_RESPONSE;
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Check if audio is mostly silent before transcription
    const audioIsSilent = isAudioSilent(audioBuffer);

    const { text } = await transcribe({
      model: groq.transcription("whisper-large-v3-turbo"),
      audio: audioBuffer,
    });

    // Filter out transcriptions that don't contain actual letters
    if (!text || !containsLetters(text)) {
      return EMPTY_RESPONSE;
    }

    // Only filter hallucination patterns when audio is actually silent
    // This allows users to legitimately say "thank you" etc.
    if (audioIsSilent && matchesHallucinationPattern(text)) {
      return EMPTY_RESPONSE;
    }

    return Response.json({ text: text.trim() });
  } catch {
    return EMPTY_RESPONSE;
  }
}
