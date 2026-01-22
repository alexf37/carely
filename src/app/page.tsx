import { redirect } from "next/navigation";
import { getSession } from "@/server/better-auth/server";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { LoginButton, BeginAppointmentButton, UserMenu } from "./landing-actions";

export default async function Home() {
  const session = await getSession();
  const user = session?.user as { hasCompletedIntake?: boolean; name?: string } | undefined;

  if (user && !user.hasCompletedIntake) {
    redirect("/intake");
  }

  return (
    <main className="flex flex-col min-h-screen w-full relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Top left - pink/magenta */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-[#c679c4]/30 blur-[128px] orb-pulse" />
        {/* Top right - blue */}
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-[#0358f7]/25 blur-[128px] orb-pulse orb-pulse-delay-1" />
        {/* Bottom left - yellow/gold */}
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-[#ffb005]/20 blur-[128px] orb-pulse orb-pulse-delay-2" />
        {/* Bottom right - red/orange */}
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-[#fa3d1d]/20 blur-[128px] orb-pulse orb-pulse-delay-3" />
      </div>

      {/* Header */}
      <header className="relative flex items-center py-4 px-4 md:px-8 justify-between w-full shrink-0 max-w-screen-xl mx-auto">
        <h1 className="text-2xl font-light tracking-tight chroma-text-hover">Carely</h1>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {session && user?.name ? <UserMenu userName={user.name} /> : null}
        </div>
      </header>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          {/* Headline */}
          <h2 className="text-5xl md:text-7xl font-light tracking-wide pb-4 chroma-text chroma-text-animate">
            Welcome to Carely
          </h2>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-lg mx-auto">
            Get guidance on your symptoms, understand your health better, and know when to seek professional care.
          </p>

          {/* CTA */}
          <div className="pt-4">
            {session ? (
              <BeginAppointmentButton />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 px-4 text-center text-sm text-muted-foreground">
        <p>
          Carely provides health information, not medical advice.{" "}
          <span className="hidden sm:inline">Always consult a healthcare professional for diagnosis and treatment.</span>
        </p>
      </footer>
    </main>
  );
}
