import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

const UpdateStatus = z.object({ status: z.enum(["NEW", "REVIEWED", "ACTIONED"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser("ADMIN");
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(`admin-feedback:${auth.user.id}`);
  if (limited) return limited;
  const { id } = await params;
  const body = await parseJson(req, UpdateStatus);
  if (!body.ok) return body.response;
  return handle(async () => {
    try {
      return apiSuccess(await prisma.feedback.update({ where: { id }, data: { status: body.data.status } }));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return notFound("Feedback item not found.");
      }
      throw e;
    }
  });
}
