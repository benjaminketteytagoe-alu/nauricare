import { Siren } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { EMERGENCY_NUMBERS } from "@/lib/site";

export function EmergencyBanner({ className = "" }: { className?: string }) {
  return (
    <Callout tone="danger" icon={Siren} role="alert" title="If this is an emergency, do not wait for a referral." className={className}>
      <p>
        Call SAMU Rwanda on{" "}
        <a href="tel:912" className="font-bold underline underline-offset-2">
          {EMERGENCY_NUMBERS}
        </a>{" "}
        or go to the nearest emergency department now.
      </p>
    </Callout>
  );
}
