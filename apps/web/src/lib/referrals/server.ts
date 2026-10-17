import { randomInt } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Unambiguous alphabet (no 0/O, 1/I/L) so codes survive being read aloud at
// a hospital front desk. 31^6 ≈ 887M combinations.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `NC-REF-${code}`;
}

/** Returns the patient's user id, or null when the caller is not a signed-in patient. */
export async function requirePatientId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PATIENT") return null;
  return session.user.id;
}
