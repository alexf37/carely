"use client";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { authClient, type ExtendedUser } from "@/server/better-auth/client";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function Home() {
  const session = authClient.useSession();
  const router = useRouter();
  const [authIsLoading, setAuthIsLoading] = useState(false);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);

  const createAppointment = api.appointment.create.useMutation({
    onSuccess: (data) => {
      router.push(`/appointment/${data.publicId}`);
    },
    onSettled: () => {
      setIsCreatingAppointment(false);
    },
  });

  // Redirect to intake if logged in but hasn't completed intake
  useEffect(() => {
    const user = session.data?.user as ExtendedUser | undefined;
    if (user && !user.hasCompletedIntake) {
      router.push("/intake");
    }
  }, [session.data, router]);

  function handleBeginAppointment() {
    setIsCreatingAppointment(true);
    createAppointment.mutate();
  }

  // Show loading state while checking session
  if (session.isPending) {
    return (
      <main className="flex flex-col h-screen items-center justify-center w-full px-4 max-w-screen-md mx-auto">
        <Spinner className="size-8" />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen w-full px-4 max-w-screen-md mx-auto">
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
            }} disabled={authIsLoading}>
              {authIsLoading ? (
                <span className="relative"><Spinner className="inset-0 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10" /><span className="text-transparent">Logout</span></span>
              ) : "Logout"}
            </Button>
          ) : null}
          <ModeToggle />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <h1 className="text-5xl font-light tracking-tight">Welcome</h1>

        {session.data ? (
          // User is logged in and has completed intake
          <Button
            size="lg"
            onClick={handleBeginAppointment}
            disabled={isCreatingAppointment}
          >
            {isCreatingAppointment ? (
              <span className="relative">
                <Spinner className="inset-0 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10" />
                <span className="text-transparent">Begin appointment</span>
              </span>
            ) : "Begin appointment"}
          </Button>
        ) : (
          // User is not logged in
          <Button
            size="lg"
            onClick={() => {
              setAuthIsLoading(true);
              authClient.signIn.social({ provider: "google" }).then(() => {
                setAuthIsLoading(false);
              }).catch(() => {
                setAuthIsLoading(false);
              });
            }}
            disabled={authIsLoading}
          >
            {authIsLoading ? (
              <span className="relative">
                <Spinner className="inset-0 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10" />
                <span className="text-transparent">Login</span>
              </span>
            ) : "Login"}
          </Button>
        )}
      </div>
    </main>
  );
}
