import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { DeleteProviderButton } from "./DeleteProviderButton";
import { VerifyButton } from "./VerifyButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderDetailPage({ params }: PageProps) {
  await requireRole("ADMIN");

  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Query the User directly using the ID from the URL path
  const providerUser = await prisma.user.findUnique({
    where: { id },
    include: {
      practitionerProfile: true,
    },
  });

  // Safe check fallback validation
  if (!providerUser || providerUser.role !== "PROVIDER") {
    notFound();
  }

  const profile = providerUser.practitionerProfile;
  const isVerified = profile?.isVerified || providerUser.isVerified;
  const isDeleted = profile?.isActive === false;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header View */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Provider Verification Portal</h1>
        <p className="text-sm text-ink-muted">Review credential submissions for regulatory compliance validation.</p>
      </div>

      {/* Information Layout Card */}
      <div className="bg-surface border rounded-lg p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Professional Credentials</h2>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="font-medium text-ink-muted block uppercase tracking-wider text-xs">Full Name</span>
            <span className="text-ink text-base font-medium">{providerUser.name || "Unspecified User Name"}</span>
          </div>
          <div>
            <span className="font-medium text-ink-muted block uppercase tracking-wider text-xs">Email Address</span>
            <span className="text-ink text-base">{providerUser.email}</span>
          </div>
          <div>
            <span className="font-medium text-ink-muted block uppercase tracking-wider text-xs">Medical Specialty</span>
            <span className="text-ink text-base">{profile?.specialty || "General Practice"}</span>
          </div>
          <div>
            <span className="font-medium text-ink-muted block uppercase tracking-wider text-xs">Clinic & Location</span>
            <span className="text-ink text-base">
              {profile?.clinicName || "Independent"} — {profile?.location || "N/A"}
            </span>
          </div>
          <div>
            <span className="font-medium text-ink-muted block uppercase tracking-wider text-xs">
              Verification Status
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${
                isVerified
                  ? "bg-success-soft text-success border border-success-line"
                  : "bg-warning-soft text-warning border border-warning-line"
              }`}
            >
              {isVerified ? "APPROVED" : "PENDING VERIFICATION"}
            </span>
          </div>
          <div>
            <span className="font-medium text-ink-muted block uppercase tracking-wider text-xs">Account Status</span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${
                isDeleted
                  ? "bg-surface-muted text-ink-muted border border-hairline"
                  : "bg-success-soft text-success border border-success-line"
              }`}
            >
              {isDeleted ? "DELETED" : "ACTIVE"}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Action Controls */}
      {(!isVerified || !isDeleted) && (
        <div className="flex justify-end items-center gap-3 pt-4 border-t">
          {!isVerified && <VerifyButton providerId={providerUser.id} />}
          {!isDeleted && <DeleteProviderButton providerId={providerUser.id} providerName={providerUser.name} />}
        </div>
      )}
    </div>
  );
}
