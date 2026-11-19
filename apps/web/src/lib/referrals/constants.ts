import type { InsuranceProvider } from "@prisma/client";

// Shared between server routes and client components, so this file must not
// import anything server-only. Prisma enum *types* are erased at build time.

export const INSURANCE_OPTIONS: { value: InsuranceProvider; label: string; hint: string }[] = [
  { value: "RSSB_RAMA", label: "RSSB (RAMA)", hint: "Rwanda Social Security Board medical scheme" },
  { value: "MMI", label: "MMI", hint: "Military Medical Insurance" },
  { value: "RADIANT", label: "Radiant", hint: "Radiant Insurance" },
  { value: "SANLAM", label: "Sanlam", hint: "Sanlam Allianz" },
  { value: "BRITAM", label: "Britam", hint: "Britam Insurance" },
  { value: "UAP_OLD_MUTUAL", label: "UAP Old Mutual", hint: "Old Mutual Insurance Rwanda" },
  { value: "EDENCARE", label: "EdenCare", hint: "EdenCare Medical" },
  { value: "OTHER_PRIVATE", label: "Other private insurer", hint: "Any insurer not listed" },
  { value: "NONE_CASH", label: "No insurance / cash", hint: "Pay at the hospital" },
];

export const INSURANCE_VALUES = INSURANCE_OPTIONS.map((o) => o.value) as [InsuranceProvider, ...InsuranceProvider[]];

/** Display name; for OTHER_PRIVATE, the insurer name the patient typed. */
export function insuranceLabel(value: string | null | undefined, otherName?: string | null): string {
  if (value === "OTHER_PRIVATE" && otherName?.trim()) return otherName.trim();
  return INSURANCE_OPTIONS.find((o) => o.value === value)?.label ?? "Not provided";
}

/** Case/spacing/punctuation-insensitive key for comparing insurer names. */
export function insurerKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** A typed insurer name that is really one of the listed insurers, if any. */
export function matchListedInsurer(name: string): InsuranceProvider | null {
  const key = insurerKey(name);
  if (!key) return null;
  const hit = INSURANCE_OPTIONS.find(
    (o) => o.value !== "OTHER_PRIVATE" && o.value !== "NONE_CASH" && (insurerKey(o.label) === key || insurerKey(o.value) === key),
  );
  return hit?.value ?? null;
}

export const SPECIALTIES = [
  "General Practitioner",
  "Obstetrics & Gynecology",
  "Reproductive Endocrinology",
  "Emergency Medicine",
  "Mental Health",
] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export const KIGALI_DISTRICTS = ["Gasabo", "Kicukiro", "Nyarugenge"] as const;

export const TRIAGE_SEVERITIES = ["LOW", "MODERATE", "URGENT"] as const;
export type TriageSeverity = (typeof TRIAGE_SEVERITIES)[number];

export { EMERGENCY_NUMBERS } from "@/lib/site";
