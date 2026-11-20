"use client";

import {
  ArrowRight,
  FileText,
  HeartHandshake,
  MessageCircleHeart,
  Sparkles,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NauriTriageCard } from "@/components/nauri/NauriTriageCard";
import { Button } from "@/components/ui/button";
import { Reveal, TextReveal } from "@/components/ui/motion";
import { SparkleField } from "@/components/ui/sparkle-field";
import { EMERGENCY_NUMBERS } from "@/lib/site";
import { FilmSection } from "./FilmSection";
import {
  AvatarOrbit,
  AvatarStack,
  Bloom,
  CareMarquee,
  FloatingFace,
  SIGNATURE_FACES,
  Swash,
  useGeneratedFaces,
} from "./flourishes";

// Landing page, "Warm editorial" (ADR 0001) in bloom: ivory canvas, plum ink,
// rose for action, with drifting rose/lavender/apricot light, women's faces
// (the hand-drawn Signature avatars plus DiceBear) and the NauriCare film.
// Motion comes from lib/motion and CSS transforms, so reduced motion is
// honoured everywhere, and every ambient loop can be paused.

const HERO_SEEDS = ["Umutesi", "Isimbi"] as const;

const STEPS = [
  {
    Icon: MessageCircleHeart,
    title: "Tell Nauri what's going on",
    body: "Pick your symptoms or describe them in your own words. No account needed to start.",
  },
  {
    Icon: Stethoscope,
    title: "Get a clear next step",
    body: "Nauri suggests how soon to seek care and which specialist fits, and always shows you when it's an emergency.",
  },
  {
    Icon: HeartHandshake,
    title: "Book the right care",
    body: "See a verified specialist by video, or take a referral to a partner hospital with your notes attached.",
  },
] as const;

const FEATURES = [
  {
    eyebrow: "Telehealth",
    title: "Specialists, without the waiting room",
    body: "Meet verified gynaecologists and women's health specialists by secure video, on your schedule.",
    Icon: Video,
    imageSrc: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A woman on a video consultation with a clinician",
    chip: "bg-brand-soft text-brand-ink",
  },
  {
    eyebrow: "Health records",
    title: "Your whole story, in one place",
    body: "Lab results, clinical notes and prescriptions, encrypted, organised and shared only when you choose.",
    Icon: FileText,
    imageSrc: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A clinician reviewing health records on a tablet",
    chip: "bg-lavender-soft text-lavender",
  },
] as const;

// Only claims the product can stand behind: see /privacy#framework and /consent.
const TRUST = [
  { value: "24/7", label: "Nauri symptom guidance" },
  { value: "Verified", label: "Every specialist checked" },
  { value: "Nº 058/2021", label: "Rwanda data protection law" },
  { value: "Your consent", label: "Before anything is shared" },
] as const;

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-eyebrow font-semibold uppercase text-brand-ink ${className}`}>{children}</p>;
}

export default function LandingPageClient() {
  const heroFaces = useGeneratedFaces(HERO_SEEDS);
  return (
    <div className="overflow-x-hidden bg-canvas text-ink">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Bloom />
        <SparkleField className="-z-10 [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]" />
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-28">
          <div className="space-y-8 text-center lg:text-left">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-surface/80 py-1.5 pr-4 pl-2 text-sm font-medium text-brand-ink shadow-card backdrop-blur-md">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft">
                  <Sparkles className="size-3.5" aria-hidden />
                </span>
                Women&apos;s health · Kigali and across Africa
              </p>
            </Reveal>

            <TextReveal
              className="font-display text-display-lg text-balance sm:text-display-xl lg:text-display-2xl"
              lines={[
                <>
                  Your body,{" "}
                  <em className="relative inline-block font-normal text-brand-ink">
                    understood.
                    <Swash />
                  </em>
                </>,
                <>
                  Your health, <em className="font-normal text-brand-ink">connected.</em>
                </>,
              ]}
            />

            <Reveal delay={0.2}>
              <p className="mx-auto max-w-xl text-lg leading-relaxed text-pretty text-ink-soft lg:mx-0">
                Compassionate, evidence-based care for PCOS, fibroids and reproductive health. Ask Nauri how soon to get
                care, then book a verified specialist or a hospital referral.
              </p>
            </Reveal>

            <Reveal delay={0.3} className="space-y-6">
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Button size="lg" variant="premium" className="group w-full sm:w-auto" asChild>
                  <Link href="/signup">
                    Create your account
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full bg-surface/70 backdrop-blur-md sm:w-auto" asChild>
                  <Link href="/login">Provider portal</Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-3 lg:justify-start">
                <AvatarStack />
                <p className="text-left text-sm leading-snug text-ink-muted">
                  Co-created with women and young
                  <br className="hidden sm:block" /> innovators in Rwanda.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* An arch of soft rose light behind the card. */}
            <div
              aria-hidden
              className="absolute -inset-x-6 -top-10 -bottom-6 -z-10 rounded-t-full border-x border-t border-brand-line/70 bg-gradient-to-b from-brand-soft via-lavender-soft/70 to-transparent [mask-image:linear-gradient(black_55%,transparent)]"
            />
            <FloatingFace src={SIGNATURE_FACES[6]} label="Irregular cycles" className="-top-6 -left-10" />
            <FloatingFace src={heroFaces[0]} label="PCOS questions" className="top-1/3 -right-12" delay={1.8} />
            <FloatingFace src={SIGNATURE_FACES[7]} label="Pelvic pain" className="right-10 -bottom-10" delay={3.2} />
            <div id="symptom-guide" className="scroll-mt-24">
              <NauriTriageCard />
            </div>
          </Reveal>
        </div>
      </section>

      <CareMarquee />

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-14">
          <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 id="how-heading" className="font-display text-display-md text-balance sm:text-display-lg">
              From a worry to the right care, <em className="font-normal text-brand-ink">in three steps.</em>
            </h2>
          </Reveal>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ Icon, title, body }, i) => (
              <li key={title} className="h-full">
                <Reveal
                  delay={0.08 * i}
                  className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-card border border-hairline bg-surface/80 p-7 shadow-card backdrop-blur-md transition-[box-shadow,translate] duration-300 ease-editorial hover:-translate-y-1 hover:shadow-raised"
                >
                  {/* Watermark numeral, drawn by CSS: decorative, so not text for assistive tech. */}
                  <span
                    aria-hidden
                    data-step={`0${i + 1}`}
                    className="pointer-events-none absolute -top-3 right-5 font-display text-[5.5rem] leading-none text-brand-soft italic tabular-nums transition-colors group-hover:text-brand-line before:content-[attr(data-step)]"
                  />
                  <span className="relative flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-ink transition-colors group-hover:bg-brand group-hover:text-on-brand">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="font-display text-display-sm text-ink">{title}</h3>
                  <p className="leading-relaxed text-ink-soft">{body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FilmSection />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="features-heading"
        className="border-y border-hairline bg-surface px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
      >
        <div className="mx-auto max-w-6xl space-y-14">
          <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
            <Eyebrow>One platform</Eyebrow>
            <h2 id="features-heading" className="font-display text-display-md text-balance sm:text-display-lg">
              Everything you need. <em className="font-normal text-brand-ink">Nothing you don&apos;t.</em>
            </h2>
            <p className="text-lg leading-relaxed text-ink-soft">
              A complete women&apos;s health platform, built with empathy and backed by science.
            </p>
          </Reveal>

          <ul className="grid gap-6 md:grid-cols-2">
            {FEATURES.map(({ eyebrow, title, body, Icon, imageSrc, imageAlt, chip }, i) => (
              <li key={eyebrow} className="h-full">
                <Reveal
                  delay={0.06 * i}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-canvas shadow-card transition-shadow duration-300 ease-editorial hover:shadow-raised"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={imageSrc}
                      alt={imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <span
                      className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}
                    >
                      <Icon className="size-3.5" aria-hidden /> {eyebrow}
                    </span>
                    <h3 className="font-display text-display-sm text-ink">{title}</h3>
                    <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── A circle of women ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="circle-heading"
        className="relative isolate overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
      >
        <Bloom className="opacity-70" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Reveal className="space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
              <Users className="size-3.5" aria-hidden /> Community
            </span>
            <h2 id="circle-heading" className="font-display text-display-md text-balance sm:text-display-lg">
              You are <em className="font-normal text-brand-ink">not the only one.</em>
            </h2>
            <p className="mx-auto max-w-lg text-lg leading-relaxed text-ink-soft lg:mx-0">
              Share your journey and find support from other women living with PCOS, fibroids and more. Everyone appears
              with an avatar she chooses, never her photo, so you can be open and still be private.
            </p>
            <Button size="lg" variant="outline" className="group bg-surface/70 backdrop-blur-md" asChild>
              <Link href="/signup">
                Find your circle
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={0.1}>
            <AvatarOrbit>
              <div className="flex flex-col items-center gap-1">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand text-on-brand shadow-premium sm:size-14">
                  <HeartHandshake className="size-6" aria-hidden />
                </span>
                <span className="mt-1 font-display text-sm text-ink italic sm:text-base">Held together</span>
              </div>
            </AvatarOrbit>
          </Reveal>
        </div>
      </section>

      {/* ── ASYV partnership ─────────────────────────────────────────────── */}
      <section aria-labelledby="partner-heading" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mx-auto max-w-6xl">
          <div className="grid overflow-hidden rounded-[2rem] bg-surface-inverse text-ink-inverse shadow-raised lg:grid-cols-2">
            <div className="relative min-h-[300px] bg-surface lg:min-h-[520px]">
              <Image
                src="https://res.cloudinary.com/dl2fjmhft/image/upload/Agahozo_Shalom_Logo_geocaj"
                alt="Agahozo-Shalom Youth Village community"
                fill
                className="object-contain p-10 sm:p-14"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="flex flex-col justify-center gap-6 px-6 py-10 sm:px-10 sm:py-12 lg:px-12">
              <p className="text-eyebrow font-semibold uppercase text-brand-line">Community partnership</p>
              <h2
                id="partner-heading"
                className="font-display text-display-md text-ink-inverse text-balance sm:text-display-lg"
              >
                Built with the young innovators of{" "}
                <em className="font-normal text-brand-line">Agahozo-Shalom Youth Village.</em>
              </h2>
              <p className="leading-relaxed text-ink-inverse/85">
                NauriCare began with a simple belief: quality women&apos;s healthcare should know no borders. With ASYV
                in Rwanda, we are co-creating technology that is equitable, accessible and rooted in community.
              </p>
              <p className="text-sm leading-relaxed text-ink-inverse/75">
                Together we train the next generation of health innovators and bring local knowledge into the platform,
                so NauriCare is built <em>with</em> communities, not just <em>for</em> them.
              </p>
              <blockquote className="border-l-2 border-brand-line/60 pl-4 font-display text-lg italic text-brand-line">
                &ldquo;Technology built from within the community is technology that lasts.&rdquo;
              </blockquote>
              <div>
                <Button
                  size="lg"
                  className="group relative isolate overflow-hidden bg-ink-inverse text-ink shadow-premium after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:-translate-x-[120%] after:bg-[linear-gradient(105deg,transparent_30%,var(--nc-brand-soft)_50%,transparent_70%)] hover:bg-brand-soft hover:after:animate-sheen active:bg-brand-line"
                  asChild
                >
                  <Link href="/signup">
                    Join the movement
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section aria-label="Why women trust NauriCare" className="border-t border-hairline px-4 py-16 sm:px-6 lg:px-8">
        <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-10 text-center md:grid-cols-4">
          {TRUST.map(({ value, label }) => (
            <div key={label} className="flex flex-col-reverse gap-1">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="font-display text-display-sm text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Closing call to action ───────────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <Reveal className="relative isolate mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-brand-line bg-brand-soft px-6 py-14 text-center shadow-card sm:px-12">
          <Bloom className="opacity-80" />
          <AvatarStack count={6} className="mb-6 justify-center" />
          <h2 className="font-display text-display-md text-balance sm:text-display-lg">
            Start with a question. <em className="font-normal text-brand-ink">We&apos;ll take it from there.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">
            Nauri offers guidance, never a diagnosis, and it never replaces a clinician. In an emergency, call{" "}
            {EMERGENCY_NUMBERS}.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="premium" asChild>
              <Link href="/#symptom-guide">Ask Nauri now</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-surface/70" asChild>
              <Link href="/waitlist">Join the waitlist</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
