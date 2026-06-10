"use server"

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

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Failed to execute provider approval transaction:", error);
    return { success: false, error: "Internal operational execution failure." };
  }
}
