import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { VerifyButton } from "./VerifyButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header View */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Provider Verification Portal
        </h1>
        <p className="text-sm text-slate-500">
          Review credential submissions for regulatory compliance validation.
        </p>
      </div>

      {/* Information Layout Card */}
      <div className="bg-white border rounded-lg p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Professional Credentials</h2>
        
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <span className="font-medium text-slate-400 block uppercase tracking-wider text-xs">Full Name</span>
            <span className="text-slate-900 text-base font-medium">{providerUser.name || "Unspecified User Name"}</span>
          </div>
          <div>
            <span className="font-medium text-slate-400 block uppercase tracking-wider text-xs">Email Address</span>
            <span className="text-slate-900 text-base">{providerUser.email}</span>
          </div>
          <div>
            <span className="font-medium text-slate-400 block uppercase tracking-wider text-xs">Medical Specialty</span>
            <span className="text-slate-900 text-base">{profile?.specialty || "General Practice"}</span>
          </div>
          <div>
            <span className="font-medium text-slate-400 block uppercase tracking-wider text-xs">Clinic & Location</span>
            <span className="text-slate-900 text-base">
              {profile?.clinicName || "Independent"} — {profile?.location || "N/A"}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-400 block uppercase tracking-wider text-xs">Verification Status</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${
              isVerified 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {isVerified ? "APPROVED" : "PENDING VERIFICATION"}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Action Controls */}
      {!isVerified && (
        <div className="flex justify-end pt-4 border-t">
          <VerifyButton providerId={providerUser.id} adminId={providerUser.id} />
        </div>
      )}
    </div>
  );
}
