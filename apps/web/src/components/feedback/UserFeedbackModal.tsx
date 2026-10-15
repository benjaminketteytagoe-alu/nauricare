"use client";

import { useState } from "react";
import { MessageSquarePlus, X, Star, CheckCircle2 } from "lucide-react";
import { submitFeedback } from "@/actions/feedback";

const CATEGORIES = [
  { value: "GENERAL", label: "General Feedback" },
  { value: "BUG_REPORT", label: "Bug Report" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "PROVIDER_EXPERIENCE", label: "Provider Experience" },
  { value: "BILLING", label: "Billing" },
] as const;

const COMMENT_MAX = 2000;

/**
 * Self-contained feedback widget: renders its own trigger button and modal,
 * so callers just drop <UserFeedbackModal /> into a sidebar/header with no
 * state wiring, matching the NotificationBell pattern in this codebase.
 */
export function UserFeedbackModal({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("GENERAL");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setRating(0);
    setHoverRating(0);
    setCategory("GENERAL");
    setComment("");
    setError("");
    setSubmitted(false);
  }

  function handleClose() {
    setIsOpen(false);
    // Delay reset so the closing state doesn't flash empty before the modal unmounts.
    setTimeout(reset, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    if (!comment.trim()) {
      setError("Please share a few words of feedback.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const result = await submitFeedback({ rating, category, comment: comment.trim() });
    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={
          variant === "dark"
            ? "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-teal-100 hover:bg-teal-800/50 hover:text-white transition-colors"
            : "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        }
      >
        <MessageSquarePlus className="w-5 h-5" />
        Send Feedback
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-rose-100">
              <h2 className="text-xl font-bold text-slate-900">Share Your Feedback</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="p-6 text-center py-10 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-900">Thank you!</h3>
                <p className="text-sm text-gray-500">Your feedback helps us make NauriCare better.</p>
                <button onClick={handleClose} className="btn-brand rounded-xl px-6 py-2.5 text-sm font-bold mt-2">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50">
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">How would you rate your experience?</label>
                  <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                        className="p-1"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            (hoverRating || rating) >= star
                              ? "fill-rose-500 text-rose-500"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback-category" className="block text-sm font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="feedback-comment" className="block text-sm font-medium text-slate-700">
                      Tell us more
                    </label>
                    <span className={`text-xs ${comment.length > COMMENT_MAX ? "text-red-600" : "text-gray-400"}`}>
                      {comment.length}/{COMMENT_MAX}
                    </span>
                  </div>
                  <textarea
                    id="feedback-comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
                    placeholder="What's working well? What could be better?"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-brand rounded-xl py-3 text-sm font-bold disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
