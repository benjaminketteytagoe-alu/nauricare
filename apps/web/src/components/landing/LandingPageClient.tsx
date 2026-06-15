"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Video, FileText, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { AgentChat } from "@/components/AgentChat";

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPageClient() {
  return (
    <div className="overflow-x-hidden bg-white">

      {/* ════════════════════════════════════════════════════════════════
          §1  HERO — live video background
          ════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">

        {/* HTML5 video background — file lives at apps/web/public/hero-loop.mp4
            Source video: https://youtu.be/pI1bd_1MxyM              */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        >
          <source src="/hero-loop.mp4" type="video/mp4" />
        </video>

        {/* Base dark layer — brings video into background without hiding texture */}
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        {/* Directional gradient — heaviest at top and bottom for headline + CTA legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-teal-950/90 via-teal-950/80 to-black/90 pointer-events-none" />

        {/* Hero copy */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-8"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 text-xs font-bold tracking-[0.18em] uppercase px-5 py-2 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                Built for women, by women
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.02em] leading-[1.06] drop-shadow-2xl"
            >
              Your body,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">
                understood.
              </span>
              <br />
              Your health,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">
                connected.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-teal-100/85 max-w-2xl mx-auto leading-relaxed drop-shadow-lg"
            >
              Compassionate, evidence-based care for PCOS, fibroids, and women&apos;s reproductive
              health — always private, always yours.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            >
              <Link href="/signup">
                <button className="group flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 shadow-lg shadow-teal-900/50 hover:shadow-teal-500/30 hover:-translate-y-0.5 active:scale-[0.97]">
                  Patient Portal
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/login">
                <button className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 active:scale-[0.97]">
                  Provider Portal
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/35 pointer-events-none">
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
          §2  NAURI AI SECTION
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-gradient-to-b from-teal-950 via-teal-900 to-teal-950 relative overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-700/10 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full -ml-32 -mb-32 blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-14 items-center"
          >
            {/* Copy */}
            <motion.div variants={fadeUp} className="space-y-6 text-white">
              <span className="inline-flex items-center gap-2 bg-teal-700/40 border border-teal-600/50 text-teal-300 text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-full">
                AI-Powered Care
              </span>

              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-[-0.02em]">
                Meet{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">
                  Nauri,
                </span>{" "}
                your 24/7 care companion.
              </h2>

              <p className="text-teal-200/90 text-lg leading-relaxed">
                Nauri understands the nuance of women&apos;s health. Ask about symptoms, cycle
                patterns, treatment options — get warm, evidence-based answers in seconds, any time
                of day or night.
              </p>

              <ul className="space-y-3">
                {[
                  "Available 24 hours, 7 days a week",
                  "Evidence-based, specialist-reviewed guidance",
                  "Completely private and encrypted",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-teal-100">
                    <div className="w-5 h-5 bg-teal-500/80 rounded-full flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Chat widget */}
            <motion.div variants={scaleIn}>
              <AgentChat />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          §3  FEATURE GRID
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-teal-50 relative">
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
              <h2 className="text-4xl md:text-5xl font-extrabold text-teal-900 tracking-[-0.02em]">
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
      <section className="py-28 px-6 bg-white">
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
                className="flex flex-col justify-center px-8 py-12 lg:px-12 text-white space-y-6"
              >
                <span className="inline-flex items-center gap-2 self-start bg-teal-700/40 border border-teal-600/50 text-teal-300 text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-full">
                  Community Partnership
                </span>

                <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-[-0.02em]">
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
                  <Link href="/signup">
                    <button className="group inline-flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold px-7 py-3.5 rounded-2xl text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
                      Join the movement
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
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
      <section className="py-16 px-6 bg-teal-50 border-t border-teal-100">
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
