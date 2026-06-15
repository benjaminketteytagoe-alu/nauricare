import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Hardcoded IDs make this script idempotent — re-running it upserts rather than duplicates.
const SEED_ARTICLES = [
  {
    id: "seed-article-pcos-1",
    title: "The Link Between Insulin Resistance and PCOS",
    content: `Polycystic ovary syndrome (PCOS) affects roughly 1 in 10 women of reproductive age, making it the most common hormonal disorder among women globally. While the exact cause remains multifactorial, insulin resistance sits at the center of the metabolic dysfunction seen in up to 70% of PCOS cases.

When cells fail to respond efficiently to insulin, the pancreas compensates by producing more. This excess insulin stimulates the ovaries to overproduce androgens (male hormones), which disrupts normal follicle development and leads to the irregular or absent ovulation that defines the condition.

**Managing the insulin-PCOS connection:**
- A low-glycaemic index (GI) diet reduces post-meal insulin spikes. Swap refined carbohydrates for oats, legumes, and non-starchy vegetables.
- Inositol supplementation (specifically myo-inositol and D-chiro-inositol) has strong clinical evidence for improving insulin sensitivity and restoring menstrual regularity.
- Vitamin D deficiency is strongly correlated with insulin resistance severity. Have your levels tested and supplement if below 30 ng/mL.
- Even a 5–10% reduction in body weight can significantly improve insulin sensitivity and restore ovulatory cycles in overweight patients.

This is not a condition to manage reactively. Building consistent, evidence-based habits around blood sugar regulation is the most powerful lever you have.`,
    tags: ["PCOS", "HORMONES", "General"],
    isPublished: true,
  },
  {
    id: "seed-article-fibroids-1",
    title: "How to Manage Fibroid Pain Naturally at Home",
    content: `Uterine fibroids are non-cancerous muscular tumours that develop in or around the wall of the uterus. They affect up to 70% of women by the age of 50, though many remain asymptomatic. For those who do experience symptoms — heavy menstrual bleeding, pelvic pressure, and chronic pain — daily life can be significantly impacted.

While medical or surgical intervention is often necessary for large or rapidly growing fibroids, several evidence-based lifestyle strategies can reduce inflammation and symptom severity.

**Evidence-supported approaches:**

*Diet and inflammation:*
Green tea contains epigallocatechin gallate (EGCG), a polyphenol that has been shown in cell studies to inhibit fibroid cell proliferation. Aim for 2–3 cups daily. Reduce processed red meats, which contain arachidonic acid — a precursor to pro-inflammatory prostaglandins that worsen cramping.

*Hormone regulation:*
Fibroids are oestrogen-dependent; they grow in response to excess oestrogen. Cruciferous vegetables (broccoli, cauliflower, Brussels sprouts) contain indole-3-carbinol, which supports liver metabolism of excess oestrogen. Minimise alcohol and xenoestrogen exposure (BPA in plastics, certain pesticides).

*Pain management:*
Heat therapy (a heating pad applied to the lower abdomen) is one of the most effective immediate pain-relief strategies. Omega-3 fatty acids (from oily fish or supplementation) compete with inflammatory prostaglandins and have measurable effects on pain intensity within 4–8 weeks of consistent use.

Track your symptoms monthly. If pain intensity increases or bleeding becomes severe, consult your gynaecologist promptly.`,
    tags: ["Fibroids", "PAIN", "General"],
    isPublished: true,
  },
  {
    id: "seed-article-endo-1",
    title: "Navigating Endometriosis Flare-Ups: A Practical Guide",
    content: `Endometriosis affects an estimated 190 million women worldwide, yet the average time to diagnosis remains 7–10 years. The condition occurs when tissue similar to the uterine lining grows outside the uterus — on the ovaries, fallopian tubes, and surrounding pelvic structures — where it cannot shed during menstruation, instead causing adhesions, scarring, and intense inflammatory responses.

During a flare, the inflammatory cascade can be debilitating. Understanding your triggers and having a response plan ready makes an enormous difference.

**Recognising your flare pattern:**
Keep a symptom diary tracking pain intensity (1–10), location, duration, and any potential triggers (foods, stress events, sleep quality). Most women with endometriosis identify 3–5 personal triggers over 2–3 months of tracking.

**During a flare:**
- NSAIDs (ibuprofen, naproxen) are the most effective first-line analgesic — they directly inhibit prostaglandin synthesis, which drives endometriosis-associated pain. Take them at the onset of symptoms, not after pain peaks.
- Heat therapy alongside NSAIDs provides meaningful additive relief for pelvic pain.
- Gentle movement (restorative yoga, walking) maintains blood flow and can reduce the severity of subsequent flares, but high-intensity exercise during peak pain typically worsens symptoms.

**Between flares — the anti-inflammatory foundation:**
Omega-3 supplementation (2–4g EPA/DHA daily), a diet rich in leafy greens, and minimising refined sugar and trans fats reduce baseline systemic inflammation. Several studies show measurable reductions in dysmenorrhoea scores after 4–6 months of consistent dietary anti-inflammatory practice.

Endometriosis is chronic, but with the right tools it is manageable. You deserve a care team that takes your symptoms seriously.`,
    tags: ["Endometriosis", "PAIN", "HORMONES"],
    isPublished: true,
  },
  {
    id: "seed-article-cycles-1",
    title: "Understanding Your Menstrual Cycle: The Four Phases Explained",
    content: `Your menstrual cycle is far more than your period. It is a sophisticated, 21–35 day hormonal programme that influences your energy, cognition, metabolism, mood, and immune function at every phase. Understanding these phases gives you a powerful lens through which to make decisions about training, nutrition, work, and rest.

**Phase 1 — Menstrual (Days 1–5):**
Oestrogen and progesterone are at their lowest. Energy is reduced and the body is in a repair state. Prioritise iron-rich foods to compensate for blood loss (red meat, lentils, spinach with a vitamin C source). Rest is productive, not lazy.

**Phase 2 — Follicular (Days 6–13):**
Rising oestrogen drives increasing energy, cognitive sharpness, and social motivation. This is often the phase where women feel most themselves. It is an excellent window for high-intensity training, complex creative work, and social engagement. Carbohydrate tolerance is better in this phase.

**Phase 3 — Ovulation (Day 14, roughly):**
The LH surge triggers egg release. Oestrogen peaks, and a small testosterone spike occurs. Energy, confidence, and libido are at their highest. Many women report their best physical performance during this window.

**Phase 4 — Luteal (Days 15–28):**
Progesterone rises and oestrogen dips slightly. Core body temperature increases, metabolism is slightly elevated (~100–300 kcal/day higher), and the brain may feel foggier in the late luteal phase. Cravings intensify due to serotonin fluctuations. Complex carbohydrates (not refined sugar) address cravings while stabilising mood. Wind down training intensity in the final days.

Tracking these patterns over 2–3 cycles builds a personalised performance and wellbeing calendar unique to your biology.`,
    tags: ["General", "HORMONES"],
    isPublished: true,
  },
];

async function main() {
  console.log("Seeding articles...");

  for (const article of SEED_ARTICLES) {
    const { id, ...data } = article;
    await prisma.article.upsert({
      where: { id },
      update: data,
      create: article,
    });
    console.log(`  ✓ [${article.tags.join(", ")}] "${article.title}"`);
  }

  console.log(`\nDone. ${SEED_ARTICLES.length} articles upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
