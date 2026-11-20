"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { firstIssue, idSchema } from "@/lib/validation/common";
import { recordActivity } from "@/server/activity/activity.service";
import { isApprovedProvider, PENDING_PROVIDER_MESSAGE } from "@/server/providers/approval";

const CreatePrescriptionInput = z.object({
  patientId: idSchema,
  medicationName: z.string().trim().min(1, "Medication name is required.").max(200),
  dosage: z.string().trim().min(1, "Dosage is required.").max(200),
  instructions: z.string().trim().max(2000).optional(),
  appointmentId: idSchema.optional().or(z.literal("")),
  suggestedPharmacyId: idSchema.optional().or(z.literal("")),
});

const RouteInput = z.object({ prescriptionId: idSchema, pharmacyId: idSchema });

export async function createPrescription(data: {
  patientId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  appointmentId?: string;
  suggestedPharmacyId?: string;
}) {
  const caller = await getSessionUser();
  if (!caller?.id || caller.role !== "PROVIDER") {
    return { success: false, error: "Unauthorized" };
  }
  if (!(await isApprovedProvider(caller.id))) return { success: false, error: PENDING_PROVIDER_MESSAGE };

  const parsedInput = CreatePrescriptionInput.safeParse(data);
  if (!parsedInput.success) return { success: false, error: firstIssue(parsedInput.error) };
  data = parsedInput.data;

  const patient = await prisma.user.findUnique({
    where: { id: data.patientId, role: "PATIENT" },
    select: { id: true },
  });
  if (!patient) return { success: false, error: "Patient not found" };

  // BOLA guard: a provider may only prescribe to a patient they have an
  // actual appointment relationship with — without this, any provider could
  // issue prescriptions against any patient in the system.
  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: caller.id },
    select: { id: true },
  });
  if (!practitioner) return { success: false, error: "Practitioner profile not found" };

  const sharedAppointment = await prisma.appointment.findFirst({
    where: { practitionerProfileId: practitioner.id, patient: { userId: data.patientId } },
  });
  if (!sharedAppointment) {
    return { success: false, error: "Forbidden: no active patient relationship" };
  }

  // If a specific appointment is cited, it must actually belong to this
  // practitioner+patient pair — otherwise a provider could link the
  // prescription to an unrelated appointment record.
  let appointmentId: string | null = null;
  if (data.appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: data.appointmentId,
        practitionerProfileId: practitioner.id,
        patient: { userId: data.patientId },
      },
      select: { id: true },
    });
    if (!appointment) return { success: false, error: "Appointment not found" };
    appointmentId = appointment.id;
  }

  // An unknown pharmacy id would otherwise fail on the foreign key.
  if (data.suggestedPharmacyId) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: data.suggestedPharmacyId },
      select: { id: true },
    });
    if (!pharmacy) return { success: false, error: "Suggested pharmacy not found" };
  }

  const prescription = await prisma.prescription.create({
    data: {
      medicationName: sanitizePlainText(data.medicationName),
      dosage: sanitizePlainText(data.dosage),
      instructions: data.instructions ? sanitizePlainText(data.instructions) || null : null,
      patientId: data.patientId,
      providerId: caller.id,
      appointmentId,
      suggestedPharmacyId: data.suggestedPharmacyId || null,
    },
  });

  revalidatePath("/provider/prescriptions");
  revalidatePath("/dashboard/prescriptions");
  return { success: true, data: prescription };
}

export async function routeToPharmacy(prescriptionId: string, pharmacyId: string) {
  const caller = await getSessionUser();
  if (!caller?.id || caller.role !== "PATIENT") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = RouteInput.safeParse({ prescriptionId, pharmacyId });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: { id: true, patientId: true, status: true },
  });

  if (!prescription || prescription.patientId !== caller.id) {
    return { success: false, error: "Prescription not found" };
  }
  if (prescription.status !== "PENDING") {
    return { success: false, error: "Prescription has already been routed" };
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { id: true },
  });
  if (!pharmacy) return { success: false, error: "Pharmacy not found" };

  // Atomic: ownership and PENDING status are re-checked in the same write,
  // so two concurrent requests cannot both route the prescription.
  const routed = await prisma.prescription.updateMany({
    where: { id: prescriptionId, patientId: caller.id, status: "PENDING" },
    data: { pharmacyId, status: "ROUTED" },
  });
  if (routed.count === 0) return { success: false, error: "Prescription has already been routed" };
  await recordActivity({
    userId: caller.id,
    type: "PRESCRIPTION_ROUTED",
    title: "Sent a prescription to a pharmacy",
    ref: { type: "Prescription", id: prescriptionId },
  });

  revalidatePath("/dashboard/prescriptions");
  return { success: true };
}
