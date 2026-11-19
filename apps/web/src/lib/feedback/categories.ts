import type { FeedbackCategory } from "@prisma/client";
import type { ChipTone } from "@/components/ui/status-chip";

// Shared by the feedback form, the server action, the admin dashboard and the
// admin API, so labels and allowed values can never drift apart.

/** Categories offered in the feedback form, in display order. */
export const FEEDBACK_FORM_CATEGORIES = [
  { value: "GENERAL", label: "General Experience" },
  { value: "CLINICAL_TRIAGE", label: "Clinical Triage / AI" },
  { value: "REFERRALS_BOOKING", label: "Referrals & Booking" },
  { value: "BUG_REPORT", label: "Technical Bug" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
] as const satisfies readonly { value: FeedbackCategory; label: string }[];

export type FeedbackFormCategory = (typeof FEEDBACK_FORM_CATEGORIES)[number]["value"];

export const FEEDBACK_FORM_VALUES = FEEDBACK_FORM_CATEGORIES.map((c) => c.value) as [FeedbackFormCategory, ...FeedbackFormCategory[]];

/** Every stored category, including legacy ones, for admin views and filters. */
export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  GENERAL: "General Experience",
  CLINICAL_TRIAGE: "Clinical Triage / AI",
  REFERRALS_BOOKING: "Referrals & Booking",
  BUG_REPORT: "Technical Bug",
  FEATURE_REQUEST: "Feature Request",
  PROVIDER_EXPERIENCE: "Provider Experience (legacy)",
  BILLING: "Billing (legacy)",
};

export const FEEDBACK_CATEGORY_TONES: Record<FeedbackCategory, ChipTone> = {
  GENERAL: "neutral",
  CLINICAL_TRIAGE: "primary",
  REFERRALS_BOOKING: "success",
  BUG_REPORT: "berry",
  FEATURE_REQUEST: "amber",
  PROVIDER_EXPERIENCE: "muted",
  BILLING: "muted",
};

export const ALL_FEEDBACK_CATEGORIES = Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[];

/** CSAT scale; `value` is what is stored in Feedback.rating (1–5). */
export const CSAT_SCALE = [
  { value: 1, emoji: "😞", label: "Very dissatisfied" },
  { value: 2, emoji: "🙁", label: "Dissatisfied" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Satisfied" },
  { value: 5, emoji: "😍", label: "Very satisfied" },
] as const;
