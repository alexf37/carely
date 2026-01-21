"use client";

import { useState, useEffect, useRef } from "react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserMenu } from "@/components/user-menu";
import { authClient, type ExtendedUser } from "@/server/better-auth/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  IconFileText,
  IconAlertTriangle,
  IconTrash,
  IconMail,
  IconUpload,
} from "@tabler/icons-react";
import { api } from "@/trpc/react";
import { PdfThumbnail } from "@/components/pdf-thumbnail";

export default function AccountPage() {
  const session = authClient.useSession();
  const router = useRouter();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();
  const documentsQuery = api.document.list.useQuery();
  const deleteDocument = api.document.delete.useMutation({
    onSuccess: () => {
      utils.document.list.invalidate();
    },
  });

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      // Refresh the documents list
      utils.document.list.invalidate();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  useEffect(() => {
    const user = session.data?.user as ExtendedUser | undefined;
    if (user && !user.hasCompletedIntake) {
      router.push("/intake");
    }
  }, [session.data, router]);

  function handleDeleteAccount() {
    setIsDeletingAccount(true);
    authClient
      .deleteUser()
      .then(() => {
        router.push("/");
      })
      .catch(() => {
        setIsDeletingAccount(false);
        setDeleteDialogOpen(false);
      });
  }

  if (session.isPending) {
    return (
      <main className="flex flex-col h-screen items-center justify-center w-full px-4 max-w-screen-md mx-auto">
        <Spinner className="size-8" />
      </main>
    );
  }

  if (!session.data) {
    router.push("/");
    return null;
  }

  const currentUser = session.data.user as ExtendedUser;
  if (!currentUser.hasCompletedIntake) {
    return null;
  }

  return (
    <main className="flex flex-col min-h-screen w-full relative overflow-hidden">


      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center py-4 px-4 md:px-8 justify-between w-full shrink-0 max-w-screen-md mx-auto">
        <h1 className="text-2xl font-light tracking-tight">Carely</h1>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu userName={session.data.user.name ?? ""} />
        </div>
      </header>

      {/* Content */}
      <div className="relative flex-1 w-full max-w-screen-md mx-auto px-4 md:px-8 pb-12 flex flex-col items-start justify-center h-full">
        {/* Profile Hero */}
        <section className="pt-8 pb-12">
          <h2 className="text-4xl font-semibold tracking-tight">{currentUser.name}</h2>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <IconMail className="size-5" />
            <span className="text-base">{currentUser.email}</span>
          </div>
        </section>

        {/* Documents Section */}
        <section className="pb-12 w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Medical Documents</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <Spinner className="size-4" />
              ) : (
                <IconUpload className="size-4" />
              )}
              Upload PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {uploadError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {uploadError}
            </div>
          )}

          {documentsQuery.data && documentsQuery.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {documentsQuery.data.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative aspect-[3/4] rounded-xl border border-border overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => window.open(doc.url, "_blank")}
                >
                  <PdfThumbnail
                    url={doc.url}
                    width={200}
                    height={267}
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                    <p className="text-xs text-white truncate font-medium">
                      {doc.filename}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument.mutate({ id: doc.id });
                    }}
                    disabled={deleteDocument.isPending}
                  >
                    {deleteDocument.isPending ? (
                      <Spinner className="size-3" />
                    ) : (
                      <IconTrash className="size-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/30 to-muted/10">
              {/* Decorative grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />

              <div className="relative flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-background shadow-sm ring-1 ring-border/50 mb-5">
                  <IconFileText className="size-8 text-muted-foreground/70" />
                </div>

                <p className="font-medium text-foreground/80">No documents yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                  Upload lab results, prescriptions, and health records for Carely to reference
                </p>

                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <IconUpload className="size-4" />
                  )}
                  Upload your first document
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section>
          <h3 className="text-lg font-medium mb-4 text-destructive/80">Danger Zone</h3>

          <div className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-destructive/[0.02] dark:bg-destructive/[0.05]">
            {/* Subtle diagonal stripes */}
            <div
              className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 10px,
                  currentColor 10px,
                  currentColor 11px
                )`,
              }}
            />

            <div className="relative p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove your account and all data. This cannot be undone.
                  </p>
                </div>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        disabled={isDeletingAccount}
                        className="shrink-0"
                      >
                        {isDeletingAccount ? (
                          <Spinner className="size-4" />
                        ) : (
                          <IconTrash className="size-4" />
                        )}
                        Delete Account
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia className="bg-destructive/10">
                        <IconAlertTriangle className="size-8 text-destructive" />
                      </AlertDialogMedia>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account including all
                        your appointments, medical history, and uploaded
                        documents. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeletingAccount}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                      >
                        {isDeletingAccount ? (
                          <>
                            <Spinner className="size-4" />
                            Deleting...
                          </>
                        ) : (
                          "Delete Account"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
