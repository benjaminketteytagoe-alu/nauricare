import { ArrowLeft, Clock, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const TAG_COLORS: Record<string, string> = {
  PCOS: "bg-lavender-soft text-lavender",
  Fibroids: "bg-brand-soft text-brand-ink",
  Endometriosis: "bg-lavender-soft text-lavender",
  General: "bg-brand-soft text-brand-ink",
  HORMONES: "bg-warning-soft text-warning",
  PAIN: "bg-warning-soft text-warning",
};

function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.split(" ").length / 200));
}

// Renders a paragraph, converting **bold** markers to <strong> without a library.
function RichParagraph({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-ink-soft leading-relaxed text-base md:text-[17px]">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const article = await prisma.article.findFirst({
    where: { id, isPublished: true },
  });

  if (!article) notFound();

  const paragraphs = article.content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const publishedDate = new Date(article.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto pb-16 animate-in fade-in duration-500">
      {/* Back navigation */}
      <Link
        href="/dashboard/articles"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-ink hover:text-brand-ink mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Library
      </Link>

      {/* Article header */}
      <header className="space-y-5 mb-10">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => {
            const cls = TAG_COLORS[tag] ?? "bg-surface-muted text-ink-soft";
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${cls}`}
              >
                <Tag className="w-2.5 h-2.5" /> {tag}
              </span>
            );
          })}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink leading-tight">{article.title}</h1>

        {/* Meta row */}
        <div className="flex items-center gap-5 text-sm text-ink-muted border-b border-hairline pb-6">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {readingTime(article.content)} min read
          </span>
          <span>Published {publishedDate}</span>
        </div>
      </header>

      {/* Article body */}
      <article className="space-y-5">
        {paragraphs.map((para, i) => {
          // Bullet-point sections start with a dash or asterisk after a newline
          if (para.startsWith("-") || para.startsWith("*")) {
            const items = para
              .split("\n")
              .map((line) => line.replace(/^[-*]\s?/, "").replace(/\*\*/g, ""))
              .filter(Boolean);
            return (
              <ul key={i} className="space-y-2 pl-2">
                {items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-ink-soft leading-relaxed text-base md:text-[17px]">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          }

          return <RichParagraph key={i} text={para} />;
        })}
      </article>

      {/* Footer CTA */}
      <div className="mt-12 bg-brand-soft border border-brand-line rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-bold text-brand-ink">Ready to discuss this with a specialist?</p>
          <p className="text-sm text-brand-ink mt-0.5">Book a secure telehealth consultation.</p>
        </div>
        <Link href="/dashboard/providers">
          <button className="shrink-0 btn-brand text-sm font-bold px-6 py-3 rounded-xl">Find a Specialist</button>
        </Link>
      </div>
    </div>
  );
}
