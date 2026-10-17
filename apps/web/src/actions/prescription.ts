"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPrescription(data: {
  patientId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  appointmentId?: string;
  suggestedPharmacyId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return { success: false, error: "Unauthorized" };
  }

  if (!data.patientId || !data.medicationName.trim() || !data.dosage.trim()) {
    return { success: false, error: "patientId, medicationName, and dosage are required" };
  }

  const patient = await prisma.user.findUnique({
    where: { id: data.patientId, role: "PATIENT" },
    select: { id: true },
  });
  if (!patient) return { success: false, error: "Patient not found" };

  // BOLA guard: a provider may only prescribe to a patient they have an
  // actual appointment relationship with — without this, any provider could
  // issue prescriptions against any patient in the system.
  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id },
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

  const prescription = await prisma.prescription.create({
    data: {
      medicationName: data.medicationName.trim(),
      dosage: data.dosage.trim(),
      instructions: data.instructions?.trim() || null,
      patientId: data.patientId,
      providerId: session.user.id,
      appointmentId,
      suggestedPharmacyId: data.suggestedPharmacyId || null,
    },
  });

  revalidatePath("/provider/prescriptions");
  revalidatePath("/dashboard/prescriptions");
  return { success: true, data: prescription };
}

export async function routeToPharmacy(prescriptionId: string, pharmacyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return { success: false, error: "Unauthorized" };
  }

  if (!prescriptionId || !pharmacyId) {
    return { success: false, error: "prescriptionId and pharmacyId are required" };
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: { id: true, patientId: true, status: true },
  });

  if (!prescription || prescription.patientId !== session.user.id) {
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

  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: { pharmacyId, status: "ROUTED" },
  });

  revalidatePath("/dashboard/prescriptions");
  return { success: true };
}
