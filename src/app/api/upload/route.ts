import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { documents, user } from "@/server/db/schema";
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { addFactsToHistory } from "@/ai/tools";
import { eq } from "drizzle-orm";
import { z } from "zod";

function isPdfSignature(arrayBuffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(arrayBuffer.slice(0, 5));
  return (
    bytes.length === 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

async function deleteBlobIfExists(url: string | null) {
  if (!url) return;
  try {
    await del(url);
  } catch (error) {
    console.error("Failed to delete blob during cleanup:", error);
  }
}

async function validateMedicalDocument(url: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const result = await generateText({
      model: openai("gpt-5-nano"),
      providerOptions: {
        openai: {
          reasoningEffort: "minimal",
        },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this PDF document and determine if it is a medical document. Medical documents include:
- Lab results and test reports
- Prescriptions
- Medical records and charts
- Discharge summaries
- Imaging reports (X-ray, MRI, CT scan reports)
- Vaccination records
- Insurance/billing statements related to healthcare
- Doctor's notes or referral letters
- Health certificates

Non-medical documents include:
- Resumes/CVs
- Contracts
- Financial documents unrelated to healthcare
- Legal documents
- Marketing materials
- General correspondence
- Academic papers (unless directly related to patient care)

Respond with ONLY a JSON object in this exact format:
{"isMedical": true} or {"isMedical": false, "reason": "brief explanation"}`,
            },
            {
              type: "file",
              data: url,
              mediaType: "application/pdf" as const,
            },
          ],
        },
      ],
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse LLM response:", text);
      return { isValid: false, reason: "Invalid validation response" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { isMedical: boolean; reason?: string };
    return { isValid: parsed.isMedical, reason: parsed.reason };
  } catch (error) {
    console.error("Failed to validate medical document:", error);
    return { isValid: false, reason: "Validation error" };
  }
}

/**
 * Extract permanent medical facts from a document for a specific patient.
 * Returns an array of atomic facts about the patient's medical history.
 */
async function extractMedicalFacts(
  url: string,
  patientName: string
): Promise<string[]> {
  try {
    const result = await generateText({
      model: openai("gpt-5-mini"),
      providerOptions: {
        openai: {
          reasoningEffort: "minimal",
        },
      },
      output: Output.array({
        name: "medical_facts",
        description: "Array of atomic medical facts extracted from the document",
        element: z.string().describe("A single atomic medical fact about the patient"),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are extracting permanent medical facts about patient "${patientName}" from this medical document.

IMPORTANT GUIDELINES:
1. Look for information specifically about "${patientName}" in the document.
2. Extract ONLY permanent, long-term medical facts that should be part of the patient's medical history.

INCLUDE facts like:
- Chronic conditions (e.g., "Patient has Type 2 diabetes", "Patient has hypertension")
- Allergies (e.g., "Patient is allergic to penicillin")
- Major surgeries with dates (e.g., "Patient had appendectomy in March 2020")
- Major illness diagnoses with dates (e.g., "Patient was diagnosed with breast cancer in January 2024")
- Lifestyle factors (e.g., "Patient is a smoker", "Patient has history of alcohol use disorder")
- Family medical history (e.g., "Patient has family history of heart disease")
- Long-term medications (e.g., "Patient takes Metformin for diabetes management")
- Hospitalizations for major conditions with dates (e.g., "Patient was hospitalized for pneumonia in December 2023")
- Vaccinations (e.g., "Patient received COVID-19 vaccination in 2021")

DO NOT INCLUDE:
- Temporary symptoms (sore throat, headache, fever, cough)
- Routine visit information
- Vitals from a single visit (blood pressure reading, temperature)
- Lab values that are specific to one point in time
- Minor ailments or conditions that resolve quickly
- Administrative details (appointment times, doctor names, billing)

Each fact should be:
- A single, atomic piece of information
- Written in third person ("Patient has..." not "You have...")
- Include dates/timeframes when available in the document
- Clear and concise

If no permanent medical facts can be extracted about "${patientName}", return an empty array.`,
            },
            {
              type: "file",
              data: url,
              mediaType: "application/pdf" as const,
            },
          ],
        },
      ],
    });

    const facts = result.output ?? [];
    console.log(`[extractMedicalFacts] Extracted ${facts.length} facts for ${patientName}`);
    return facts;
  } catch (error) {
    console.error("[extractMedicalFacts] Error:", error);
    return [];
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File size must be less than 10MB" },
      { status: 400 }
    );
  }

  const fileBuffer = await file.arrayBuffer();
  if (!isPdfSignature(fileBuffer)) {
    return NextResponse.json(
      { error: "Invalid PDF file signature" },
      { status: 400 }
    );
  }

  let blobUrl: string | null = null;
  let documentCreated = false;

  try {
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });
    blobUrl = blob.url;

    const validation = await validateMedicalDocument(blob.url);

    if (!validation.isValid) {
      await deleteBlobIfExists(blobUrl);
      return NextResponse.json(
        { error: "Only medical documents are allowed" },
        { status: 400 }
      );
    }

    const [insertedDocument] = await db
      .insert(documents)
      .values({
        userId: session.user.id,
        url: blob.url,
        filename: file.name,
      })
      .returning({ id: documents.id });
    documentCreated = true;

    const patientRecord = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { name: true },
    });

    const patientName = patientRecord?.name ?? session.user.name ?? "the patient";

    const extractedFacts = await extractMedicalFacts(blob.url, patientName);

    if (extractedFacts.length > 0) {
      try {
        const historyResult = await addFactsToHistory({
          facts: extractedFacts,
          userId: session.user.id,
          documentId: insertedDocument?.id,
        });
        console.log("[upload] Added facts to history:", historyResult);
      } catch (error) {
        console.error("[upload] Failed to add facts to history:", error);
      }
    }

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
    });
  } catch (error) {
    console.error("[upload] Failed to process upload:", error);
    if (blobUrl && !documentCreated) {
      await deleteBlobIfExists(blobUrl);
    }
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
