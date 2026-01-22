"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserMenu } from "@/components/user-menu";
import { authClient, type ExtendedUser } from "@/server/better-auth/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { IconPlus } from "@tabler/icons-react";

type Visit = {
  id: string;
  createdAt: Date;
  publicId: string;
  description: string | null;
};

type GroupedVisits = {
  label: string;
  visits: Visit[];
};

function groupVisitsByTimePeriod(visits: Visit[]): GroupedVisits[] {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const lastTwoDays: Visit[] = [];
  const lastWeek: Visit[] = [];
  const lastFewMonths: Visit[] = [];
  const older: Visit[] = [];

  for (const visit of visits) {
    const visitDate = new Date(visit.createdAt);

    if (visitDate >= twoDaysAgo) {
      lastTwoDays.push(visit);
    } else if (visitDate >= oneWeekAgo) {
      lastWeek.push(visit);
    } else if (visitDate >= threeMonthsAgo) {
      lastFewMonths.push(visit);
    } else {
      older.push(visit);
    }
  }

  const groups: GroupedVisits[] = [];

  if (lastTwoDays.length > 0) {
    groups.push({ label: "Last 2 days", visits: lastTwoDays });
  }
  if (lastWeek.length > 0) {
    groups.push({ label: "Last week", visits: lastWeek });
  }
  if (lastFewMonths.length > 0) {
    groups.push({ label: "Last 3 months", visits: lastFewMonths });
  }
  if (older.length > 0) {
    groups.push({ label: "Older", visits: older });
  }

  return groups;
}

function formatVisitDate(date: Date): string {
  const visitDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - visitDate.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return `Today at ${visitDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${visitDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  } else {
    return visitDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: visitDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

export default function AppointmentsPage() {
  const session = authClient.useSession();
  const router = useRouter();
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.appointment.list.useInfiniteQuery(
    {},
    {
      enabled: !!session.data,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Flatten all pages into a single array of visits
  const visits = data?.pages.flatMap((page) => page.items) ?? [];

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px",
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

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

  function handleNewAppointment() {
    const user = session.data?.user as ExtendedUser | undefined;
    if (!user?.hasCompletedIntake) {
      router.push("/intake");
      return;
    }
    setIsCreatingAppointment(true);
    createAppointment.mutate();
  }

  // Show loading state while checking session
  if (session.isPending || isLoading) {
    return (
      <main className="flex flex-col h-screen items-center justify-center w-full px-4 max-w-screen-md mx-auto">
        <Spinner className="size-8" />
      </main>
    );
  }

  // Redirect to home if not logged in
  if (!session.data) {
    router.push("/");
    return null;
  }

  // Don't render if intake not completed (will redirect)
  const currentUser = session.data.user as ExtendedUser;
  if (!currentUser.hasCompletedIntake) {
    return null;
  }

  const groupedVisits = groupVisitsByTimePeriod(visits);

  return (
    <main className="flex flex-col min-h-screen w-full px-4 max-w-screen-md mx-auto">
      <div className="flex items-center py-4 justify-between w-full shrink-0">
        <Link href="/">
          <h1 className="text-3xl font-light">Carely</h1>
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

      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium">Your Appointments</h2>
          <Button onClick={handleNewAppointment} disabled={isCreatingAppointment}>
            {isCreatingAppointment ? (
              <Spinner className="size-4" />
            ) : (
              <IconPlus className="size-4" />
            )}
            New Appointment
          </Button>
        </div>

        {groupedVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">No appointments yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Start your first appointment
            </p>
            <Button className="mt-6" onClick={handleNewAppointment} disabled={isCreatingAppointment}>
              {isCreatingAppointment ? (
                <Spinner className="size-4" />
              ) : (
                <IconPlus className="size-4" />
              )}
              New Appointment
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedVisits.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  {group.label}
                </h3>
                <div className="space-y-3">
                  {group.visits.map((visit) => (
                    <Link
                      key={visit.id}
                      href={`/appointment/${visit.publicId}`}
                      className="block"
                    >
                      <Card
                        size="sm"
                        className="hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <CardHeader>
                          <CardTitle>{visit.description ?? "Appointment"}</CardTitle>
                          <CardDescription>
                            {formatVisitDate(visit.createdAt)}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage && <Spinner className="size-6" />}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
