import { prisma } from "@/lib/prisma";
import { SUPPORT_EMAIL } from "@/lib/site";
import { safeGet } from "@/server/net/safeFetch";
import type { LatLng } from "@/lib/geo/distance";

// Address -> coordinates via OpenStreetMap Nominatim (free; usage policy:
// max 1 request/second, identifying User-Agent, cache results). Results are
// stored on the provider/hospital row, so each address is looked up once.

const MIN_INTERVAL_MS = 1100;
let nextSlot = 0;
const memo = new Map<string, LatLng | null>();

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

/** Geocodes a free-text place in Rwanda. Null if not found or the service fails. */
export async function geocode(query: string): Promise<LatLng | null> {
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 3) return null;
  const key = q.toLowerCase();
  if (memo.has(key)) return memo.get(key)!;
  await throttle();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=rw&q=${encodeURIComponent(q)}`;
    const res = await safeGet(url, { accept: "application/json", timeoutMs: 10_000, maxBytes: 200_000, userAgent: `NauriCare/1.0 (${SUPPORT_EMAIL})` });
    if (res.status !== 200) return null;
    const [hit] = JSON.parse(res.body.toString("utf8")) as { lat: string; lon: string }[];
    const result = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
    memo.set(key, result);
    return result;
  } catch (e) {
    console.error("[GEOCODE]", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Best-effort coordinates for a practice from its location and clinic name. */
export async function geocodePractice(location: string | null | undefined, clinic: string | null | undefined): Promise<LatLng | null> {
  for (const q of [location && clinic ? `${clinic}, ${location}` : null, location, clinic].filter(Boolean) as string[]) {
    const hit = await geocode(q.includes("Rwanda") ? q : `${q}, Rwanda`);
    if (hit) return hit;
  }
  return null;
}

/** Fills in coordinates for providers and hospitals that have none. Sequential (rate limit). */
export async function backfillCoordinates(limit = 40) {
  const result = { providers: 0, hospitals: 0, notFound: 0 };
  const providers = await prisma.practitionerProfile.findMany({
    where: { latitude: null, isActive: true },
    select: { id: true, location: true, clinicName: true },
    take: limit,
  });
  for (const p of providers) {
    const hit = await geocodePractice(p.location, p.clinicName);
    if (hit) {
      await prisma.practitionerProfile.update({ where: { id: p.id }, data: { latitude: hit.lat, longitude: hit.lng } });
      result.providers++;
    } else result.notFound++;
  }
  const hospitals = await prisma.hospital.findMany({ where: { latitude: null }, select: { id: true, name: true, address: true }, take: limit });
  for (const h of hospitals) {
    const hit = await geocodePractice(h.address, h.name);
    if (hit) {
      await prisma.hospital.update({ where: { id: h.id }, data: { latitude: hit.lat, longitude: hit.lng } });
      result.hospitals++;
    } else result.notFound++;
  }
  return result;
}
