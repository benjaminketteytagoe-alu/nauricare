import type { WaitlistRole } from "@prisma/client";

// Client-safe options shared by the waitlist form and its API route.
export const WAITLIST_ROLES: { value: WaitlistRole; label: string }[] = [
  { value: "PATIENT", label: "I'm looking for care" },
  { value: "PROVIDER", label: "I'm a healthcare provider" },
  { value: "ORGANIZATION", label: "I represent a clinic, hospital or organisation" },
  { value: "OTHER", label: "Something else" },
];

export const WAITLIST_ROLE_VALUES = WAITLIST_ROLES.map((r) => r.value) as [WaitlistRole, ...WaitlistRole[]];
