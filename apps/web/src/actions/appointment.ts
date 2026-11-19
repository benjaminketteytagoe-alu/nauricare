"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema, firstIssue } from "@/lib/validation/common";
import { notify } from "@/server/notifications/notify";

const UpdateStatusInput = z.object({
  appointmentId: idSchema,
  status: z.enum(["COMPLETED", "MISSED", "CANCELLED"]),
});

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

  const parsed = UpdateStatusInput.safeParse({ appointmentId, status });
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!practitioner) return { success: false, error: "Practitioner profile not found" };

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, practitionerProfileId: true, status: true, startTime: true, patient: { select: { userId: true } } },
  });

  if (!appointment || appointment.practitionerProfileId !== practitioner.id) {
    return { success: false, error: "Appointment not found" };
  }

  if (TERMINAL_STATUSES.includes(appointment.status)) {
    return { success: false, error: "Appointment is already finalised" };
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: parsed.data.status },
  });

  const label = { COMPLETED: "completed", MISSED: "marked as missed", CANCELLED: "cancelled" }[parsed.data.status];
  await notify({
    recipientId: appointment.patient.userId,
    actorId: session.user.id,
    type: "APPOINTMENT_UPDATED",
    title: `Your appointment was ${label}`,
    body: `Consultation on ${appointment.startTime.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`,
    link: "/dashboard/providers",
  });

  revalidatePath("/provider/roster");
  revalidatePath("/provider/schedule");
  return { success: true };
}
