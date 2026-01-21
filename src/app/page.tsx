"use client";
import { HydrateClient } from "@/trpc/server";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Link from "next/link";
import { Chat } from "./chat";
import { authClient } from "@/server/better-auth/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

function ChromaText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`chroma-text chroma-text-animate ${className ?? ""}`}>
      {children}
    </span>
  );
}

export default function Home() {
  const session = authClient.useSession();
  const [authIsLoading, setAuthIsLoading] = useState(false);

  return (
    <main className="flex flex-col h-screen overflow-hidden w-full px-4 max-w-screen-md mx-auto">
      <div className="flex items-center py-4 justify-between w-full shrink-0">
        <h1 className="text-3xl font-light">Carely</h1>
        <div className="flex items-center gap-2">
          {session.data ? (
            <Button onClick={() => {
              setAuthIsLoading(true);
              authClient.signOut().then(() => {
                setAuthIsLoading(false);
              }).catch(() => {
                setAuthIsLoading(false);
              });
            }} disabled={authIsLoading || session.isPending}>
              {authIsLoading ? (
                <span className="relative"><Spinner className="inset-0 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10" /><span className="text-transparent">Logout</span></span>
              ) : "Logout"}
            </Button>
          ) : (
            <Button onClick={() => {
              setAuthIsLoading(true);
              authClient.signIn.social({ provider: "google" }).then(() => {
                setAuthIsLoading(false);
              }).catch(() => {
                setAuthIsLoading(false);
              });
            }} disabled={authIsLoading || session.isPending}>
              {authIsLoading ? (
                <span className="relative"><Spinner className="inset-0 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10" /><span className="text-transparent">Login</span></span>
              ) : "Login"}
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
      {/* 
      <h2 className="text-4xl font-normal tracking-tight mb-6 text-center shrink-0">
        <ChromaText>{getTimeBasedGreeting()}, friend</ChromaText>
      </h2> */}

      <Chat />
      <small className="text-center text-xs text-muted-foreground pb-4 -mt-1">Carely can make mistakes. Check important information.</small>
    </main>
  );
}
