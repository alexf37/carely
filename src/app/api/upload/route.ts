import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";

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

  // Upload to Vercel Blob
  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
  });

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
