"use client";

import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/better-auth/client";
import { Spinner } from "@/components/ui/spinner";
import { Chat } from "@/app/chat";
import Link from "next/link";

type AppointmentChatProps = {
  chatPublicId: string;
  initialMessages: unknown[];
};

export function AppointmentChat({ chatPublicId, initialMessages }: AppointmentChatProps) {
  const session = authClient.useSession();

  return (
    <main className="flex flex-col h-screen overflow-hidden w-full px-4 max-w-screen-md mx-auto">
      <div className="flex items-center py-4 justify-between w-full shrink-0">
        <Link href="/">
          <h1 className="text-3xl font-light chroma-text-hover">Carely</h1>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {session.data ? (
            <UserMenu userName={session.data.user.name ?? ""} />
          ) : (
            <Button variant="outline" size="icon" disabled>
              <Spinner />
            </Button>
          )}
        </div>
      </div>

      <Chat chatPublicId={chatPublicId} initialMessages={initialMessages} />
      <small className="text-center text-xs text-muted-foreground pb-4 -mt-1">
        Carely can make mistakes. Check important information.
      </small>
    </main>
  );
}
