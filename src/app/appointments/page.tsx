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
import { Calendar, Trash2 } from "lucide-react";
import { IconPlus } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<{ publicId: string; description: string | null } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

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

  const deleteAppointment = api.appointment.delete.useMutation({
    onMutate: async ({ publicId }) => {
      // Close dialog immediately
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.appointment.list.cancel();

      // Snapshot the previous value
      const previousData = utils.appointment.list.getInfiniteData({});

      // Optimistically remove the appointment from the cache
      utils.appointment.list.setInfiniteData({}, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.publicId !== publicId),
          })),
        };
      });

      // Return context with the previous data for rollback
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        utils.appointment.list.setInfiniteData({}, context.previousData);
      }
    },
    onSettled: () => {
      // Sync with server after mutation completes (success or error)
      void utils.appointment.list.invalidate();
    },
  });

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

  function handleDeleteClick(e: React.MouseEvent, visit: { publicId: string; description: string | null }) {
    e.preventDefault();
    e.stopPropagation();
    setAppointmentToDelete(visit);
    setDeleteDialogOpen(true);
  }

  function handleConfirmDelete() {
    if (appointmentToDelete) {
      deleteAppointment.mutate({ publicId: appointmentToDelete.publicId });
    }
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

        <AnimatePresence mode="popLayout">
          {groupedVisits.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
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
            </motion.div>
          ) : (
            <motion.div key="appointments-list" className="space-y-8">
              {groupedVisits.map((group) => (
                <div key={group.label}>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    {group.label}
                  </h3>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {group.visits.map((visit) => (
                        <motion.div
                          key={visit.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                          transition={{ duration: 0.2 }}
                        >
                          <Link
                            href={`/appointment/${visit.publicId}`}
                            className="block"
                          >
                            <Card
                              size="sm"
                              className="hover:bg-accent/50 transition-colors cursor-pointer group"
                            >
                              <CardHeader className="flex flex-row items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <CardTitle>{visit.description ?? "Appointment"}</CardTitle>
                                  <CardDescription>
                                    {formatVisitDate(visit.createdAt)}
                                  </CardDescription>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={(e) => handleDeleteClick(e, visit)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </CardHeader>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel */}
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {isFetchingNextPage && <Spinner className="size-6" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{appointmentToDelete?.description ?? "Appointment"}&rdquo; and all its conversation history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAppointment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteAppointment.isPending}
              className="bg-destructive text-primary-foreground hover:bg-destructive/90"
            >
              {deleteAppointment.isPending ? <Spinner className="size-4" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
