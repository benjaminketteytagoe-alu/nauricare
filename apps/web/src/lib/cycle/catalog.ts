import type { FlowLevel } from "@prisma/client";

// Options for the daily log and the content for each cycle phase. Shared by
// the tracker UI and the server action that validates what is saved.

export const FLOW_OPTIONS: { value: FlowLevel; label: string; drops: number }[] = [
  { value: "NONE", label: "None", drops: 0 },
  { value: "SPOTTING", label: "Spotting", drops: 1 },
  { value: "LIGHT", label: "Light", drops: 1 },
  { value: "MEDIUM", label: "Medium", drops: 2 },
  { value: "HEAVY", label: "Heavy", drops: 3 },
];

export const SYMPTOM_OPTIONS = [
  { id: "cramps", label: "Cramps", emoji: "🌀" },
  { id: "bloating", label: "Bloating", emoji: "🎈" },
  { id: "headache", label: "Headache", emoji: "🤕" },
  { id: "back_pain", label: "Back pain", emoji: "🔙" },
  { id: "tender_breasts", label: "Tender breasts", emoji: "💗" },
  { id: "acne", label: "Acne", emoji: "✨" },
  { id: "fatigue", label: "Fatigue", emoji: "😴" },
  { id: "nausea", label: "Nausea", emoji: "🤢" },
  { id: "cravings", label: "Cravings", emoji: "🍫" },
  { id: "insomnia", label: "Poor sleep", emoji: "🌙" },
  { id: "clots", label: "Heavy clots", emoji: "🩸" },
  { id: "pelvic_pain", label: "Pelvic pain", emoji: "⚡" },
  { id: "pelvic_pressure", label: "Pelvic pressure", emoji: "⬇️" },
  { id: "frequent_urination", label: "Frequent urination", emoji: "🚻" },
  { id: "hair_growth", label: "Excess hair growth", emoji: "🪒" },
] as const;

export const MOOD_OPTIONS = [
  { id: "calm", label: "Calm", emoji: "😌" },
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "energetic", label: "Energetic", emoji: "⚡" },
  { id: "sensitive", label: "Sensitive", emoji: "🥺" },
  { id: "irritable", label: "Irritable", emoji: "😤" },
  { id: "anxious", label: "Anxious", emoji: "😟" },
  { id: "low", label: "Low", emoji: "😔" },
  { id: "stressed", label: "Stressed", emoji: "😣" },
] as const;

export type SymptomId = (typeof SYMPTOM_OPTIONS)[number]["id"];
export type MoodId = (typeof MOOD_OPTIONS)[number]["id"];
export const SYMPTOM_IDS = SYMPTOM_OPTIONS.map((s) => s.id) as [SymptomId, ...SymptomId[]];
export const MOOD_IDS = MOOD_OPTIONS.map((m) => m.id) as [MoodId, ...MoodId[]];

export type PhaseId = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface PhaseContent {
  id: PhaseId;
  name: string;
  tagline: string;
  body: string;
  eat: string[];
  move: string;
  care: string;
  tone: { bg: string; text: string; ring: string };
}

export const PHASES: Record<PhaseId, PhaseContent> = {
  menstrual: {
    id: "menstrual",
    name: "Menstrual phase",
    tagline: "Rest and replenish",
    body: "Oestrogen and progesterone are at their lowest. It's normal to feel tired. Be gentle with yourself.",
    eat: ["Beans (ibishyimbo) and isombe for iron", "Dodo (amaranth) and other dark greens", "Passion fruit with meals to help absorb iron", "Warm ginger tea for cramps"],
    move: "Gentle walks, stretching or rest. Listen to your body.",
    care: "A warm cloth or bottle on your lower belly can ease cramps.",
    tone: { bg: "bg-rose-50", text: "text-rose-700", ring: "#E11D48" },
  },
  follicular: {
    id: "follicular",
    name: "Follicular phase",
    tagline: "Rising energy",
    body: "Oestrogen is climbing, and many women feel brighter, more social and more creative.",
    eat: ["Avocado and groundnuts for healthy fats", "Isambaza or tilapia for protein", "Igikoma (sorghum porridge) for steady energy", "Fresh fruit like pineapple and mango"],
    move: "A good time for dancing, brisk walks or trying something new.",
    care: "Plan the things that need focus and energy for these days.",
    tone: { bg: "bg-amber-50", text: "text-amber-700", ring: "#F59E0B" },
  },
  ovulation: {
    id: "ovulation",
    name: "Ovulation",
    tagline: "Your peak",
    body: "An egg is released around now. Energy and confidence often peak, and this is your most fertile time.",
    eat: ["Plenty of water", "Leafy greens and colourful vegetables", "Sweet potato and whole grains", "Fruit rich in vitamin C"],
    move: "Higher-energy movement such as running, dance classes or sport.",
    care: "If you're avoiding or planning pregnancy, these are the key days.",
    tone: { bg: "bg-teal-50", text: "text-teal-700", ring: "#0D9488" },
  },
  luteal: {
    id: "luteal",
    name: "Luteal phase",
    tagline: "Slow down and nourish",
    body: "Progesterone rises then falls. Cravings, bloating and mood changes are common before your period.",
    eat: ["Bananas and ibitoke (plantain) for magnesium and potassium", "Groundnuts (ubunyobwa) and seeds", "Less salt to ease bloating", "Regular meals to steady your mood"],
    move: "Yoga, walking and lighter strength work.",
    care: "Early nights and journaling can help with PMS. Be kind to yourself.",
    tone: { bg: "bg-violet-50", text: "text-violet-700", ring: "#7C3AED" },
  },
};

/** Which phase a cycle day (1-based) falls in. */
export function phaseForDay(day: number, cycleLength: number, periodLength: number): PhaseId {
  const ovulation = cycleLength - 14;
  if (day <= periodLength) return "menstrual";
  if (day >= ovulation - 1 && day <= ovulation + 1) return "ovulation";
  if (day < ovulation - 1) return "follicular";
  return "luteal";
}
