import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { chats, user } from "@/server/db/schema";
import { getSession } from "@/server/better-auth/server";
import { AppointmentChat } from "./appointment-chat";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AppointmentPage({ params }: PageProps) {
  const { id: publicId } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { hasCompletedIntake: true },
  });

  if (!userData?.hasCompletedIntake) {
    redirect("/intake");
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(publicId)) {
    notFound();
  }

  const chat = await db.query.chats.findFirst({
    where: eq(chats.publicId, publicId),
  });

  if (!chat) {
    notFound();
  }

  if (chat.userId !== session.user.id) {
    notFound();
  }

  const content = chat.content as { messages?: unknown[] } | null;
  const initialMessages = content?.messages ?? [];

  return (
    <AppointmentChat 
      chatPublicId={publicId} 
      initialMessages={initialMessages} 
    />
  );
}
