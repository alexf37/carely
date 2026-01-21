"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";

export { UserMenu } from "@/components/user-menu";

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  function handleLogin() {
    setIsLoading(true);
    authClient.signIn.social({ provider: "google" }).catch(() => {
      setIsLoading(false);
    });
  }

  return (
    <div className="space-y-3">
      <Button size="lg" onClick={handleLogin} disabled={isLoading} className="min-w-[160px]">
        {isLoading ? (
          <span className="relative">
            <Spinner className="absolute inset-0 m-auto" />
            <span className="invisible">Get started</span>
          </span>
        ) : (
          "Get started"
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        You&apos;re not signed in.{" "}
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
          className="underline hover:text-foreground transition-colors disabled:opacity-50"
        >
          Sign in to proceed.
        </button>
      </p>
    </div>
  );
}

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  function handleLogout() {
    setIsLoading(true);
    authClient
      .signOut()
      .then(() => {
        router.refresh();
      })
      .catch(() => {
        setIsLoading(false);
      });
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? (
        <span className="relative">
          <Spinner className="absolute inset-0 m-auto" />
          <span className="invisible">Sign out</span>
        </span>
      ) : (
        "Sign out"
      )}
    </Button>
  );
}

export function BeginAppointmentButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const createAppointment = api.appointment.create.useMutation({
    onSuccess: (data) => {
      router.push(`/appointment/${data.publicId}`);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  function handleBegin() {
    setIsLoading(true);
    createAppointment.mutate();
  }

  return (
    <div className="space-y-3">
      <Button size="lg" onClick={handleBegin} disabled={isLoading} className="min-w-[200px]">
        {isLoading ? (
          <span className="relative">
            <Spinner className="absolute inset-0 m-auto" />
            <span className="invisible">Start new appointment</span>
          </span>
        ) : (
          "Start new appointment"
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        Describe your symptoms and get guidance
      </p>
    </div>
  );
}
