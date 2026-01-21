"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, type ExtendedUser } from "@/server/better-auth/client";
import { api } from "@/trpc/react";
import { IconLogout, IconCalendar, IconPlus, IconUser, IconHome } from "@tabler/icons-react";

function getInitials(name: string | undefined) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type UserMenuProps = {
  userName: string;
};

export function UserMenu({ userName }: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const session = authClient.useSession();
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

  function handleNewAppointment() {
    const user = session.data?.user as ExtendedUser | undefined;
    if (!user?.hasCompletedIntake) {
      router.push("/intake");
      return;
    }
    setIsCreatingAppointment(true);
    createAppointment.mutate();
  }

  function handleLogout() {
    setAuthIsLoading(true);
    authClient
      .signOut()
      .then(() => {
        router.push("/");
      })
      .catch(() => {
        setAuthIsLoading(false);
      });
  }

  const isOnHomePage = pathname === "/";
  const isOnAppointmentsPage = pathname === "/appointments";
  const isOnAccountPage = pathname === "/account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            disabled={authIsLoading || session.isPending}
          />
        }
      >
        {getInitials(userName)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem
          onClick={handleNewAppointment}
          disabled={isCreatingAppointment}
        >
          <IconPlus className="size-4" />
          New Appointment
        </DropdownMenuItem>
        {!isOnAppointmentsPage && (
          <DropdownMenuItem onClick={() => router.push("/appointments")}>
            <IconCalendar className="size-4" />
            Appointments
          </DropdownMenuItem>
        )}
        {!isOnAccountPage && (
          <DropdownMenuItem onClick={() => router.push("/account")}>
            <IconUser className="size-4" />
            Account
          </DropdownMenuItem>
        )}
        {!isOnHomePage && (
          <DropdownMenuItem onClick={() => router.push("/")}>
            <IconHome className="size-4" />
            Home
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleLogout} disabled={authIsLoading}>
          <IconLogout className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
