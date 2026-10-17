"use server"

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAdministrativeAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function approveProviderProfile(providerUserId: string, adminId: string, ipAddress: string) {
  try {
    // 1. Update the verification state on both the User and their Profile
    const updatedUser = await prisma.user.update({
      where: { id: providerUserId },
      data: {
        isVerified: true,
        practitionerProfile: {
          update: {
            isVerified: true,
          },
        },
      },
      include: { practitionerProfile: true },
    });

    // 2. Commit the audit log entry for historical compliance tracing
    await logAdministrativeAction({
      action: "PROVIDER_VERIFY",
      actorId: adminId,
      targetId: providerUserId,
      ipAddress,
      details: {
        previousStatus: "PENDING",
        updatedStatus: "APPROVED",
        providerEmail: updatedUser.email,
      },
    });

    // 3. Reset the Next.js router cache for this route layout context
    revalidatePath("/admin/providers");
    revalidatePath(`/admin/providers/${providerUserId}`);
    // Patient-facing specialist directory — ensures a newly-verified provider
    // is never served from a stale cached entry for this route.
    revalidatePath("/dashboard/providers");

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Failed to execute provider approval transaction:", error);
    return { success: false, error: "Internal operational execution failure." };
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
