import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Settings, User, Shield, Clock, Save } from "lucide-react";

export default async function ProviderSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "PROVIDER") {
    redirect("/login");
  }

  // Fetch practitioner data to pre-fill the settings form
  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Settings & Preferences
        </h1>
        <p className="text-slate-500 mt-1">Manage your professional profile and system configurations.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Settings Navigation Tabs (Visual only for now) */}
        <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
          <button className="flex items-center gap-2 px-6 py-4 text-sm font-bold text-blue-600 border-b-2 border-blue-600 bg-white">
            <User className="w-4 h-4" /> Professional Profile
          </button>
          <button className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <Clock className="w-4 h-4" /> Availability
          </button>
          <button className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <Shield className="w-4 h-4" /> Security
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  defaultValue={practitioner?.user?.name || ""}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Email</label>
                <input 
                  type="email" 
                  defaultValue={practitioner?.user?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Clinical Specialties</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Specialization Focus</label>
              <input 
                type="text" 
                defaultValue={practitioner?.specialty || "Gynecology"}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-2">This is what patients see when browsing the specialist directory.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
