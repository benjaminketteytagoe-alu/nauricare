import { apiSuccess, forbidden, handle, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

// The telehealth room: only the appointment's patient and practitioner may load it.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  return handle(async () => {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        practitioner: { include: { user: { select: { name: true, email: true } } } },
      },
    });
    if (!appointment) return notFound("Appointment not found.");
    const isParticipant =
      appointment.patient.userId === auth.user.id || appointment.practitioner.userId === auth.user.id;
    if (!isParticipant) return forbidden("You do not have access to this telehealth room.");
    return apiSuccess(appointment);
  });
}
