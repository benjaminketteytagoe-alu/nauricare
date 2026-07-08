"use client";

import { useState, useTransition } from "react";
import { User, Shield, Clock, Save, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  updateProviderProfile,
  updateSecuritySettings,
  upsertAvailabilitySlot,
} from "@/actions/providerSettings";

type Tab = "profile" | "availability" | "security";

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Profile {
  name: string;
  email: string;
  specialty: string;
  bio: string;
  clinicName: string;
  licenseNumber: string;
  hospitalAffiliation: string;
  secondaryEmail: string;
}

function useFormState() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function flash(msg: string, kind: "success" | "error") {
    if (kind === "success") {
      setSuccess(msg);
      setError("");
      setTimeout(() => setSuccess(""), 4000);
    } else {
      setError(msg);
      setSuccess("");
    }
  }

  return { error, success, isPending, startTransition, flash };
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ initial }: { initial: Profile }) {
  const [form, setForm] = useState(initial);
  const { error, success, isPending, startTransition, flash } = useFormState();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProviderProfile({
        name: form.name,
        specialty: form.specialty,
        bio: form.bio,
        clinicName: form.clinicName,
        licenseNumber: form.licenseNumber,
        hospitalAffiliation: form.hospitalAffiliation,
      });
      res.success ? flash("Profile updated successfully.", "success") : flash(res.error ?? "Failed.", "error");
    });
  }

  const field = (label: string, key: keyof Profile, type = "text", disabled = false) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        disabled={disabled}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "bg-slate-50 border-slate-200"
        }`}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {field("Full Name", "name")}
          {field("Primary Email", "email", "email", true)}
          {field("Secondary / Notification Email", "secondaryEmail", "email")}
        </div>
      </div>

      <hr className="border-slate-100" />

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Clinical Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {field("Specialization", "specialty")}
          {field("Clinic / Hospital Name", "clinicName")}
          {field("License Number", "licenseNumber")}
          {field("Hospital Affiliation", "hospitalAffiliation")}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Professional Bio <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Briefly describe your experience, approach, and areas of focus…"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </form>
  );
}

// ─── Availability Tab ─────────────────────────────────────────────────────────

const DEFAULT_SLOTS = [
  { startTime: "08:00", endTime: "09:00" },
  { startTime: "09:00", endTime: "10:00" },
  { startTime: "10:00", endTime: "11:00" },
  { startTime: "11:00", endTime: "12:00" },
  { startTime: "14:00", endTime: "15:00" },
  { startTime: "15:00", endTime: "16:00" },
  { startTime: "16:00", endTime: "17:00" },
];

function AvailabilityTab({ initial }: { initial: AvailabilitySlot[] }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initial);
  const [newDate, setNewDate] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  function slotKey(date: string, start: string, end: string) {
    return `${date}__${start}__${end}`;
  }

  const slotMap = new Map(slots.map((s) => [slotKey(s.date, s.startTime, s.endTime), s]));

  function handleToggle(date: string, start: string, end: string) {
    const key = slotKey(date, start, end);
    const existing = slotMap.get(key);
    const nextAvailable = existing ? !existing.isAvailable : false;
    const tempId = existing?.id ?? key;

    setPendingId(tempId);
    startTransition(async () => {
      const res = await upsertAvailabilitySlot({ date, startTime: start, endTime: end, isAvailable: nextAvailable });
      if (res.success) {
        setSlots((prev) => {
          const idx = prev.findIndex((s) => s.date === date && s.startTime === start && s.endTime === end);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], isAvailable: nextAvailable };
            return next;
          }
          return [...prev, { id: key, date, startTime: start, endTime: end, isAvailable: nextAvailable }];
        });
        setMsg("");
      } else {
        setMsg(res.error ?? "Failed to update slot.");
      }
      setPendingId(null);
    });
  }

  function handleAddDate() {
    if (!newDate || slots.some((s) => s.date === newDate)) return;
    const newSlots: AvailabilitySlot[] = DEFAULT_SLOTS.map((t) => ({
      id: slotKey(newDate, t.startTime, t.endTime),
      date: newDate,
      startTime: t.startTime,
      endTime: t.endTime,
      isAvailable: true,
    }));
    startTransition(async () => {
      await Promise.all(
        DEFAULT_SLOTS.map((t) =>
          upsertAvailabilitySlot({ date: newDate, startTime: t.startTime, endTime: t.endTime, isAvailable: true }),
        ),
      );
      setSlots((prev) => {
        const existing = new Set(prev.map((s) => slotKey(s.date, s.startTime, s.endTime)));
        return [...prev, ...newSlots.filter((s) => !existing.has(slotKey(s.date, s.startTime, s.endTime)))];
      });
      setNewDate("");
    });
  }

  const dates = [...new Set(slots.map((s) => s.date))].sort();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Availability Slots</h3>
        <p className="text-sm text-slate-500 mt-1">
          Toggle individual hour slots on/off. Patients see your available slots when booking.
        </p>
      </div>

      {/* Add new date */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button
          onClick={handleAddDate}
          disabled={!newDate || isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Date
        </button>
      </div>

      {msg && <p className="text-sm text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {msg}</p>}

      {dates.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No availability dates added yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => {
            const daySlots = slots
              .filter((s) => s.date === date)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div key={date} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800">
                    {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() => setSlots((prev) => prev.filter((s) => s.date !== date))}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                    title="Remove this date"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {daySlots.map((slot) => {
                    const isBusy = pendingId === slot.id && isPending;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => handleToggle(slot.date, slot.startTime, slot.endTime)}
                        disabled={isBusy}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                          slot.isAvailable
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {slot.startTime}–{slot.endTime}
                        <span className="block text-[10px] mt-0.5 font-normal">
                          {isBusy ? "…" : slot.isAvailable ? "Available" : "Blocked"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({ initialSecondaryEmail }: { initialSecondaryEmail: string }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    secondaryEmail: initialSecondaryEmail,
  });
  const { error, success, isPending, startTransition, flash } = useFormState();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      flash("New passwords do not match.", "error");
      return;
    }
    if (form.newPassword.length < 8) {
      flash("New password must be at least 8 characters.", "error");
      return;
    }
    startTransition(async () => {
      const res = await updateSecuritySettings({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        secondaryEmail: form.secondaryEmail,
      });
      if (res.success) {
        flash("Security settings updated.", "success");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "", secondaryEmail: form.secondaryEmail });
      } else {
        flash(res.error ?? "Failed.", "error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl">
          {(
            [
              { label: "Current Password", key: "currentPassword" },
              { label: "New Password", key: "newPassword" },
              { label: "Confirm New Password", key: "confirmPassword" },
            ] as { label: string; key: keyof typeof form }[]
          ).map(({ label, key }) => (
            <div key={key} className={key === "currentPassword" ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
              <input
                type="password"
                required
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      <hr className="border-slate-100" />

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Secondary Email</h3>
        <p className="text-sm text-slate-500">
          Receive appointment alerts and platform notifications to an additional address.
        </p>
        <div className="max-w-sm">
          <input
            type="email"
            value={form.secondaryEmail}
            onChange={(e) => setForm({ ...form, secondaryEmail: e.target.value })}
            placeholder="e.g. alerts@yourhospital.org"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving…" : "Update Security Settings"}
        </button>
      </div>
    </form>
  );
}

// ─── Root Client Component ────────────────────────────────────────────────────

export default function ProviderSettingsClient({
  profile,
  availabilitySlots,
}: {
  profile: Profile;
  availabilitySlots: AvailabilitySlot[];
}) {
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Professional Profile", icon: <User className="w-4 h-4" /> },
    { id: "availability", label: "Availability", icon: <Clock className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium shrink-0 transition-colors ${
              tab === t.id
                ? "text-blue-600 border-b-2 border-blue-600 bg-white font-bold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab initial={profile} />}
      {tab === "availability" && <AvailabilityTab initial={availabilitySlots} />}
      {tab === "security" && <SecurityTab initialSecondaryEmail={profile.secondaryEmail} />}
    </div>
  );
}
