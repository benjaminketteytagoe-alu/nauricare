"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitFeedback } from "@/actions/feedback";
import { Callout } from "@/components/ui/callout";
import { CSAT_SCALE, FEEDBACK_FORM_CATEGORIES, type FeedbackFormCategory } from "@/lib/feedback/categories";
import { SUPPORT_EMAIL } from "@/lib/site";

const COMMENT_MAX = 2000;

/** The feedback form, shown on the Feedback tab of each portal. */
export function FeedbackForm() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<FeedbackFormCategory>("GENERAL");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setRating(0);
    setCategory("GENERAL");
    setComment("");
    setError("");
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return setError("Please choose how satisfied you are.");
    if (!comment.trim()) return setError("Please share a few words of feedback.");
    setError("");
    setIsSubmitting(true);
    const result = await submitFeedback({ rating, category, comment: comment.trim() });
    setIsSubmitting(false);
    if (result.success) {
      setSubmitted(true);
      router.refresh(); // update "Your feedback" history
    } else setError(result.error);
  }

  return (
    <section aria-labelledby="feedback-form-title" className="card-surface overflow-hidden">
      <div className="px-5 pb-2 pt-6 sm:px-6">
        <h2 id="feedback-form-title" className="text-lg font-bold text-ink">
          Share your feedback
        </h2>
        <p className="mt-1 text-sm text-ink-muted">It goes straight to the NauriCare team.</p>
      </div>

      {submitted ? (
        <div className="space-y-3 px-5 pb-8 pt-6 text-center sm:px-6">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-ink" aria-hidden />
          <h3 className="text-lg font-bold text-ink">Thank you!</h3>
          <p className="text-sm text-ink-soft">
            Your feedback helps us make NauriCare better for every woman who uses it.
          </p>
          <button type="button" onClick={reset} className="m3-btn-outlined mt-2">
            Send more feedback
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 px-5 pb-6 pt-4 sm:px-6">
          {error && (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">How satisfied are you with NauriCare?</legend>
            <div role="radiogroup" className="grid grid-cols-5 gap-2">
              {CSAT_SCALE.map((s) => {
                const selected = rating === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={s.label}
                    onClick={() => setRating(s.value)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 transition-all ${
                      selected
                        ? "scale-105 border-brand bg-brand-soft shadow-sm"
                        : "border-hairline hover:border-field hover:bg-surface-muted"
                    }`}
                  >
                    <span
                      className={`text-2xl transition-[filter] ${selected || rating === 0 ? "" : "grayscale"}`}
                      aria-hidden
                    >
                      {s.emoji}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-ink-muted">
              <span>Very dissatisfied</span>
              <span className="font-medium text-brand-ink">
                {CSAT_SCALE.find((s) => s.value === rating)?.label ?? ""}
              </span>
              <span>Very satisfied</span>
            </div>
          </fieldset>

          <div>
            <label htmlFor="feedback-category" className="mb-1.5 block text-sm font-semibold text-ink">
              Category
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackFormCategory)}
              className="m3-input"
            >
              {FEEDBACK_FORM_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="feedback-comment" className="text-sm font-semibold text-ink">
                Tell us more
              </label>
              <span className="text-xs text-ink-muted">
                {comment.length}/{COMMENT_MAX}
              </span>
            </div>
            <textarea
              id="feedback-comment"
              rows={4}
              value={comment}
              maxLength={COMMENT_MAX}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What's working well? What could be better?"
              className="m3-input resize-none leading-relaxed"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="m3-btn-filled w-full">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isSubmitting ? "Sending…" : "Send feedback"}
          </button>
          <p className="text-center text-xs text-ink-muted">
            Prefer email? Write to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-ink hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </form>
      )}
    </section>
  );
}
