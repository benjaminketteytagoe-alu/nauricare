"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BadgeCheck, CalendarPlus, List, LocateFixed, Map as MapIcon, MapPin, MessageSquare, Search, ShieldAlert, Stethoscope } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BookingDialog } from "@/components/providers/BookingDialog";
import { Callout } from "@/components/ui/callout";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo/distance";
import { doctorName } from "@/lib/format";

const ProviderMap = dynamic(() => import("@/components/providers/ProviderMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">Loading map…</div>,
});

interface ProviderListing {
  id: string;
  specialty: string;
  clinicName: string;
  location: string | null;
  bio: string | null;
  yearsExperience: number | null;
  latitude: number | null;
  longitude: number | null;
  online: boolean;
  user: { id: string; name: string; avatarUrl: string | null };
}

type View = "list" | "map";

export default function ProvidersDirectoryPage() {
  const [providers, setProviders] = useState<ProviderListing[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booking, setBooking] = useState<ProviderListing | null>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data)) throw new Error("We couldn't load the specialist directory. Please refresh.");
        setProviders(data);
      })
      .catch((e: Error) => {
        setLoadError(e.message);
        setProviders([]);
      });
  }, []);

  function locate() {
    if (!("geolocation" in navigator)) return setGeoError("Your browser can't share your location.");
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setGeoError(err.code === err.PERMISSION_DENIED ? "Location permission was denied. You can still browse the map." : "We couldn't get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (providers ?? [])
      .filter((p) => !q || [p.user.name, p.specialty, p.clinicName, p.location ?? ""].some((v) => v.toLowerCase().includes(q)))
      .map((p) => {
        const pos = p.latitude != null && p.longitude != null ? { lat: p.latitude, lng: p.longitude } : null;
        return { ...p, pos, km: me && pos ? distanceKm(me, pos) : null };
      });
    // Nearest first when we know where you are; online providers first otherwise.
    return rows.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || Number(b.online) - Number(a.online));
  }, [providers, query, me]);

  const mapped = listed.filter((p) => p.pos);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-nc-ink sm:text-3xl"><Stethoscope className="h-7 w-7 text-rose-600" aria-hidden /> Find a specialist</h1>
        <p className="mt-1 text-slate-600">Verified gynaecologists and women&apos;s health specialists. Book a video consultation or send a message.</p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search specialists</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, specialty, clinic or area" className="m3-input pl-10" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={locate} disabled={locating} className="m3-btn-outlined flex-1 md:flex-none">
            <LocateFixed className="h-4 w-4" aria-hidden /> {locating ? "Locating…" : me ? "Location on" : "Near me"}
          </button>
          <div role="tablist" aria-label="View" className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(["list", "map"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${view === v ? "bg-nc-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {v === "list" ? <List className="h-4 w-4" aria-hidden /> : <MapIcon className="h-4 w-4" aria-hidden />} {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {geoError && <Callout tone="warning" role="status">{geoError}</Callout>}
      {loadError && <Callout tone="danger" role="alert">{loadError}</Callout>}

      {providers === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-white" />)}
        </div>
      ) : listed.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-slate-300" aria-hidden />
          <h2 className="text-lg font-bold text-nc-ink">{query ? "No specialists match your search" : "No specialists available yet"}</h2>
          <p className="mt-1 text-slate-600">{query ? "Try another name, specialty or area." : "Please check back soon."}</p>
        </div>
      ) : (
        <div className={view === "map" ? "grid gap-4 lg:grid-cols-[1.4fr_1fr]" : ""}>
          {view === "map" && (
            <div className="relative isolate h-[55dvh] min-h-[320px] overflow-hidden rounded-3xl border border-slate-200 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100dvh-12rem)]">
              <ProviderMap
                providers={mapped.map((p) => ({ id: p.id, name: doctorName(p.user.name), specialty: p.specialty, clinic: p.clinicName, position: p.pos!, distanceLabel: p.km != null ? formatDistance(p.km) : undefined }))}
                me={me}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  document.getElementById(`provider-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
              />
              {mapped.length < listed.length && (
                <p className="absolute bottom-2 left-2 z-[400] rounded-full bg-white/95 px-3 py-1 text-xs text-slate-600 shadow">{listed.length - mapped.length} without a mapped location</p>
              )}
            </div>
          )}
          <ul className={view === "map" ? "space-y-3 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto lg:pr-1" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
            {listed.map((p) => (
              <li key={p.id} id={`provider-${p.id}`} className={`card-surface flex flex-col p-5 transition-shadow hover:shadow-md ${selectedId === p.id ? "ring-2 ring-nc-primary" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="relative shrink-0">
                    <Avatar name={p.user.name} avatarUrl={p.user.avatarUrl} size="lg" />
                    {p.online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" aria-label="Online now" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-bold text-nc-ink"><span className="truncate">{doctorName(p.user.name)}</span><BadgeCheck className="h-4 w-4 shrink-0 text-nc-primary" aria-label="Verified" /></p>
                    <p className="text-sm font-medium text-rose-600">{p.specialty}</p>
                    <p className="mt-1 flex items-start gap-1 text-xs text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span>{[p.clinicName, p.location].filter(Boolean).join(" · ")}</span></p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {p.yearsExperience != null && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{p.yearsExperience} years&apos; experience</span>}
                  {p.km != null && <span className="rounded-full bg-nc-primary-container px-2.5 py-1 font-medium text-nc-primary">{formatDistance(p.km)}</span>}
                  {p.online && <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">Online now</span>}
                </div>
                {p.bio && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{p.bio}</p>}
                <div className="mt-auto flex gap-2 pt-4">
                  <button type="button" onClick={() => setBooking(p)} className="m3-btn-filled flex-1 px-4"><CalendarPlus className="h-4 w-4" aria-hidden /> Book</button>
                  <Link href={`/dashboard/messages?with=${p.user.id}`} className="m3-btn-outlined flex-1 px-4"><MessageSquare className="h-4 w-4" aria-hidden /> Message</Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {booking && <BookingDialog provider={{ id: booking.id, name: doctorName(booking.user.name) }} onClose={() => setBooking(null)} />}
    </div>
  );
}
