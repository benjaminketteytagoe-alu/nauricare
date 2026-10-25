import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/** The signed-in-but-unverified session behind this request, if any. */
export async function pendingLogin(req: NextRequest): Promise<{ userId: string; sid: string; role: string; verified: boolean } | null> {
  const token = await getToken({ req, secret: authOptions.secret });
  if (!token?.id || !token.mfaSid) return null;
  return { userId: token.id, sid: token.mfaSid, role: token.role, verified: token.mfaVerified === true };
}
