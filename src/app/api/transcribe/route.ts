import { experimental_transcribe as transcribe } from "ai";
import { getSession } from "@/server/better-auth/server";
import { groq } from "@ai-sdk/groq";

const EMPTY_RESPONSE = Response.json({ text: "" });

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

function containsLetters(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

function matchesHallucinationPattern(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[.\[\]()!?,]/g, "")
    .trim();

  if (SILENCE_HALLUCINATIONS.includes(normalized)) {
    return true;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    if (normalized.startsWith("thank") || normalized.startsWith("bye")) {
      return true;
    }
  }

  return false;
}

function isAudioSilent(buffer: Buffer): boolean {
  const headerOffset = 100;
  if (buffer.length < headerOffset + 1000) {
    return true;
  }

  const samples: number[] = [];
  const sampleStep = Math.max(1, Math.floor((buffer.length - headerOffset) / 5000));

  for (let i = headerOffset; i < buffer.length; i += sampleStep) {
    const sample = buffer[i];
    if (sample !== undefined) {
      samples.push(sample);
    }
  }

  if (samples.length === 0) return true;

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

  const variance =
    samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    samples.length;
  const stdDev = Math.sqrt(variance);

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

    const audioIsSilent = isAudioSilent(audioBuffer);

    const { text } = await transcribe({
      model: groq.transcription("whisper-large-v3-turbo"),
      audio: audioBuffer,
    });

    if (!text || !containsLetters(text)) {
      return EMPTY_RESPONSE;
    }

    if (audioIsSilent && matchesHallucinationPattern(text)) {
      return EMPTY_RESPONSE;
    }

    return Response.json({ text: text.trim() });
  } catch {
    return EMPTY_RESPONSE;
  }
}
