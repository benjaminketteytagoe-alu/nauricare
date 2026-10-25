// The predefined avatar set (public/avatars/*.svg). Patients choose from
// these; there are no uploads. Shared by client and server.

export const AVATAR_PRESETS = [
  { id: "afro", label: "Afro" },
  { id: "puff", label: "High puff" },
  { id: "braids", label: "Box braids" },
  { id: "locs", label: "Locs" },
  { id: "headwrap", label: "Headwrap" },
  { id: "twa", label: "Short natural" },
  { id: "bantu", label: "Bantu knots" },
  { id: "hijab", label: "Hijab" },
  { id: "cornrows", label: "Cornrows" },
  { id: "bob", label: "Bob" },
  { id: "twists", label: "Twists" },
  { id: "gele", label: "Gele" },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];
export const AVATAR_PRESET_IDS = AVATAR_PRESETS.map((p) => p.id) as [AvatarPresetId, ...AvatarPresetId[]];

export const presetSrc = (id: AvatarPresetId) => `/avatars/${id}.svg`;

/** The preset id behind an avatar URL, or null if it isn't a preset. */
export function presetIdOf(url: string | null | undefined): AvatarPresetId | null {
  const m = url?.match(/^\/avatars\/([a-z]+)\.svg$/);
  return m && (AVATAR_PRESET_IDS as string[]).includes(m[1]) ? (m[1] as AvatarPresetId) : null;
}

/** Google profile photos (synced at sign-in, never user-supplied). */
export function isGooglePhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "lh3.googleusercontent.com" || /^lh\d\.googleusercontent\.com$/.test(u.hostname));
  } catch {
    return false;
  }
}

/**
 * The avatar shown for a patient in Community: predefined avatars only, so
 * nobody's real face (e.g. a synced Google photo) appears in the community.
 */
export function communityAvatar(role: string, url: string | null | undefined): string | null {
  if (role !== "PATIENT") return url ?? null;
  return presetIdOf(url) ? url! : null;
}
