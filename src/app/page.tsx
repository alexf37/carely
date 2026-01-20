import { HydrateClient } from "@/trpc/server";
import { ModeToggle } from "@/components/ui/mode-toggle";

export default async function Home() {

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center h-screen">
        <ModeToggle />
        <h1>Hello World</h1>
      </main>
    </HydrateClient>
  );
}
