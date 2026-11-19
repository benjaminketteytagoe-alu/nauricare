import { apiSuccess, handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

// Prescriptions scoped to the caller: a patient sees the ones they received, a
// provider the ones they issued. Admin-wide access to clinical data is not
// offered here (it would bypass the audited, need-to-know access promised in
// the Informed Consent).
export async function GET() {
  const auth = await requireApiUser("PATIENT", "PROVIDER");
  if (!auth.ok) return auth.response;
  const { id, role } = auth.user;
  return handle(async () =>
    apiSuccess(
      await prisma.prescription.findMany({
        where: role === "PATIENT" ? { patientId: id } : { providerId: id },
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          provider: { select: { id: true, name: true } },
          pharmacy: { select: { id: true, name: true, address: true } },
          suggestedPharmacy: { select: { id: true, name: true, address: true } },
          appointment: { select: { id: true, startTime: true } },
        },
      }),
    ),
  );
}
