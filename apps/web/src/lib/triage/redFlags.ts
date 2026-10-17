import type { TriageSeverity } from "@/lib/referrals/constants";

// Deterministic safety net that runs on every triage request, whatever the
// model says. It can only RAISE severity, never lower it, so a model that
// under-calls an emergency is still caught. It is a keyword screen and not a
// diagnosis; its job is to make sure dangerous combinations are never
// labelled as routine.

export interface RedFlagResult {
  floor: TriageSeverity;
  flags: string[];
}

interface Rule {
  severity: Exclude<TriageSeverity, "LOW">;
  flag: string;
  test: (text: string) => boolean;
}

const has = (text: string, ...patterns: RegExp[]) => patterns.every((p) => p.test(text));

const BLEEDING = /heavy bleeding|soak|clots?\b|haemorrhag|hemorrhag|bleed/;
const FAINT = /dizz|faint|light-?headed|passed out|collapse/;

const RULES: Rule[] = [
  {
    severity: "URGENT",
    flag: "Heavy bleeding with dizziness or fainting can mean significant blood loss.",
    test: (t) => has(t, BLEEDING, FAINT),
  },
  {
    severity: "URGENT",
    flag: "Bleeding or severe pain during a possible pregnancy needs same-day assessment.",
    test: (t) => has(t, /pregnan|missed (my )?period|late period/, /bleed|spotting|severe pain|sharp pain/),
  },
  {
    severity: "URGENT",
    flag: "Chest pain or difficulty breathing needs emergency care.",
    test: (t) => /chest pain|can'?t breathe|cannot breathe|difficulty breathing|short(ness)? of breath/.test(t),
  },
  {
    severity: "URGENT",
    flag: "Fainting, seizures or confusion need emergency care.",
    test: (t) => /seizure|unconscious|passed out|confus/.test(t),
  },
  {
    severity: "URGENT",
    flag: "Thoughts of self-harm need immediate support.",
    test: (t) => /suicid|self-?harm|kill myself|end my life/.test(t),
  },
  {
    severity: "MODERATE",
    flag: "Fever together with pelvic or abdominal pain can signal an infection.",
    test: (t) => has(t, /fever|chills/, /pelvic|abdominal|lower belly|cramp/),
  },
  {
    severity: "MODERATE",
    flag: "Very heavy or prolonged bleeding should be checked by a clinician.",
    test: (t) => BLEEDING.test(t),
  },
  {
    severity: "MODERATE",
    flag: "Severe pain should be assessed by a clinician.",
    test: (t) => /severe|unbearable|worst pain/.test(t),
  },
];

const RANK: Record<TriageSeverity, number> = { LOW: 0, MODERATE: 1, URGENT: 2 };

export function maxSeverity(a: TriageSeverity, b: TriageSeverity): TriageSeverity {
  return RANK[a] >= RANK[b] ? a : b;
}

export function screenRedFlags(symptoms: string[], notes: string): RedFlagResult {
  const text = `${symptoms.join(" ")} ${notes}`.toLowerCase();
  let floor: TriageSeverity = "LOW";
  const flags: string[] = [];
  for (const rule of RULES) {
    if (rule.test(text)) {
      floor = maxSeverity(floor, rule.severity);
      flags.push(rule.flag);
    }
  }
  return { floor, flags };
}
