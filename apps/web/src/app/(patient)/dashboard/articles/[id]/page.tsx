import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Clock, Tag } from "lucide-react";

const TAG_COLORS: Record<string, string> = {
  PCOS:           "bg-violet-100 text-violet-700",
  Fibroids:       "bg-rose-100 text-rose-700",
  Endometriosis:  "bg-pink-100 text-pink-700",
  General:        "bg-teal-100 text-teal-700",
  HORMONES:       "bg-amber-100 text-amber-700",
  PAIN:           "bg-orange-100 text-orange-700",
};

function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.split(" ").length / 200));
}

// Renders a paragraph, converting **bold** markers to <strong> without a library.
function RichParagraph({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-gray-700 leading-relaxed text-base md:text-[17px]">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
        className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-800 mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Library
      </Link>

      {/* Article header */}
      <header className="space-y-5 mb-10">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => {
            const cls = TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600";
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
        <h1 className="text-3xl md:text-4xl font-extrabold text-teal-900 leading-tight">
          {article.title}
        </h1>

        {/* Meta row */}
        <div className="flex items-center gap-5 text-sm text-gray-400 border-b border-gray-100 pb-6">
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
              .map((line) =>
                line.replace(/^[-*]\s?/, "").replace(/\*\*/g, "")
              )
              .filter(Boolean);
            return (
              <ul key={i} className="space-y-2 pl-2">
                {items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-gray-700 leading-relaxed text-base md:text-[17px]">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
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
      <div className="mt-12 bg-teal-50 border border-teal-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-bold text-teal-900">Ready to discuss this with a specialist?</p>
          <p className="text-sm text-teal-700 mt-0.5">Book a secure telehealth consultation.</p>
        </div>
        <Link href="/dashboard/providers">
          <button className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors">
            Find a Specialist
          </button>
        </Link>
      </div>
    </div>
  );
}
