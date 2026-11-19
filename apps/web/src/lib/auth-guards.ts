import type { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { forbidden, unauthorized } from "@/lib/api";

const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/dashboard",
  PROVIDER: "/provider",
  ADMIN: "/admin",
};

type AuthedSession = Session & { user: NonNullable<Session["user"]> & { id: string; role: Role } };

/**
 * Server Component / layout guard. Forces dynamic rendering (so user-specific
 * output is never cached across requests), requires a session, and bounces
 * users of any other role to their own portal.
 */
export async function requireRole(role: Role): Promise<AuthedSession> {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);
  if (session?.loginCodePending) redirect("/verify-code");
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== role) redirect(ROLE_HOME[session.user.role] ?? "/login");
  return session as AuthedSession;
}

export interface SessionUser {
  id: string;
  role: Role;
  email?: string | null;
  name?: string | null;
}

/** Route handler / server action helper: the caller's user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
  };
}

/** The caller's user id when they are signed in with `role`, otherwise null. */
export async function getUserIdWithRole(role: Role): Promise<string | null> {
  const user = await getSessionUser();
  return user && user.role === role ? user.id : null;
}

/**
 * Route handler guard. With no roles, any signed-in user passes; otherwise the
 * caller must hold one of them. Sessions still waiting for the emailed sign-in
 * code have no user id, so they are treated as signed out (401).
 *
 *   const auth = await requireApiUser("PATIENT");
 *   if (!auth.ok) return auth.response;
 *   auth.user.id
 */
export async function requireApiUser(
  ...roles: Role[]
): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, response: unauthorized() };
  if (roles.length > 0 && !roles.includes(user.role)) return { ok: false, response: forbidden() };
  return { ok: true, user };
}
