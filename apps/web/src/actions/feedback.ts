"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/auth-guards";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendFeedbackEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { CSAT_SCALE, FEEDBACK_CATEGORY_LABELS, FEEDBACK_FORM_VALUES } from "@/lib/feedback/categories";

const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Please choose how satisfied you are.").max(5),
  category: z.enum(FEEDBACK_FORM_VALUES),
  comment: z
    .string()
    .trim()
    .min(1, "Please share a few words of feedback.")
    .max(2000, "Feedback must be under 2000 characters."),
});

export type SubmitFeedbackInput = z.infer<typeof feedbackSchema>;

export async function submitFeedback(input: SubmitFeedbackInput) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Unauthorized" };

  // 3 submissions per hour per user.
  const limit = rateLimit(`feedback-submit:${user.id}`, 3, 60 * 60_000);
  if (!limit.allowed) {
    return { success: false as const, error: "You've sent a lot of feedback recently. Please try again in an hour." };
  }

  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };

  const comment = sanitizePlainText(parsed.data.comment);
  if (!comment) return { success: false as const, error: "Please share a few words of feedback." };

  try {
    const [feedback, dbUser] = await Promise.all([
      prisma.feedback.create({
        data: { userId: user.id, rating: parsed.data.rating, category: parsed.data.category, comment },
      }),
      prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, role: true } }),
    ]);

    // Best-effort: the feedback is already saved, so an email failure is
    // logged and never surfaced as a failed submission.
    try {
      await sendFeedbackEmail({
        userName: dbUser?.name ?? "Unknown user",
        userEmail: dbUser?.email ?? "unknown",
        userRole: dbUser?.role ?? user.role,
        category: FEEDBACK_CATEGORY_LABELS[parsed.data.category],
        rating: parsed.data.rating,
        ratingLabel: CSAT_SCALE.find((s) => s.value === parsed.data.rating)?.label ?? "",
        message: comment,
        submittedAt: `${formatDateTime(feedback.createdAt)} (server time)`,
        feedbackId: feedback.id,
      });
    } catch (emailError) {
      console.error("[FEEDBACK_EMAIL_ERROR]", emailError instanceof Error ? emailError.message : emailError);
    }

    revalidatePath("/admin/feedback");
    return { success: true as const, data: { id: feedback.id } };
  } catch (error) {
    console.error("[SUBMIT_FEEDBACK_ERROR]", error);
    return { success: false as const, error: "Failed to submit feedback." };
  }
}
