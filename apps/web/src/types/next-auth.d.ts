import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

// Session/JWT augmentation. `role` reuses the Prisma enum so there is a
// single source of truth for roles across the database, auth and UI.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    avatarUrl: string | null;
  }
}
