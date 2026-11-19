"use client";

import { ArrowRight, FileText, HeartHandshake, MessageCircleHeart, Stethoscope, Users, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NauriTriageCard } from "@/components/nauri/NauriTriageCard";
import { Button } from "@/components/ui/button";
import { Reveal, TextReveal } from "@/components/ui/motion";
import { EMERGENCY_NUMBERS } from "@/lib/site";

// Landing page, "Warm editorial" (ADR 0001). Ivory canvas, plum ink, rose for
// action; sage and lavender only as quiet accents. Motion comes from the
// shared presets in lib/motion via <TextReveal>/<Reveal>, so reduced motion
// is honoured everywhere.

const DEMO_VIDEO = "https://res.cloudinary.com/dl2fjmhft/video/upload/v1781604133/Nauricare_App_Demo_itl2vz.mp4";
const DEMO_POSTER = "https://res.cloudinary.com/dl2fjmhft/image/upload/v1781560519/vvvvv_ybkkyk.jpg";

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
  {
    eyebrow: "Community",
    title: "You are not the only one",
    body: "Share your journey and find support from other women living with PCOS, fibroids and more.",
    Icon: Users,
    imageSrc: "https://res.cloudinary.com/dl2fjmhft/image/upload/vvvvv_3_z7lgjx",
    imageAlt: "Women talking together in a supportive group",
    chip: "bg-success-soft text-success",
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
  return (
    <div className="overflow-x-hidden bg-canvas text-ink">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-hairline">
        {/* Soft rose and apricot washes; decorative only. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(48rem_32rem_at_8%_-8%,var(--nc-brand-soft),transparent_70%),radial-gradient(40rem_28rem_at_100%_30%,var(--nc-warning-soft),transparent_70%)]"
        />
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-24">
          <div className="space-y-8 text-center lg:text-left">
            <Eyebrow>Women&apos;s health · Kigali and across Africa</Eyebrow>

            <TextReveal
              className="font-display text-display-lg text-balance sm:text-display-xl lg:text-display-2xl"
              lines={[
                <>
                  Your body, <em className="font-normal text-brand-ink">understood.</em>
                </>,
                <>
                  Your health, <em className="font-normal text-brand-ink">connected.</em>
                </>,
              ]}
            />

            <Reveal delay={0.2}>
              <p className="mx-auto max-w-xl text-lg leading-relaxed text-ink-soft text-pretty lg:mx-0">
                Compassionate, evidence-based care for PCOS, fibroids and reproductive health. Ask Nauri how soon to get
                care, then book a verified specialist or a hospital referral.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Button size="lg" className="group w-full sm:w-auto" asChild>
                  <Link href="/signup">
                    Create your account
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/login">Provider portal</Link>
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="mx-auto w-full max-w-lg lg:max-w-none">
            <div id="symptom-guide" className="scroll-mt-24">
              <NauriTriageCard />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <div className="space-y-10">
            <Reveal className="space-y-4">
              <Eyebrow>How it works</Eyebrow>
              <h2 id="how-heading" className="font-display text-display-md text-balance sm:text-display-lg">
                From a worry to the right care, in three steps.
              </h2>
            </Reveal>
            <ol className="space-y-6">
              {STEPS.map(({ Icon, title, body }, i) => (
                <li key={title}>
                  <Reveal delay={0.06 * i} className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-ink">
                        <span className="mr-2 font-display text-ink-muted tabular-nums">0{i + 1}</span>
                        {title}
                      </h3>
                      <p className="leading-relaxed text-ink-soft">{body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>

          <Reveal delay={0.1}>
            <figure className="overflow-hidden rounded-card border border-hairline bg-surface shadow-raised">
              <video
                className="aspect-video w-full bg-surface-muted object-cover"
                controls
                muted
                playsInline
                preload="metadata"
                poster={DEMO_POSTER}
                aria-label="A short walkthrough of the NauriCare app"
              >
                <source src={DEMO_VIDEO} type="video/mp4" />
              </video>
              <figcaption className="px-5 py-3 text-sm text-ink-muted">A one-minute look inside NauriCare.</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

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

          <ul className="grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ eyebrow, title, body, Icon, imageSrc, imageAlt, chip }, i) => (
              <li key={eyebrow} className="h-full">
                <Reveal
                  delay={0.06 * i}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-canvas shadow-card transition-shadow duration-300 ease-editorial hover:shadow-raised"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={imageSrc}
                      alt={imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
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
                  className="group bg-ink-inverse text-ink hover:bg-brand-soft active:bg-brand-line"
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
        <Reveal className="mx-auto max-w-4xl rounded-[2rem] border border-brand-line bg-brand-soft px-6 py-14 text-center sm:px-12">
          <h2 className="font-display text-display-md text-balance sm:text-display-lg">
            Start with a question. <em className="font-normal text-brand-ink">We&apos;ll take it from there.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">
            Nauri offers guidance, never a diagnosis, and it never replaces a clinician. In an emergency, call{" "}
            {EMERGENCY_NUMBERS}.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/#symptom-guide">Ask Nauri now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/waitlist">Join the waitlist</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
