"use client";

import { Store, Plus, Search, X, MapPin, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  contactEmail?: string;
  tags: string[];
}

export default function PharmacyManagementClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactEmail: "",
    tagsString: "",
  });

  const fetchPharmacies = () => {
    fetch("/api/admin/pharmacies")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: Pharmacy[]) => setPharmacies(data))
      .catch(() => console.error("Failed to fetch pharmacies"));
  };

  useEffect(() => {
    fetch("/api/admin/pharmacies")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: Pharmacy[]) => setPharmacies(data))
      .catch(() => console.error("Failed to fetch pharmacies"));
  }, []);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setIsLoading(true);

    const tags = formData.tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const res = await fetch("/api/admin/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          contactEmail: formData.contactEmail,
          tags,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: "", address: "", contactEmail: "", tagsString: "" });
        fetchPharmacies();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch {
      alert("A network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = pharmacies.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-ink">Manage Partner Pharmacies</h2>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-lavender hover:bg-lavender text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Pharmacy
        </Button>
      </div>

      <div className="bg-surface border border-hairline rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-hairline bg-surface-muted/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name, address, or tag…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-hairline rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-ink-muted uppercase bg-surface-muted border-b border-hairline">
              <tr>
                <th className="px-6 py-4 font-medium">Pharmacy Name</th>
                <th className="px-6 py-4 font-medium">Address</th>
                <th className="px-6 py-4 font-medium">Contact Email</th>
                <th className="px-6 py-4 font-medium">Specialty Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-ink-muted">
                    <Store className="w-12 h-12 text-field mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-ink">No Pharmacies Found</h3>
                    <p className="text-sm mt-1">Try a different search or add a new partner pharmacy.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((pharmacy) => (
                  <tr key={pharmacy.id} className="border-b border-hairline hover:bg-surface-muted/50">
                    <td className="px-6 py-4 font-medium text-ink">{pharmacy.name}</td>
                    <td className="px-6 py-4 text-ink-soft">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                        {pharmacy.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink-soft">
                      {pharmacy.contactEmail ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                          {pharmacy.contactEmail}
                        </div>
                      ) : (
                        <span className="text-ink-muted italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {pharmacy.tags.length > 0 ? (
                          pharmacy.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-lavender-soft text-lavender border border-lavender-line uppercase tracking-wide"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-ink-muted text-xs italic">No tags</span>
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

      {/* Add Pharmacy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-hairline">
              <h2 className="text-xl font-bold text-ink">Add Partner Pharmacy</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-muted hover:text-ink-soft">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Pharmacy Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Physical Address</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Kigali Heights, Ground Floor"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="Optional"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Specialty Tags</label>
                <input
                  type="text"
                  placeholder="e.g. PCOS Meds, Supplements, 24/7"
                  value={formData.tagsString}
                  onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-ink-muted mt-1">Separate multiple tags with a comma.</p>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-lavender hover:bg-lavender text-white">
                  {isLoading ? "Saving…" : "Add Pharmacy"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
