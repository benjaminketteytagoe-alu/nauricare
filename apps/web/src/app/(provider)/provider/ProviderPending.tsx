"use client";

import { Clock, LogOut, Mail } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { SUPPORT_EMAIL } from "@/lib/site";

/** Shown instead of the clinical portal until an admin approves the provider. */
export function ProviderPending() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-card border border-hairline bg-surface p-8 shadow-card sm:p-10">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
          <Clock className="size-6" aria-hidden />
        </span>
        <div className="space-y-2">
          <p className="text-eyebrow text-ink-muted">Clinical portal</p>
          <h1 className="font-display text-display-md text-ink">We&apos;re verifying your account</h1>
          <p className="text-ink-soft">
            A NauriCare administrator checks every provider&apos;s credentials before they can see patients. Once your
            account is approved, this page opens your clinical portal.
          </p>
        </div>
        <Callout tone="info" icon={Mail} title="Need to send documents or ask a question?">
          Email{" "}
          <a className="font-medium text-brand-ink underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from the address you signed up with.
        </Callout>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </main>
  );
}
