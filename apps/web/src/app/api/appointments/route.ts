import { z } from "zod";
import { apiSuccess, handle, notFound, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { sendPatientConfirmationEmail, sendProviderAlertEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/sanitize";
import { idSchema } from "@/lib/validation/common";
import { recordActivity } from "@/server/activity/activity.service";
import { notify } from "@/server/notifications/notify";

const isoDate = z
  .string()
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date.");
const BookingInput = z
  .object({
    practitionerProfileId: idSchema,
    startTime: isoDate,
    endTime: isoDate,
    notes: z.string().max(2000, "Notes must be under 2000 characters.").optional().or(z.null()),
  })
  .refine((v) => Date.parse(v.endTime) > Date.parse(v.startTime), {
    message: "The appointment must end after it starts.",
  })
  .refine((v) => Date.parse(v.startTime) > Date.now() - 5 * 60_000, { message: "Please choose a time in the future." });

export async function POST(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const patient = auth.user;
  const limited = enforceRateLimit(`booking:${patient.id}`, 10, 60 * 60_000);
  if (limited) return limited;
  const parsed = await parseJson(req, BookingInput);
  if (!parsed.ok) return parsed.response;
  const { practitionerProfileId, startTime, endTime } = parsed.data;
  const notes = parsed.data.notes ? sanitizePlainText(parsed.data.notes) : "";

  return handle(async () => {
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: patient.id } });
    if (!patientProfile) return notFound("Patient profile not found.");

    const practitioner = await prisma.practitionerProfile.findUnique({
      where: { id: practitionerProfileId },
      include: { user: { select: { name: true, email: true } } },
    });

    // Only verified, active practitioners can be booked (same rule as the directory).
    if (!practitioner || !practitioner.isVerified || !practitioner.isActive) {
      return notFound("This specialist isn't available for booking.");
    }

    const start = new Date(startTime);
    const dateLabel =
      start.toDateString() + " at " + start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Atomic booking: create appointment → derive meetingLink → notify both parties.
    // All four writes succeed together or none do.
    const appointment = await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          patientProfileId: patientProfile.id,
          practitionerProfileId: practitioner.id,
          startTime: start,
          endTime: new Date(endTime),
          notes: notes || null,
          status: "SCHEDULED",
        },
      });

      // Deterministic room name: both patient and provider resolve to the same Jitsi URL.
      const meetingLink = `https://meet.jit.si/nauricare-${created.id}`;

      const [updated] = await Promise.all([
        tx.appointment.update({
          where: { id: created.id },
          data: { meetingLink },
        }),
        tx.notification.create({
          data: {
            userId: patient.id,
            type: "EMAIL",
            status: "PENDING",
            message: `Your NauriCare telehealth appointment is confirmed for ${dateLabel}. Join here: ${meetingLink}`,
          },
        }),
        tx.notification.create({
          data: {
            userId: practitioner.userId,
            type: "PUSH",
            status: "PENDING",
            message: `New appointment booked for ${dateLabel}. Video consultation: ${meetingLink}`,
          },
        }),
      ]);

      return updated;
    });

    // Derive human-readable date/time strings for the email templates
    const apptDate = start.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const apptTime = start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Fire both emails concurrently after the DB transaction succeeds.
    // allSettled (not all) so a failure on one side doesn't hide the other's
    // outcome — Promise.all only ever surfaces the first rejection.
    const emailJobs = [
      {
        recipient: "patient",
        fn: async () => {
          if (!patient.email) throw new Error("patient has no email address");
          return sendPatientConfirmationEmail({
            to: patient.email,
            patientName: patient.name ?? "Patient",
            providerName: practitioner.user.name ?? "Your Provider",
            date: apptDate,
            time: apptTime,
            meetingLink: appointment.meetingLink ?? "",
          });
        },
      },
      {
        recipient: "provider",
        fn: () =>
          sendProviderAlertEmail({
            to: practitioner.user.email,
            providerName: practitioner.user.name ?? "Provider",
            patientName: patient.name ?? "Patient",
            date: apptDate,
            time: apptTime,
            meetingLink: appointment.meetingLink ?? "",
          }),
      },
    ];

    const results = await Promise.allSettled(emailJobs.map((job) => job.fn()));
    // Ids and outcomes only: recipient addresses never go to the logs.
    results.forEach((result, i) => {
      const { recipient } = emailJobs[i];
      if (result.status === "rejected") {
        logger.error(
          { event: "appointments.email_failed", recipient, appointmentId: appointment.id, err: result.reason },
          "Appointment email failed",
        );
      } else {
        logger.info(
          { event: "appointments.email_sent", recipient, appointmentId: appointment.id },
          "Appointment email sent",
        );
      }
    });

    await notify({
      recipientId: practitioner.userId,
      actorId: patient.id,
      type: "APPOINTMENT_BOOKED",
      title: `New booking: ${dateLabel}`,
      body: `${patient.name ?? "A patient"} booked a video consultation.`,
      link: "/provider/schedule",
    });

    await recordActivity({
      userId: patient.id,
      type: "APPOINTMENT_BOOKED",
      title: `Booked a consultation with ${practitioner.user.name}`,
      details: { startTime: start.toISOString(), clinic: practitioner.clinicName },
      ref: { type: "Appointment", id: appointment.id },
    });

    return apiSuccess(appointment, 201);
  });
}

// GET: upcoming appointments, shaped for the caller's role.
export async function GET() {
  const auth = await requireApiUser("PATIENT", "PROVIDER");
  if (!auth.ok) return auth.response;
  const { id: userId, role } = auth.user;

  return handle(async () => {
    if (role === "PROVIDER") {
      const practitionerProfile = await prisma.practitionerProfile.findUnique({ where: { userId } });
      if (!practitionerProfile) return apiSuccess([]); // No profile yet

      const doctorSchedule = await prisma.appointment.findMany({
        where: {
          practitionerProfileId: practitionerProfile.id,
          startTime: { gte: new Date() }, // Only future appointments
        },
        include: {
          // Pull the patient's name and email so the doctor knows who they are seeing
          patient: { include: { user: { select: { name: true, email: true } } } },
        },
        orderBy: { startTime: "asc" },
      });
      return apiSuccess(doctorSchedule);
    }

    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId } });
    if (!patientProfile) return apiSuccess([]);

    const patientSchedule = await prisma.appointment.findMany({
      where: {
        patientProfileId: patientProfile.id,
        startTime: { gte: new Date() },
      },
      include: {
        practitioner: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { startTime: "asc" },
    });
    return apiSuccess(patientSchedule);
  });
}
