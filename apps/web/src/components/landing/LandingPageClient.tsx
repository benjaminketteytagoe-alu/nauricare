"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Video, FileText, Users, ArrowRight } from "lucide-react";
import { NauriTriageCard } from "@/components/nauri/NauriTriageCard";

// ─── Animation presets ────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14 } },
};

const scaleIn = {
  hidden:  { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: "easeOut" as const } },
};

// ─── Hero carousel slides (mixed media) ──────────────────────────────────────

type HeroSlide = { type: "image" | "video"; src: string };

const HERO_SLIDES: HeroSlide[] = [
  { type: "image", src: "https://res.cloudinary.com/dl2fjmhft/image/upload/v1781560519/vvvvv_ybkkyk.jpg" },
  { type: "video", src: "https://res.cloudinary.com/dl2fjmhft/video/upload/v1781604133/Nauricare_App_Demo_itl2vz.mp4" },
];

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    label: "Telehealth",
    description:
      "Connect face-to-face with verified gynecologists and women's health specialists from the comfort of your home — securely, on your schedule.",
    Icon: Video,
    // Generic Unsplash placeholder — woman in a telehealth video consultation
    imageSrc: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    accent: "from-teal-500 to-teal-700",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    label: "Medical Records",
    description:
      "Your complete health timeline — lab results, clinical notes, prescriptions — encrypted, organized, and always in your hands.",
    Icon: FileText,
    // Generic Unsplash placeholder — healthcare professional reviewing records on tablet
    imageSrc: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=800&q=80",
    accent: "from-violet-500 to-violet-700",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    label: "Community",
    description:
      "Share your journey, find support, and connect with thousands of women navigating PCOS, fibroids, and more — together.",
    Icon: Users,
    imageSrc: "https://res.cloudinary.com/dl2fjmhft/image/upload/vvvvv_3_z7lgjx",
    accent: "from-rose-500 to-rose-700",
    badge: "bg-rose-100 text-rose-700",
  },
];

// ─── Hero carousel ────────────────────────────────────────────────────────────
// Module-level constant avoids re-creating this object on every render tick.
const CAROUSEL_MEDIA_PROPS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: 2.5, ease: "easeInOut" as const },
  className: "absolute inset-0 w-full h-full object-cover",
};

// Isolated into its own component so the 5s setInterval re-render is scoped
// to this small subtree, not the entire LandingPageClient (§3-§5).
function HeroCarousel() {
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[heroIdx];

  return (
    <AnimatePresence mode="sync">
      {slide.type === "video" ? (
        <motion.video
          key={slide.src}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          {...CAROUSEL_MEDIA_PROPS}
        >
          <source src={slide.src} type="video/mp4" />
        </motion.video>
      ) : (
        <motion.img
          key={slide.src}
          src={slide.src}
          alt=""
          aria-hidden="true"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          {...CAROUSEL_MEDIA_PROPS}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPageClient() {
  return (
    <div className="overflow-x-hidden bg-white">

      {/* ════════════════════════════════════════════════════════════════
          §1  HERO — live video background
          ════════════════════════════════════════════════════════════════ */}
      {/* dvh minus navbar height (4rem) and the variable notch inset so the hero never overflows */}
      <section className="relative min-h-[calc(100dvh-4rem-env(safe-area-inset-top))] flex items-center justify-center overflow-hidden">

        {/* Crossfade hero background — isolated component, re-renders only this subtree */}
        <HeroCarousel />

        {/* Rich warm overlay — ensures WCAG-compliant contrast against the crossfading imagery */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/75 via-stone-900/55 to-stone-950/85 pointer-events-none" />

        {/* Hero copy + Nauri front door */}
        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-7 text-center text-white lg:text-left"
          >
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-6xl lg:text-[4.25rem] font-extrabold tracking-[-0.02em] leading-[1.06] drop-shadow-2xl text-balance"
            >
              Your body,{" "}
              <span className="text-rose-300">understood.</span>
              <br />
              Your health,{" "}
              <span className="text-amber-300">connected.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-xl text-lg leading-relaxed text-amber-50/90 drop-shadow-lg text-pretty md:text-xl lg:mx-0"
            >
              Compassionate, evidence-based care for PCOS, fibroids, and women&apos;s reproductive
              health. Ask Nauri how soon to get care, then book a verified specialist or hospital referral.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center gap-4 pt-1 sm:flex-row lg:justify-start"
            >
              <Link
                href="/signup"
                className="group flex w-full sm:w-auto items-center justify-center gap-2.5 bg-[#701a2e] hover:bg-rose-800 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 shadow-lg shadow-rose-950/60 hover:shadow-rose-900/40 hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Patient Portal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="flex w-full sm:w-auto items-center justify-center gap-2.5 bg-rose-950/30 hover:bg-rose-950/50 backdrop-blur-sm border border-rose-300/30 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 active:scale-[0.97]"
              >
                Provider Portal
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            id="symptom-guide"
            className="mx-auto w-full max-w-lg scroll-mt-24 lg:max-w-none"
          >
            <NauriTriageCard />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-white/35 pointer-events-none xl:flex">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
            <motion.div
              className="w-1 h-2.5 bg-white/40 rounded-full"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          §3  FEATURE GRID
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-teal-50 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="space-y-14"
          >
            {/* Section header */}
            <motion.div variants={fadeUp} className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-teal-900 tracking-[-0.02em] text-balance">
                Everything you need.
                <br />
                <span className="text-teal-600">Nothing you don&apos;t.</span>
              </h2>
              <p className="text-teal-700 text-lg leading-relaxed">
                A complete women&apos;s health platform — built with empathy, backed by science.
              </p>
            </motion.div>

            {/* Cards */}
            <div className="grid md:grid-cols-3 gap-7">
              {FEATURES.map(({ label, description, Icon, imageSrc, accent, badge }) => (
                <motion.div
                  key={label}
                  variants={fadeUp}
                  className="group bg-white rounded-[1.75rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 border border-teal-100"
                >
                  {/* Image block */}
                  <div className="relative h-52 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    {/* Gradient tint */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${accent} opacity-30`} />

                    {/* Floating icon badge */}
                    <div
                      className={`absolute top-4 left-4 w-11 h-11 bg-gradient-to-br ${accent} rounded-2xl flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Card copy */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${badge}`}>
                        {label}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-teal-900">{label}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          §4  ASYV PARTNERSHIP SECTION
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <div className="grid lg:grid-cols-2 overflow-hidden rounded-[2.5rem] shadow-2xl bg-gradient-to-br from-teal-900 to-teal-950">

              {/* ── Image side ── */}
              <motion.div
                variants={scaleIn}
                className="relative min-h-[360px] lg:min-h-[520px] overflow-hidden"
              >
                {/* Cloudinary image — priority false since it's below the fold */}
                <Image
                  src="https://res.cloudinary.com/dl2fjmhft/image/upload/Agahozo_Shalom_Logo_geocaj"
                  alt="Agahozo-Shalom Youth Village community"
                  fill
                  className="object-cover"
                  priority={false}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* Right-to-left gradient fade into the text panel */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-teal-950/80 hidden lg:block" />
                {/* Bottom fade for mobile */}
                <div className="absolute inset-0 bg-gradient-to-t from-teal-950/70 via-transparent to-transparent lg:hidden" />
              </motion.div>

              {/* ── Text side ── */}
              <motion.div
                variants={fadeUp}
                className="flex flex-col justify-center px-6 sm:px-8 py-10 sm:py-12 lg:px-12 text-white space-y-6"
              >
                <span className="inline-flex items-center gap-2 self-start bg-teal-700/40 border border-teal-600/50 text-teal-300 text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-full">
                  Community Partnership
                </span>

                <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-[-0.02em] text-balance">
                  Empowering Community:{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">
                    Our Partnership with Agahozo-Shalom Youth Village.
                  </span>
                </h2>

                <p className="text-teal-200/90 leading-relaxed">
                  NauriCare was built on a simple belief: access to quality women&apos;s healthcare
                  should know no borders. In close partnership with the young innovators of the{" "}
                  <span className="text-white font-semibold">
                    Agahozo-Shalom Youth Village (ASYV)
                  </span>{" "}
                  in Rwanda, we are co-creating technology that is equitable, accessible, and deeply
                  rooted in community.
                </p>

                <p className="text-teal-200/80 leading-relaxed text-sm">
                  Together, we train the next generation of healthcare innovators, embed local
                  knowledge directly into our platform, and ensure that NauriCare is built{" "}
                  <em>with</em> communities — not just <em>for</em> them. Every feature, every
                  decision, every design choice is informed by the lived experiences of women across
                  Africa.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <div className="w-1 h-10 bg-teal-400/60 rounded-full" />
                  <p className="text-teal-300 italic text-sm font-medium leading-snug">
                    &ldquo;Technology built from within the community
                    <br />
                    is technology that lasts.&rdquo;
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold px-7 py-3.5 rounded-2xl text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                  >
                    Join the movement
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          §5  TRUST STRIP
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6 bg-teal-50 border-t border-teal-100">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { stat: "24/7", label: "AI care companion" },
            { stat: "HIPAA", label: "Compliant & encrypted" },
            { stat: "100%", label: "Private, always" },
            { stat: "Africa", label: "Built for our context" },
          ].map(({ stat, label }) => (
            <motion.div key={stat} variants={fadeUp} className="space-y-1">
              <p className="text-3xl font-extrabold text-teal-700">{stat}</p>
              <p className="text-sm text-teal-600 font-medium">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
