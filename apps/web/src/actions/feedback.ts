"use server";

import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";

const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Please choose a rating.").max(5),
  category: z.enum(["GENERAL", "BUG_REPORT", "FEATURE_REQUEST", "PROVIDER_EXPERIENCE", "BILLING"]),
  comment: z
    .string()
    .trim()
    .min(1, "Please share a few words of feedback.")
    .max(2000, "Feedback must be under 2000 characters."),
});

export type SubmitFeedbackInput = z.infer<typeof feedbackSchema>;

export async function submitFeedback(input: SubmitFeedbackInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" };
  }

  const limit = rateLimit(`feedback-submit:${session.user.id}`, 5, 15 * 60_000);
  if (!limit.allowed) {
    return { success: false as const, error: "Too many submissions. Please try again in a few minutes." };
  }

  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        rating: parsed.data.rating,
        category: parsed.data.category,
        comment: parsed.data.comment,
      },
    });

    revalidatePath("/admin/feedback");
    return { success: true as const, data: feedback };
  } catch (error) {
    console.error("[SUBMIT_FEEDBACK_ERROR]", error);
    return { success: false as const, error: "Failed to submit feedback." };
  }
}
