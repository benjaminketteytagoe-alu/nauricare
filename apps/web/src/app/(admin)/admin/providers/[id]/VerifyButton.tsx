"use client"

import { useTransition } from "react";
import { approveProviderProfile } from "../../actions";

export function VerifyButton({ providerId }: { providerId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleVerify = () => {
    startTransition(async () => {
      const result = await approveProviderProfile(providerId);
      
      if (result.success) {
        alert("Provider successfully verified! Audit ledger updated.");
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  return (
    <button 
      onClick={handleVerify} 
      disabled={isPending}
      className="bg-emerald-600 text-white px-4 py-2 rounded-md disabled:bg-slate-400"
    >
      {isPending ? "Verifying..." : "Approve Professional License"}
    </button>
  );
}
