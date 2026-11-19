"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { passwordField } from "@/lib/validation/password";
import { dateKeySchema, firstIssue, optionalText, timeSchema } from "@/lib/validation/common";

const ProfileInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  specialty: z.string().trim().min(1, "Specialty is required").max(120),
  bio: optionalText(2000),
  clinicName: optionalText(200),
  licenseNumber: optionalText(64),
  hospitalAffiliation: optionalText(200),
});

const SecurityInput = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: passwordField,
  secondaryEmail: z.union([z.literal(""), z.email("Enter a valid secondary email")]).optional(),
});

const SlotInput = z
  .object({ date: dateKeySchema, startTime: timeSchema, endTime: timeSchema, isAvailable: z.boolean() })
  .refine((v) => v.startTime < v.endTime, { message: "End time must be after start time" });

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

  const parsed = ProfileInput.safeParse(data);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  data = parsed.data;
  const { name, specialty } = parsed.data;

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

  const parsed = SecurityInput.safeParse(data);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  data = parsed.data;
  const newPassword = parsed.data.newPassword;

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

  const parsed = SlotInput.safeParse(data);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  data = parsed.data;
  const dateObj = new Date(`${data.date}T00:00:00.000Z`);

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
