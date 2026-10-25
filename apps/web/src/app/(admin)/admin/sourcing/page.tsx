import type { Metadata } from "next";
import { SourcingConsole } from "@/components/sourcing/SourcingConsole";

export const metadata: Metadata = { title: "Provider Sourcing" };

export default function ProviderSourcingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Provider sourcing</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Find gynaecologists listed on hospital and clinic websites in Kigali, review what was found, and invite them.
          Doctors are only shown to patients after they accept the invitation, or after you record consent you obtained
          directly.
        </p>
      </header>
      <SourcingConsole />
    </div>
  );
}
