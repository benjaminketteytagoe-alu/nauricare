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
  { value: "OTHER_PRIVATE", label: "Other private insurer", hint: "Any insurer not listed" },
  { value: "NONE_CASH", label: "No insurance / cash", hint: "Pay at the hospital" },
];

export const INSURANCE_VALUES = INSURANCE_OPTIONS.map((o) => o.value) as [InsuranceProvider, ...InsuranceProvider[]];

export function insuranceLabel(value: string | null | undefined): string {
  return INSURANCE_OPTIONS.find((o) => o.value === value)?.label ?? "Not provided";
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
