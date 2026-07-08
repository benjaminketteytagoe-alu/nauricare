"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";

const TERMINAL_STATUSES: AppointmentStatus[] = ["COMPLETED", "CANCELLED", "MISSED"];

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "COMPLETED" | "MISSED" | "CANCELLED",
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return { success: false, error: "Unauthorized" };
  }

  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!practitioner) return { success: false, error: "Practitioner profile not found" };

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, practitionerProfileId: true, status: true },
  });

  if (!appointment || appointment.practitionerProfileId !== practitioner.id) {
    return { success: false, error: "Appointment not found" };
  }

  if (TERMINAL_STATUSES.includes(appointment.status)) {
    return { success: false, error: "Appointment is already finalised" };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });

  revalidatePath("/provider/roster");
  revalidatePath("/provider/schedule");
  return { success: true };
}
