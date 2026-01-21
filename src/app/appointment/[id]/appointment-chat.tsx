"use client";

import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/server/better-auth/client";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { Chat } from "@/app/chat";
import { IconLogout } from "@tabler/icons-react";

type AppointmentChatProps = {
  chatPublicId: string;
  initialMessages: unknown[];
};

export function AppointmentChat({ chatPublicId, initialMessages }: AppointmentChatProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const [authIsLoading, setAuthIsLoading] = useState(false);

  function getInitials(name: string | undefined) {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function handleLogout() {
    setAuthIsLoading(true);
    authClient.signOut().then(() => {
      router.push("/");
    }).catch(() => {
      setAuthIsLoading(false);
    });
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden w-full px-4 max-w-screen-md mx-auto">
      <div className="flex items-center py-4 justify-between w-full shrink-0">
        <h1 className="text-3xl font-light">Carely</h1>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {session.data ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" disabled={authIsLoading || session.isPending} />}>
                {getInitials(session.data.user.name)}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} disabled={authIsLoading}>
                  <IconLogout className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
