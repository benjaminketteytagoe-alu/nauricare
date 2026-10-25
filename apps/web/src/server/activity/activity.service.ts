import type { PatientActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Patient-facing activity history (Records tab). Distinct from AuditLog, which
// is the admin/provider compliance trail. Like the audit logger, a failure
// here must never break the action being recorded.

export interface ActivityInput {
  userId: string;
  type: PatientActivityType;
  title: string;
  details?: Record<string, unknown>;
  ref?: { type: string; id: string };
}

export async function recordActivity(input: ActivityInput): Promise<void> {
  try {
    await prisma.patientActivity.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title.slice(0, 200),
        details: input.details ? (JSON.parse(JSON.stringify(input.details)) as Prisma.InputJsonValue) : undefined,
        refType: input.ref?.type,
        refId: input.ref?.id,
      },
    });
  } catch (error) {
    console.error(`[ACTIVITY] failed to record ${input.type}:`, error instanceof Error ? error.message : error);
  }
}

/** Only patients get an activity history; other roles are ignored. */
export async function recordPatientActivity(role: string | undefined, input: ActivityInput): Promise<void> {
  if (role !== "PATIENT") return;
  await recordActivity(input);
}
