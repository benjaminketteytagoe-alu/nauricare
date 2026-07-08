"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function updateProviderProfile(data: {
  name: string;
  specialty: string;
  bio?: string;
  clinicName?: string;
  licenseNumber?: string;
  hospitalAffiliation?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return { success: false, error: "Unauthorized" };
  }

  const name = data.name.trim();
  const specialty = data.specialty.trim();
  if (!name || !specialty) {
    return { success: false, error: "Name and specialty are required" };
  }

  await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        licenseNumber: data.licenseNumber?.trim() || null,
        hospitalAffiliation: data.hospitalAffiliation?.trim() || null,
      },
    }),
    prisma.practitionerProfile.updateMany({
      where: { userId: session.user.id },
      data: {
        specialty,
        bio: data.bio?.trim() || null,
        clinicName: data.clinicName?.trim() || undefined,
      },
    }),
  ]);

  revalidatePath("/provider/settings");
  return { success: true };
}

export async function updateSecuritySettings(data: {
  currentPassword: string;
  newPassword: string;
  secondaryEmail?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return { success: false, error: "Unauthorized" };
  }

  const newPassword = data.newPassword.trim();
  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { success: false, error: "User not found" };

  const passwordMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!passwordMatch) {
    return { success: false, error: "Current password is incorrect" };
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: newHash,
      secondaryEmail: data.secondaryEmail?.trim() || null,
    },
  });

  revalidatePath("/provider/settings");
  return { success: true };
}

export async function upsertAvailabilitySlot(data: {
  date: string;        // ISO date "YYYY-MM-DD"
  startTime: string;   // "HH:MM"
  endTime: string;     // "HH:MM"
  isAvailable: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return { success: false, error: "Unauthorized" };
  }

  const dateObj = new Date(data.date);
  if (isNaN(dateObj.getTime())) {
    return { success: false, error: "Invalid date" };
  }

  await prisma.providerAvailability.upsert({
    where: {
      providerId_date_startTime_endTime: {
        providerId: session.user.id,
        date: dateObj,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    },
    update: { isAvailable: data.isAvailable },
    create: {
      providerId: session.user.id,
      date: dateObj,
      startTime: data.startTime,
      endTime: data.endTime,
      isAvailable: data.isAvailable,
    },
  });

  revalidatePath("/provider/settings");
  return { success: true };
}
