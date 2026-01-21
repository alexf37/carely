import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        hasCompletedIntake: {
          type: "boolean",
        },
      },
    }),
  ],
});

// Extended user type including our custom fields
export type ExtendedUser = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  hasCompletedIntake: boolean;
};

export type Session = typeof authClient.$Infer.Session;
