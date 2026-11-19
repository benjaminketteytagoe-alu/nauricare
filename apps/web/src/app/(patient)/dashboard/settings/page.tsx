"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BellRing, CheckCircle2, Droplet, Save, Settings, Smartphone, Target, User } from "lucide-react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { ReminderSettings } from "@/components/settings/ReminderSettings";
import { Callout } from "@/components/ui/callout";

const AVAILABLE_GOALS = [
  { id: "PCOS", label: "PCOS Management", desc: "Tailor insights for Polycystic Ovary Syndrome." },
  { id: "Fibroids", label: "Uterine Fibroids", desc: "Focus on inflammation and natural management." },
  { id: "Endometriosis", label: "Endometriosis", desc: "Pain management and anti-inflammatory strategies." },
  { id: "General", label: "General Hormonal Health", desc: "Baseline wellness, cycle syncing, and energy." },
];

const TABS = [
  { id: "cycle", label: "My Cycle & Body", icon: Droplet },
  { id: "goals", label: "Health Goals", icon: Target },
  { id: "reminders", label: "Reminders", icon: BellRing },
  { id: "account", label: "Account", icon: User },
] as const;
type TabId = (typeof TABS)[number]["id"];
const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v);

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-slate-500">Loading your settings…</p>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = useSearchParams().get("tab");
  const activeTab: TabId = isTab(tabParam) ? tabParam : "cycle";
  const selectTab = (id: TabId) => router.replace(`${pathname}?tab=${id}`, { scroll: false });

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [cycleLength, setCycleLength] = useState("28");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [userData, setUserData] = useState({ name: "", email: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [googlePhotoUrl, setGooglePhotoUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.healthGoals) setSelectedGoals(data.healthGoals);
        if (data.menstrualCycle) setCycleLength(String(data.menstrualCycle));
        if (data.emergencyContact) setEmergencyContact(data.emergencyContact);
        setUserData({ name: data.name, email: data.email });
        setAvatarUrl(data.avatarUrl ?? null);
        setGooglePhotoUrl(data.googlePhotoUrl ?? null);
      })
      .catch(() => setSaveError("We couldn't load your settings. Please refresh the page."))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) => (prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]));
    setSaveMessage("");
  };

  const handleSave = async () => {
    const length = Number(cycleLength);
    if (!Number.isInteger(length) || length < 15 || length > 60) {
      setSaveError("Average cycle length should be a whole number between 15 and 60 days.");
      return;
    }
    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ healthGoals: selectedGoals, menstrualCycle: length, emergencyContact }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Couldn't save your settings.");
      setSaveMessage("Settings saved");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save your settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <p className="py-12 text-center text-slate-500">Loading your settings…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <h1 className="flex items-center gap-3 text-2xl font-bold text-nc-ink sm:text-3xl">
        <Settings className="h-7 w-7 text-rose-600" aria-hidden /> Settings &amp; Profile
      </h1>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav aria-label="Settings sections" className="-mx-4 shrink-0 overflow-x-auto px-4 md:mx-0 md:w-60 md:px-0">
          <div role="tablist" aria-orientation="vertical" className="flex gap-2 md:flex-col">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => selectTab(id)}
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === id ? "bg-rose-50 text-rose-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="card-surface min-w-0 flex-1 overflow-hidden">
          <div className="p-5 sm:p-8">
            {activeTab === "cycle" && (
              <div className="max-w-md space-y-4">
                <h2 className="text-xl font-bold text-nc-ink">Cycle baselines</h2>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Average cycle length (days)</span>
                  <span className="mb-3 block text-xs text-slate-500">Used to predict your next period until you&apos;ve logged two or more periods.</span>
                  <input type="number" inputMode="numeric" min={15} max={60} value={cycleLength} onChange={(e) => setCycleLength(e.target.value)} className="m3-input" />
                </label>
              </div>
            )}

            {activeTab === "goals" && (
              <div>
                <h2 className="text-xl font-bold text-nc-ink">Personalised focus</h2>
                <p className="mb-6 mt-1 text-sm text-slate-500">Choose the areas you want your dashboard to focus on.</p>
                <div className="grid gap-3">
                  {AVAILABLE_GOALS.map((goal) => {
                    const isSelected = selectedGoals.includes(goal.id);
                    return (
                      <button
                        type="button"
                        key={goal.id}
                        aria-pressed={isSelected}
                        onClick={() => toggleGoal(goal.id)}
                        className={`flex items-center justify-between gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                          isSelected ? "border-rose-500 bg-rose-50" : "border-slate-100 hover:border-rose-200 hover:bg-slate-50"
                        }`}
                      >
                        <span>
                          <span className={`block font-bold ${isSelected ? "text-rose-900" : "text-nc-ink"}`}>{goal.label}</span>
                          <span className={`mt-0.5 block text-xs ${isSelected ? "text-rose-700" : "text-slate-500"}`}>{goal.desc}</span>
                        </span>
                        {isSelected ? <CheckCircle2 className="h-6 w-6 shrink-0 text-rose-500" aria-hidden /> : <span className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-200" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "reminders" && <ReminderSettings />}

            {activeTab === "account" && (
              <div className="max-w-xl space-y-6">
                <h2 className="text-xl font-bold text-nc-ink">Account &amp; security</h2>
                <div className="border-b border-slate-100 pb-6">
                  <AvatarPicker name={userData.name || "You"} avatarUrl={avatarUrl} googlePhotoUrl={googlePhotoUrl} onChange={setAvatarUrl} />
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Full name</dt>
                    <dd className="break-words rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 font-medium text-nc-ink">{userData.name}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Email address</dt>
                    <dd className="break-all rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 font-medium text-nc-ink">{userData.email}</dd>
                  </div>
                </dl>
                <label className="block">
                  <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Smartphone className="h-4 w-4" aria-hidden /> Emergency contact phone</span>
                  <input type="tel" placeholder="+250 788 000 000" maxLength={200} value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="m3-input" />
                </label>
                <DeleteAccount />
              </div>
            )}
          </div>

          {activeTab !== "reminders" && (
            <div className="flex flex-col-reverse gap-3 border-t border-rose-100 bg-rose-50/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <span role="status" aria-live="polite" className="text-sm font-medium">
                {saveMessage && <span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> {saveMessage}</span>}
              </span>
              <button onClick={handleSave} disabled={isSaving} className="m3-btn-filled w-full sm:w-auto">
                <Save className="h-4 w-4" aria-hidden /> {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
          {saveError && activeTab !== "reminders" && <div className="px-4 pb-4 sm:px-6"><Callout tone="danger" role="alert">{saveError}</Callout></div>}
        </div>
      </div>
    </div>
  );
}
