import { z } from "zod";
import { apiSuccess, handle, parseJson } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth-guards";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";

const PharmacyInput = z.object({
  name: z.string().trim().min(1, "name and address are required").max(200),
  address: z.string().trim().min(1, "name and address are required").max(300),
  contactEmail: z
    .union([z.literal(""), z.email("Enter a valid contact email")])
    .optional()
    .or(z.null()),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().or(z.null()),
});

export async function GET() {
  const auth = await requireApiUser("ADMIN");
  if (!auth.ok) return auth.response;
  return handle(async () => apiSuccess(await prisma.pharmacy.findMany({ orderBy: { createdAt: "desc" } })));
}

export async function POST(req: Request) {
  const auth = await requireApiUser("ADMIN");
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(`admin-pharmacies:${auth.user.id}`);
  if (limited) return limited;
  const body = await parseJson(req, PharmacyInput);
  if (!body.ok) return body.response;
  const { contactEmail, tags } = body.data;

  return handle(async () => {
    const pharmacy = await prisma.pharmacy.create({
      data: {
        name: sanitizePlainText(body.data.name),
        address: sanitizePlainText(body.data.address),
        contactEmail: contactEmail || null,
        tags: (tags ?? []).map(sanitizePlainText).filter(Boolean),
      },
    });
    await logAdministrativeAction({
      action: "ADMIN_SETTINGS_UPDATE",
      actorId: auth.user.id,
      targetId: pharmacy.id,
      details: { change: "pharmacy_added", name: pharmacy.name },
      ipAddress: getClientIp(req.headers),
    });
    return apiSuccess(pharmacy, 201);
  });
}
