import { Siren } from "lucide-react";
import { EMERGENCY_NUMBERS } from "@/lib/referrals/constants";

export function EmergencyBanner({ className = "" }: { className?: string }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border border-rose-200 bg-nc-berry-container p-4 text-nc-berry ${className}`}
    >
      <Siren className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold">If this is an emergency, do not wait for a referral.</p>
        <p>
          Call SAMU Rwanda on{" "}
          <a href="tel:912" className="font-bold underline underline-offset-2">
            {EMERGENCY_NUMBERS}
          </a>{" "}
          or go to the nearest emergency department now.
        </p>
      </div>
    </div>
  );
}
