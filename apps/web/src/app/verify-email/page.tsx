import Link from "next/link";
import { createHash } from "crypto";
import { CheckCircle2, XCircle, Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ResendVerificationForm } from "./ResendVerificationForm";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / brand strip */}
        <div className="text-center mb-8">
          <span className="text-2xl font-extrabold text-teal-700 tracking-tight">NauriCare</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Success card ─────────────────────────────────────────────────────────────

function SuccessCard() {
  return (
    <PageShell>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Email Verified!</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Your NauriCare account is now active. You can log in and start managing your health.
          </p>
        </div>
        <Link
          href="/login"
          className="w-full inline-block text-center h-11 leading-[2.75rem] bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          Log In to Your Account
        </Link>
      </div>
    </PageShell>
  );
}

// ─── Error card ───────────────────────────────────────────────────────────────

type ErrorReason = "missing" | "invalid" | "expired";

const ERROR_COPY: Record<ErrorReason, { title: string; body: string }> = {
  missing: {
    title: "No verification token",
    body: "The link you followed is incomplete. Use the button below to request a fresh verification email.",
  },
  invalid: {
    title: "Link already used or invalid",
    body: "This link has already been used or doesn't match any pending verification. Request a new one below.",
  },
  expired: {
    title: "Link expired",
    body: "Your verification link is more than 24 hours old and has expired. Request a new one below — it's free and instant.",
  },
};

function ErrorCard({ reason }: { reason: ErrorReason }) {
  const { title, body } = ERROR_COPY[reason];

  return (
    <PageShell>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <XCircle className="w-9 h-9 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">{body}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Mail className="w-4 h-4 text-teal-600 shrink-0" />
          Resend verification email
        </div>
        <ResendVerificationForm />
      </div>

      <p className="text-center text-xs text-gray-400">
        Already verified?{" "}
        <Link href="/login" className="text-teal-600 hover:underline font-medium">
          Log in
        </Link>
      </p>
    </PageShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorCard reason="missing" />;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return <ErrorCard reason="invalid" />;
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { tokenHash } });
    return <ErrorCard reason="expired" />;
  }

  // Valid — mark verified and consume token atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    }),
    prisma.emailVerificationToken.delete({ where: { tokenHash } }),
  ]);

  return <SuccessCard />;
}
