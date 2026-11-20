import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import type { SessionEnd } from "@/lib/sessionPolicy";

// Session/JWT augmentation. `role` reuses the Prisma enum so there is a
// single source of truth for roles across the database, auth and UI.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      avatarUrl: string | null;
    } & DefaultSession["user"];
    /** Signed in, but the emailed sign-in code hasn't been entered yet. */
    loginCodePending?: boolean;
    /** Why the session ended (inactivity, lifetime, password change). */
    ended?: SessionEnd;
    /** Inactivity limit for the idle guard; null when kept signed in. */
    idleLimitMs?: number | null;
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
    mfaVerified?: boolean; // sign-in code entered for this session
    mfaSid?: string; // random per-session key binding codes to this session
    remember?: boolean; // "keep me signed in" (patients only)
    authAt?: number; // when the sign-in code was accepted (ms)
    lastSeen?: number; // last activity the browser reported (ms)
    pwf?: string; // password fingerprint; a change ends the session
    ended?: SessionEnd;
  }
}
