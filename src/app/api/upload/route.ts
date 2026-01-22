import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
    // Extract JSON from the response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse LLM response:", text);
      return { isValid: true }; // Default to valid if parsing fails
    }

    const parsed = JSON.parse(jsonMatch[0]) as { isMedical: boolean; reason?: string };
    return { isValid: parsed.isMedical, reason: parsed.reason };
  } catch (error) {
    console.error("Failed to validate medical document:", error);
    // Default to valid if validation fails to avoid blocking legitimate uploads
    return { isValid: true };
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

  // Validate file type - only allow PDFs
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  // Validate file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File size must be less than 10MB" },
      { status: 400 }
    );
  }

  // Upload to Vercel Blob first (we need the URL for LLM validation)
  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
  });

  // Validate that the document is medical-related
  const validation = await validateMedicalDocument(blob.url);
  
  if (!validation.isValid) {
    // Delete the uploaded blob since it's not a valid medical document
    await del(blob.url);
    
    return NextResponse.json(
      { error: "Only medical documents are allowed" },
      { status: 400 }
    );
  }

  // Save document reference to database
  await db.insert(documents).values({
    userId: session.user.id,
    url: blob.url,
    filename: file.name,
  });

  return NextResponse.json({
    url: blob.url,
    filename: file.name,
  });
}
