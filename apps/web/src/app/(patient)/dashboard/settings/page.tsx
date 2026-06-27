"use client";

import { useState, useEffect } from "react";
import {
  Settings, Save, CheckCircle2, Target, Droplet,
  BellRing, User, Smartphone
} from "lucide-react";
import { AvatarUploader } from "@/components/AvatarUploader";

const AVAILABLE_GOALS = [
  { id: "PCOS", label: "PCOS Management", desc: "Tailor insights for Polycystic Ovary Syndrome." },
  { id: "Fibroids", label: "Uterine Fibroids", desc: "Focus on inflammation and natural management." },
  { id: "Endometriosis", label: "Endometriosis", desc: "Pain management and anti-inflammatory strategies." },
  { id: "General", label: "General Hormonal Health", desc: "Baseline wellness, cycle syncing, and energy." }
];

type TabId = 'goals' | 'cycle' | 'reminders' | 'account';

interface TabButtonProps {
  id: TabId;
  icon: React.ElementType;
  label: string;
  activeTab: TabId;
  onSelect: (id: TabId) => void;
}

function TabButton({ id, icon: Icon, label, activeTab, onSelect }: TabButtonProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
        activeTab === id ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

interface ToggleSwitchProps {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleSwitch({ label, desc, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-teal-500' : 'bg-gray-200'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('cycle');
  
  // Data States
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [cycleLength, setCycleLength] = useState("28");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [userData, setUserData] = useState({ name: "", email: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  
  // UI Only States (For Flo-app feel, can be wired to DB later)
  const [reminders, setReminders] = useState({ period: true, pills: true, articles: false });

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.healthGoals) setSelectedGoals(data.healthGoals);
        if (data.menstrualCycle) setCycleLength(data.menstrualCycle);
        if (data.emergencyContact) setEmergencyContact(data.emergencyContact);
        setUserData({ name: data.name, email: data.email });
        setAvatarUrl(data.avatarUrl ?? null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId]);
    setSaveMessage("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          healthGoals: selectedGoals,
          menstrualCycle: cycleLength,
          emergencyContact: emergencyContact
        }),
      });

      if (res.ok) setSaveMessage("Settings successfully updated!");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading your profile...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-teal-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-teal-600" />
          Settings & Profile
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          <TabButton id="cycle" icon={Droplet} label="My Cycle & Body" activeTab={activeTab} onSelect={setActiveTab} />
          <TabButton id="goals" icon={Target} label="Health Goals" activeTab={activeTab} onSelect={setActiveTab} />
          <TabButton id="reminders" icon={BellRing} label="Reminders" activeTab={activeTab} onSelect={setActiveTab} />
          <TabButton id="account" icon={User} label="Account Details" activeTab={activeTab} onSelect={setActiveTab} />
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* TAB 1: CYCLE BASELINES */}
          {activeTab === 'cycle' && (
            <div className="p-8 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Cycle Baselines</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Average Cycle Length (Days)</label>
                  <p className="text-xs text-gray-500 mb-3">This helps us accurately predict your ovulation and next period.</p>
                  <input 
                    type="number" 
                    value={cycleLength} 
                    onChange={(e) => setCycleLength(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HEALTH GOALS */}
          {activeTab === 'goals' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Personalized Focus</h2>
              <p className="text-sm text-gray-500 mb-6">Select the areas you want your dashboard to focus on.</p>
              <div className="grid grid-cols-1 gap-4">
                {AVAILABLE_GOALS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  return (
                    <div 
                      key={goal.id} onClick={() => toggleGoal(goal.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                        isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <h3 className={`font-bold ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>{goal.label}</h3>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-teal-700' : 'text-gray-500'}`}>{goal.desc}</p>
                      </div>
                      <div className={`mt-1 shrink-0 ${isSelected ? 'text-teal-500' : 'text-gray-300'}`}>
                        {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-200" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: REMINDERS (Flo-Style UX) */}
          {activeTab === 'reminders' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Push Notifications</h2>
              <div className="space-y-2">
                <ToggleSwitch 
                  label="Period Prediction" 
                  desc="Get notified a few days before your period starts." 
                  checked={reminders.period} 
                  onChange={() => setReminders({...reminders, period: !reminders.period})} 
                />
                <ToggleSwitch 
                  label="Daily Habit Reminders" 
                  desc="A gentle nudge to log your habits and symptoms." 
                  checked={reminders.pills} 
                  onChange={() => setReminders({...reminders, pills: !reminders.pills})} 
                />
                <ToggleSwitch 
                  label="Weekly Health Insights" 
                  desc="Receive customized articles and telehealth updates." 
                  checked={reminders.articles} 
                  onChange={() => setReminders({...reminders, articles: !reminders.articles})} 
                />
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNT DETAILS */}
          {activeTab === 'account' && (
            <div className="p-8 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Account & Security</h2>
              <div className="max-w-md pb-2 border-b border-gray-50">
                <AvatarUploader name={userData.name || "You"} avatarUrl={avatarUrl} onUploaded={setAvatarUrl} />
              </div>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 font-medium">{userData.name}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 font-medium">{userData.email}</div>
                </div>
                <div className="pt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2"><Smartphone className="w-4 h-4"/> Emergency Contact Phone</label>
                  <input 
                    type="text" 
                    placeholder="+250 788 000 000"
                    value={emergencyContact} 
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GLOBAL SAVE BAR */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              {saveMessage && <><CheckCircle2 className="w-4 h-4"/> {saveMessage}</>}
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-teal-900 hover:bg-teal-950 text-white px-8 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
