"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Store, Plus, Search, X, MapPin, Phone } from "lucide-react";

interface Pharmacy {
  id: string;
  name: string;
  location: string;
  contactInfo?: string;
  tags: string[];
}

export default function AdminPharmaciesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    contactInfo: "",
    tagsString: ""
  });

  const fetchPharmacies = async () => {
    try {
      const res = await fetch("/api/admin/pharmacies");
      if (res.ok) setPharmacies(await res.json() as Pharmacy[]);
    } catch {
      console.error("Failed to fetch pharmacies");
    }
  };

  useEffect(() => {
    fetch("/api/admin/pharmacies")
      .then(res => res.ok ? res.json() : Promise.reject(new Error()))
      .then((data: Pharmacy[]) => setPharmacies(data))
      .catch(() => console.error("Failed to fetch pharmacies"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Convert the comma-separated string into an array of tags
    const formattedTags = formData.tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      const res = await fetch("/api/admin/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          contactInfo: formData.contactInfo,
          tags: formattedTags
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: "", location: "", contactInfo: "", tagsString: "" });
        await fetchPharmacies();
        alert("Pharmacy successfully added!");
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

  // Filter by name, location, or tags
  const filteredPharmacies = pharmacies.filter(pharmacy => 
    pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    pharmacy.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Pharmacies</h1>
          <p className="text-gray-500 mt-1">Manage network pharmacies and medical suppliers.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Pharmacy
        </Button>
      </div>

      {/* Pharmacy Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, location, or tag..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">Pharmacy Name</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Specialty Tags</th>
              </tr>
            </thead>
            <tbody>
              {filteredPharmacies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No Pharmacies Found</h3>
                    <p className="text-sm mt-1">Try a different search or add a new partner pharmacy.</p>
                  </td>
                </tr>
              ) : (
                filteredPharmacies.map(pharmacy => (
                  <tr key={pharmacy.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{pharmacy.name}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {pharmacy.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {pharmacy.contactInfo ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {pharmacy.contactInfo}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {pharmacy.tags && pharmacy.tags.length > 0 ? (
                          pharmacy.tags.map((tag: string, index: number) => (
                            <span key={index} className="px-2 py-1 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wide">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs italic">No tags</span>
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

      {/* Add Pharmacy Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add Partner Pharmacy</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Name</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Location</label>
                <input required type="text" placeholder="e.g. Kigali Heights, Ground Floor" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone/Email</label>
                <input type="text" placeholder="Optional" value={formData.contactInfo} onChange={(e) => setFormData({...formData, contactInfo: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty Tags</label>
                <input 
                  type="text" 
                  placeholder="e.g. PCOS Meds, Supplements, 24/7" 
                  value={formData.tagsString} 
                  onChange={(e) => setFormData({...formData, tagsString: e.target.value})} 
                  className="w-full p-2 border rounded-md" 
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple tags with a comma.</p>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isLoading ? "Saving..." : "Add Pharmacy"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
