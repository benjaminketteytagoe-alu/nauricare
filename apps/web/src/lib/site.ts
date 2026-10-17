// Single source of truth for public-facing identity values. Import these
// instead of hard-coding addresses or URLs in pages, emails and metadata.

export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nauricare.org";

/** Official support, privacy and feedback inbox. */
export const SUPPORT_EMAIL = "nauricare@gmail.com";

export const SITE_LOCATION = "Kigali, Rwanda";

export const EMERGENCY_NUMBERS = "112 / 912";
