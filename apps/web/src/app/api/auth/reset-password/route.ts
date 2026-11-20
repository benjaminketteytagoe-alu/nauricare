import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { apiError, apiSuccess, handle, readJson, validateBody } from "@/lib/api";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { passwordField } from "@/lib/validation/password";

const schema = z.object({ token: z.string().min(1).max(200), password: passwordField });

export async function POST(req: Request) {
  return handle(async () => {
    const ip = getClientIp(req.headers);
    const limit = enforceRateLimit(`auth-reset-password:${ip}`, 10, 15 * 60_000);
    if (limit) return limit;
    const burst = enforceRateLimit(`auth-reset-password-burst:${ip}`, 5, 60_000);
    if (burst) return burst;

    const parsed = validateBody(await readJson(req), schema);
    if (!parsed.ok) return parsed.response;

    const { token, password } = parsed.data;
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.resetToken.findUnique({ where: { tokenHash } });

    if (!resetToken) {
      return apiError("Invalid or expired reset link", 400);
    }

    if (resetToken.expiresAt < new Date()) {
      await prisma.resetToken.delete({ where: { tokenHash } });
      return apiError("Reset link has expired. Please request a new one.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.resetToken.delete({ where: { tokenHash } }),
    ]);

    return apiSuccess({ message: "Password updated successfully" });
  });
}
