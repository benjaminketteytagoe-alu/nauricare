"use client";

import { UserPlus, Search, X, Stethoscope, ArrowRight, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProviderProfile } from "../actions";

interface PractitionerProfile {
  specialty?: string;
  clinicName?: string;
  location?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

interface ProviderRow {
  id: string;
  name: string;
  email: string;
  isVerified?: boolean;
  practitionerProfile?: PractitionerProfile;
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

export default function AdminProvidersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Delete flow
  const [deleteTarget, setDeleteTarget] = useState<ProviderRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(next: ToastState) {
    setToast(next);
    setTimeout(() => setToast(null), 4000);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startDeleteTransition(async () => {
      const result = await deleteProviderProfile(target.id);
      if (result.success) {
        setProviders((prev) =>
          prev.map((p) =>
            p.id === target.id ? { ...p, practitionerProfile: { ...p.practitionerProfile, isActive: false } } : p,
          ),
        );
        showToast({ type: "success", message: "Provider successfully deleted" });
      } else {
        showToast({ type: "error", message: result.error || "Failed to delete provider" });
      }
      setDeleteTarget(null);
    });
  }

  const WOMEN_HEALTH_SPECIALTIES = [
    "Gynecologist",
    "Reproductive Endocrinologist",
    "Fertility Specialist",
    "Women's Health Nutritionist / Dietitian",
    "Pelvic Floor Physical Therapist",
    "Obstetrician",
    "Holistic Wellness Coach (PCOS/Fibroids)",
    "General Practice",
  ];

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    specialty: WOMEN_HEALTH_SPECIALTIES[0],
    location: "",
    clinicName: "",
  });

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/admin/providers");
      if (res.ok) setProviders((await res.json()) as ProviderRow[]);
    } catch {
      console.error("Failed to fetch providers");
    }
  };

  useEffect(() => {
    fetch("/api/admin/providers")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: ProviderRow[]) => setProviders(data))
      .catch(() => console.error("Failed to fetch providers"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          specialty: WOMEN_HEALTH_SPECIALTIES[0],
          location: "",
          clinicName: "",
        });
        await fetchProviders(); // Instantly refresh the table
        alert("Provider successfully onboarded!");
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch {
      alert("A network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter providers by Name, Email, or ID
  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Provider Management</h1>
          <p className="text-ink-muted mt-1">Onboard and manage healthcare practitioners.</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand hover:bg-brand-hover text-white flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Onboard Provider
        </Button>
      </div>

      {/* Roster Table */}
      <div className="bg-surface border border-hairline rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-hairline flex justify-between items-center bg-surface-muted/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-hairline rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-ink-muted uppercase bg-surface-muted border-b border-hairline">
              <tr>
                <th className="px-6 py-4 font-medium">Provider Name</th>
                <th className="px-6 py-4 font-medium">ID & Contact</th>
                <th className="px-6 py-4 font-medium">Specialty</th>
                <th className="px-6 py-4 font-medium">Clinic & Location</th>
                <th className="px-6 py-4 font-medium">Status</th> {/* Added */}
                <th className="px-6 py-4 font-medium text-right">Actions</th> {/* Added */}
              </tr>
            </thead>
            <tbody>
              {filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-muted">
                    {" "}
                    {/* Increased colSpan to 6 */}
                    <Stethoscope className="w-12 h-12 text-field mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-ink">No Providers Found</h3>
                    <p className="text-sm mt-1">Try adjusting your search query or onboard a new provider.</p>
                  </td>
                </tr>
              ) : (
                filteredProviders.map((provider) => (
                  <tr key={provider.id} className="border-b border-hairline hover:bg-surface-muted/50">
                    <td className="px-6 py-4 font-medium text-ink">{provider.name}</td>
                    <td className="px-6 py-4 text-ink-muted">
                      <div className="text-xs font-mono text-ink-muted mb-1">{provider.id.slice(0, 12)}...</div>
                      <div>{provider.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-soft text-brand-ink border border-brand-line">
                        {provider.practitionerProfile?.specialty || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink-soft">
                      <div className="font-medium text-ink">
                        {provider.practitionerProfile?.clinicName || "Independent"}
                      </div>
                      <div className="text-xs">{provider.practitionerProfile?.location || "N/A"}</div>
                    </td>
                    {/* Status reflects the real isVerified boolean — set by approveProviderProfile() on both User and PractitionerProfile */}
                    <td className="px-6 py-4">
                      {(() => {
                        const isDeleted = provider.practitionerProfile?.isActive === false;
                        const isVerified = provider.practitionerProfile?.isVerified || provider.isVerified;
                        if (isDeleted) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-ink-muted border border-hairline">
                              DELETED
                            </span>
                          );
                        }
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isVerified
                                ? "bg-success-soft text-success border border-success-line"
                                : "bg-warning-soft text-warning border border-warning-line"
                            }`}
                          >
                            {isVerified ? "APPROVED" : "PENDING"}
                          </span>
                        );
                      })()}
                    </td>
                    {/* Render action review anchor link + delete control */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/providers/${provider.id}`}
                          className="inline-flex items-center text-xs font-semibold text-brand-ink hover:text-brand-ink hover:underline gap-1"
                        >
                          Review <ArrowRight className="w-3 h-3" />
                        </Link>
                        {provider.practitionerProfile?.isActive !== false && (
                          <button
                            onClick={() => setDeleteTarget(provider)}
                            aria-label={`Delete ${provider.name}`}
                            className="inline-flex items-center text-xs font-semibold text-danger hover:text-danger hover:underline gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-hairline">
              <h2 className="text-xl font-bold text-ink">New Provider Profile</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-muted hover:text-ink-soft">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Temporary Password</label>
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Specialty</label>
                <select
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full p-2 border rounded-md bg-surface"
                >
                  {WOMEN_HEALTH_SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">Clinic Name</label>
                  <input
                    type="text"
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">City/Location</label>
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-brand hover:bg-brand-hover text-white">
                  {isLoading ? "Creating..." : "Save Provider"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-hairline">
              <h2 className="text-xl font-bold text-ink">Delete Provider</h2>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-ink-muted hover:text-ink-soft disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-ink-soft">
                Are you sure you want to delete <span className="font-semibold text-ink">{deleteTarget.name}</span>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-danger hover:bg-danger text-white flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Provider
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-success text-white" : "bg-danger text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
