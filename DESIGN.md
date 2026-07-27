---
version: 1.0.0
name: NauriCare-design-system
description: |
  A modern, warm, and empowering healthcare & EHR platform UI system built for NauriCare. The visual identity bridges clinical authority with an inviting, expressive patient experience. The color system takes direct inspiration from the iconic NauriCare "N" emblem — combining rich Cobalt Blue, Crimson Red, Warm Amber, and Deep Slate Black — paired with a primary vibrant Rose/Magenta palette for patient portal health workflows. Card containers sit on a warm blush-ambient gradient canvas with ultra-soft glassmorphic borders (border-rose-100), generous rounded corners (12px to 24px radii), clean modern sans typography (Plus Jakarta Sans / Inter), and multi-colored semantic health status badges (Rose, Purple, Teal, Peach).

colors:
  primary: "#e11d48"
  primary-pressed: "#be123c"
  primary-active: "#9f1239"
  on-primary: "#ffffff"
  
  # Core Ink & Typography
  ink: "#0f172a"
  body: "#334155"
  mute: "#64748b"
  ash: "#94a3b8"
  stone: "#cbd5e1"
  hairline: "#ffe4e6"
  hairline-soft: "#fff1f2"
  on-dark: "#ffffff"

  # NauriCare Brand Logo Accents
  logo-blue: "#1d4ed8"
  logo-red: "#dc2626"
  logo-orange: "#d97706"
  logo-black: "#0f172a"

  # Canvas & Surface Tokens
  canvas: "#fff1f2"
  canvas-gradient-start: "#fff1f2"
  canvas-gradient-mid: "#fce7f3"
  canvas-gradient-end: "#f8fafc"
  surface-card: "#ffffff"
  surface-card-glass: "rgba(255, 255, 255, 0.90)"
  surface-soft: "#fff1f2"
  surface-dark: "#0f172a"

  # Health & Insight Pastel Accents
  accent-rose: "#e11d48"
  accent-rose-soft: "#fff1f2"
  accent-purple: "#7c3aed"
  accent-purple-soft: "#f3e8ff"
  accent-teal: "#0d9488"
  accent-teal-soft: "#ccfbf1"
  accent-amber: "#d97706"
  accent-amber-soft: "#fef3c7"
  focus-ring: "rgba(225, 29, 72, 0.4)"

typography:
  display-xl:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 36px
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: -0.8px
  display-lg:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.5px
  heading-lg:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: -0.3px
  heading-md:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  heading-sm:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0.5px
    textTransform: uppercase
  body-md:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.57
    letterSpacing: 0
  caption-xs:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0.5px
    textTransform: uppercase
  button-md:
    fontFamily: Plus Jakarta Sans, Inter, sans-serif
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  sm: 6px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 64px

components:
  button-brand:
    backgroundColor: "linear-gradient(to right, {colors.primary}, #ec4899)"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: 10px 20px
    height: 42px
  card-surface:
    backgroundColor: "{colors.surface-card-glass}"
    borderColor: "{colors.hairline}"
    borderWidth: 1px
    rounded: "{rounded.xl}"
    padding: 24px
    backdropFilter: "blur(8px)"
  app-shell-canvas:
    backgroundColor: "{colors.canvas-gradient-start}"
    backgroundImage: "linear-gradient(to bottom right, {colors.canvas-gradient-start}, {colors.canvas-gradient-mid}, {colors.canvas-gradient-end})"
  nav-glass:
    backgroundColor: "rgba(255, 255, 255, 0.85)"
    borderColor: "{colors.hairline}"
    backdropFilter: "blur(12px)"
  nav-pill-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 8px 16px
---

## Overview

The NauriCare design language balances clinical reliability with a warm, accessible, and vibrant patient health experience[cite: 1]. The system takes structural cue from the signature **NauriCare horizontal brand mark**[cite: 1]:
1. **The Four Logo Accent Stripes:** Vibrant **Cobalt Blue** (`#1d4ed8`), **Crimson Red** (`#dc2626`), **Warm Amber** (`#d97706`), and **Deep Charcoal Black** (`#0f172a`) serve as key semantic category anchors across clinical records, prescription statuses, and role navigation[cite: 1].
2. **The Patient Portal Theme:** A primary **Vibrant Rose / Magenta** gradient (`#e11d48` → `#ec4899`) backed by a soft blush ambient canvas (`from-rose-50 via-pink-50 to-slate-50`) that evokes warmth, empathy, and personalized health tracking.

Card interfaces sit inside rounded glassmorphic containers (`rounded-3xl` / `rounded-2xl`) with delicate rose borders (`border-rose-100`) and soft ambient elevated shadows.

---

## Colors

### Brand & Logo Palette
- **Primary Rose / Magenta** (`{colors.primary}` — `#e11d48`): The universal brand action color across patient workflows, period logging, and primary buttons.
- **NauriCare Logo Blue** (`{colors.logo-blue}` — `#1d4ed8`): Used for clinical lab results, telehealth video indicators, and verified medical badges[cite: 1].
- **NauriCare Logo Red** (`{colors.logo-red}` — `#dc2626`): Reserved for urgent health alerts, emergency contacts, and high-priority symptoms[cite: 1].
- **NauriCare Logo Amber** (`{colors.logo-orange}` — `#d97706`): Used for pending appointments, prescription refills, and cycle predictions[cite: 1].
- **NauriCare Logo Slate Black** (`{colors.logo-black}` — `#0f172a`): High-contrast ink color for headings, titles, and structural sidebars[cite: 1].

### Surfaces & Backgrounds
- **Ambient Canvas** (`app-shell-canvas`): Soft top-to-bottom gradient (`from-rose-50/90 via-pink-50/40 to-slate-50`) creating a soothing backdrop for patient dashboards.
- **Card Surface** (`card-surface`): Glassmorphic white fill (`rgba(255,255,255,0.9)`) with a `1px` warm border (`#ffe4e6`) and subtle backdrop blur.
- **Pastel Insight Cards:**
  - *Fertile Window / Quiz:* Soft Lavender (`#f3e8ff` / `border-purple-200`)
  - *Health Tips / Analytics:* Soft Mint Teal (`#ccfbf1` / `border-teal-200`)
  - *Reminders / Cycle Logs:* Soft Rose Peach (`#fff1f2` / `border-rose-200`)

---

## Typography

**Plus Jakarta Sans** (with **Inter** fallback) serves as NauriCare's single typeface stack across all web views. It provides high legibility for medical metrics while retaining a friendly, rounded geometric structure.

- **Display XL (36px / Bold 800):** Page titles ("My Cycle & Body", "Telehealth Consultations")
- **Heading MD (18px / Semibold 600):** Dashboard widget headings & card titles
- **Body MD (16px / Regular 400):** Patient notes, consultation summaries, and medical articles
- **Utility XS (12px / Bold 700 / Uppercase):** Category tags ("PRESCRIBED", "PREDICTED OVULATION", "LAB REPORT")

---

## Key App Layouts & Components

### 1. Compact Cycle Calendar Card (`CycleCalendarClient.tsx`)
- **Restrained Grid:** Centered `max-w-md` desktop card container with compact `w-9 h-9` day cells.
- **Logged Days:** Vibrant Rose pill (`bg-rose-600 text-white font-bold`).
- **Predicted Days:** Dashed Rose Coral badge (`bg-rose-100 text-rose-800 border-2 border-dashed border-rose-400`).
- **Ovulation Day:** Lavender Pill (`bg-purple-100 text-purple-900 border-2 border-dashed border-purple-400`).

### 2. Primary Action Buttons (`btn-brand`)
- **Gradient Pill:** `bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-full shadow-md shadow-rose-200`.

### 3. Glassmorphic Navigation Shell (`nav-glass`)
- Top bar and patient sidebars rendered in `bg-white/80 backdrop-blur-md border-rose-100`. Active menu items highlight in solid rose pills (`nav-pill-active`).

---

## Do's and Don'ts

### Do
- Use the warm blush gradient (`from-rose-50 via-pink-50`) for all patient portal backgrounds.
- Keep card corners soft and rounded (`rounded-2xl` or `rounded-3xl`).
- Utilize the logo accents (Blue, Crimson, Amber) for semantic medical badges (Lab results, Refills, Urgent alerts)[cite: 1].
- Restrain calendar grids to compact cards (`max-w-md`) on desktop views.

### Don't
- Don't use harsh dark charcoal or pitch-black full-page backgrounds on patient views.
- Don't mix unstyled white cards without the subtle `border-rose-100` warm border.
- Don't alter the core shadcn `--primary` theme CSS variables on Admin or Provider portals.
- Don't stretch cycle calendars across full 1080p widescreen displays.