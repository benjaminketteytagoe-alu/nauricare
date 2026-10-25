"use server"

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAdministrativeAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/getClientIp";
import { idSchema } from "@/lib/validation/common";

/**
 * Approves a provider. Authorization and the audit identity come ONLY from the
 * server session: server actions are public HTTP endpoints, so nothing the
 * browser sends (admin id, IP) can be trusted.
 */
export async function approveProviderProfile(providerUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!idSchema.safeParse(providerUserId).success) {
    return { success: false as const, error: "Invalid provider." };
  }

  try {
    const provider = await prisma.user.findUnique({
      where: { id: providerUserId },
      select: { id: true, role: true, email: true, isVerified: true, practitionerProfile: { select: { id: true } } },
    });
    if (!provider || provider.role !== "PROVIDER" || !provider.practitionerProfile) {
      return { success: false as const, error: "Provider not found." };
    }

    await prisma.user.update({
      where: { id: providerUserId },
      data: { isVerified: true, practitionerProfile: { update: { isVerified: true } } },
    });

    await logAdministrativeAction({
      action: "PROVIDER_VERIFY",
      actorId: session.user.id,
      targetId: providerUserId,
      ipAddress: getClientIp(await headers()),
      details: {
        previousStatus: provider.isVerified ? "APPROVED" : "PENDING",
        updatedStatus: "APPROVED",
        providerEmail: provider.email,
      },
    });

    revalidatePath("/admin/providers");
    revalidatePath(`/admin/providers/${providerUserId}`);
    // Patient-facing directory: a newly verified provider must not be served stale.
    revalidatePath("/dashboard/providers");

    return { success: true as const };
  } catch (error) {
    console.error("Failed to execute provider approval transaction:", error);
    return { success: false as const, error: "Internal operational execution failure." };
  }
}

/**
 * Soft-deletes a provider: deactivates their PractitionerProfile rather than
 * removing rows outright. A hard delete would cascade through Appointment,
 * HealthRecord, Prescription, and DirectMessage (all onDelete: Cascade on
 * User/PractitionerProfile in schema.prisma), destroying other patients'
 * clinical records and message history as a side effect of removing one
 * provider. Deactivation hides them from the admin roster's active view and
 * the patient-facing directory while preserving that data.
 */
export async function deleteProviderProfile(providerId: string) {
  // Strict server-side authorization — do not trust a client-supplied admin id.
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized", status: 403 as const };
  }

  try {
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      include: { practitionerProfile: true },
    });

    if (!provider || provider.role !== "PROVIDER" || !provider.practitionerProfile) {
      return { success: false, error: "Provider not found.", status: 404 as const };
    }

    if (!provider.practitionerProfile.isActive) {
      return { success: false, error: "Provider has already been deleted." };
    }

    const updated = await prisma.practitionerProfile.update({
      where: { userId: providerId },
      data: { isActive: false },
    });

    await logAdministrativeAction({
      action: "PROVIDER_SUSPEND",
      actorId: session.user.id,
      targetId: providerId,
      details: {
        providerEmail: provider.email,
        reason: "Deleted via Admin Console",
      },
    });

    revalidatePath("/admin/providers");
    revalidatePath(`/admin/providers/${providerId}`);
    // Patient-facing specialist directory — a deleted provider must
    // immediately stop appearing as bookable.
    revalidatePath("/dashboard/providers");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to execute provider deletion transaction:", error);
    return { success: false, error: "Internal operational execution failure." };
  }
}
