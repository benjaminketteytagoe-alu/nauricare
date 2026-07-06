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

  const prescription = await prisma.prescription.create({
    data: {
      medicationName: data.medicationName.trim(),
      dosage: data.dosage.trim(),
      instructions: data.instructions?.trim() || null,
      patientId: data.patientId,
      providerId: session.user.id,
      appointmentId: data.appointmentId || null,
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
