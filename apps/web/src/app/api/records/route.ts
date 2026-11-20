import { z } from "zod";
import { apiSuccess, forbidden, handle, notFound, parseJson, validationError } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth-guards";
import { getClientIp } from "@/lib/getClientIp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";

const CreateRecord = z.object({
  patientProfileId: z.string().min(1),
  type: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(10_000),
  notes: z.string().trim().max(5_000).optional(),
  documentUrl: z.url().optional(),
});

const recordInclude = { practitioner: { include: { user: { select: { name: true } } } } } as const;

/** The caller's practitioner profile id when they have seen this patient, else null. */
async function careRelationship(userId: string, patientProfileId: string): Promise<string | null | "no-profile"> {
  const practitioner = await prisma.practitionerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!practitioner) return "no-profile";
  const shared = await prisma.appointment.findFirst({
    where: { practitionerProfileId: practitioner.id, patientProfileId },
    select: { id: true },
  });
  return shared ? practitioner.id : null;
}

// PATIENT: their own records. PROVIDER: one patient's records, only with a
// care relationship (at least one appointment), and every read is audited.
export async function GET(req: Request) {
  const auth = await requireApiUser("PATIENT", "PROVIDER");
  if (!auth.ok) return auth.response;
  const { id: userId, role } = auth.user;

  return handle(async () => {
    if (role === "PATIENT") {
      const profile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) return notFound("Patient profile not found.");
      return apiSuccess(
        await prisma.healthRecord.findMany({
          where: { patientProfileId: profile.id },
          include: recordInclude,
          orderBy: { createdAt: "desc" },
        }),
      );
    }

    const patientProfileId = new URL(req.url).searchParams.get("patientProfileId");
    if (!patientProfileId) return validationError("Missing patientProfileId.");

    const practitionerProfileId = await careRelationship(userId, patientProfileId);
    if (practitionerProfileId === "no-profile") return notFound("Practitioner profile not found.");
    if (!practitionerProfileId) return forbidden("No active patient relationship.");

    const records = await prisma.healthRecord.findMany({
      where: { patientProfileId },
      include: recordInclude,
      orderBy: { createdAt: "desc" },
    });

    // Fire-and-forget: audit failures must never block the response.
    void logAdministrativeAction({
      action: "RECORD_ACCESS",
      actorId: userId,
      targetId: patientProfileId,
      details: { practitionerProfileId, recordCount: records.length },
      ipAddress: getClientIp(req.headers),
    });
    return apiSuccess(records);
  });
}

export async function POST(req: Request) {
  const auth = await requireApiUser("PROVIDER");
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimit(`records:${auth.user.id}`);
  if (limited) return limited;
  const body = await parseJson(req, CreateRecord);
  if (!body.ok) return body.response;
  const { patientProfileId, type, content, notes, documentUrl } = body.data;

  return handle(async () => {
    // BOLA guard: a provider may only write records for patients they have an
    // appointment relationship with.
    const practitionerProfileId = await careRelationship(auth.user.id, patientProfileId);
    if (practitionerProfileId === "no-profile") return notFound("Practitioner not found.");
    if (!practitionerProfileId) return forbidden("No active patient relationship.");

    const record = await prisma.healthRecord.create({
      data: {
        patientProfileId,
        practitionerProfileId,
        type,
        content,
        notes: notes || null,
        documentUrl: documentUrl || null,
      },
    });
    return apiSuccess(record, 201);
  });
}
