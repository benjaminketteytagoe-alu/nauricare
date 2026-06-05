"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, X, Stethoscope } from "lucide-react";

export default function AdminProvidersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const WOMEN_HEALTH_SPECIALTIES = [
    "Gynecologist",
    "Reproductive Endocrinologist",
    "Fertility Specialist",
    "Women's Health Nutritionist / Dietitian",
    "Pelvic Floor Physical Therapist",
    "Obstetrician",
    "Holistic Wellness Coach (PCOS/Fibroids)",
    "General Practice"
  ];

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    specialty: WOMEN_HEALTH_SPECIALTIES[0],
    location: "",
    clinicName: ""
  });

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/admin/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (err) {
      console.error("Failed to fetch providers");
    }
  };

  useEffect(() => {
    fetchProviders();
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
        setFormData({ name: "", email: "", password: "", specialty: WOMEN_HEALTH_SPECIALTIES[0], location: "", clinicName: "" });
        await fetchProviders(); // Instantly refresh the table
        alert("Provider successfully onboarded!");
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      alert("A network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter providers by Name, Email, or ID
  const filteredProviders = providers.filter(provider => 
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    provider.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Provider Management</h1>
          <p className="text-gray-500 mt-1">Onboard and manage healthcare practitioners.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Onboard Provider
        </Button>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Provider Name</th>
                <th className="px-6 py-4 font-medium">ID & Contact</th>
                <th className="px-6 py-4 font-medium">Specialty</th>
                <th className="px-6 py-4 font-medium">Clinic & Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No Providers Found</h3>
                    <p className="text-sm mt-1">Try adjusting your search query or onboard a new provider.</p>
                  </td>
                </tr>
              ) : (
                filteredProviders.map(provider => (
                  <tr key={provider.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{provider.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="text-xs font-mono text-gray-400 mb-1">{provider.id.slice(0, 12)}...</div>
                      <div>{provider.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        {provider.practitionerProfile?.specialty || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="font-medium text-gray-900">{provider.practitionerProfile?.clinicName || "Independent"}</div>
                      <div className="text-xs">{provider.practitionerProfile?.location || "N/A"}</div>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">New Provider Profile</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <select 
                  required 
                  value={formData.specialty} 
                  onChange={(e) => setFormData({...formData, specialty: e.target.value})} 
                  className="w-full p-2 border rounded-md bg-white"
                >
                  {WOMEN_HEALTH_SPECIALTIES.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
                  <input type="text" value={formData.clinicName} onChange={(e) => setFormData({...formData, clinicName: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City/Location</label>
                  <input required type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                  {isLoading ? "Creating..." : "Save Provider"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
