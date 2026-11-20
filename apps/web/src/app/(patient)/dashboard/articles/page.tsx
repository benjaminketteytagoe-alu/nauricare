"use client";

import { BookOpen, Sparkles, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

type Article = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
};

const FILTER_TAGS = ["All", "PCOS", "Fibroids", "Endometriosis", "General", "HORMONES", "PAIN"];

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

function excerpt(content: string, length = 130) {
  const plain = content.replace(/\*\*/g, "");
  return plain.length > length ? plain.slice(0, length).trimEnd() + "…" : plain;
}

function TagPill({ tag, small = false }: { tag: string; small?: boolean }) {
  const cls = TAG_COLORS[tag] ?? "bg-surface-muted text-ink-soft";
  return (
    <span className={`${small ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"} rounded-full font-bold ${cls}`}>
      {tag}
    </span>
  );
}

function ArticleSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-hairline p-6 space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-surface-muted rounded-full" />
        <div className="h-5 w-20 bg-surface-muted rounded-full" />
      </div>
      <div className="h-5 bg-hairline rounded w-4/5" />
      <div className="h-4 bg-surface-muted rounded w-full" />
      <div className="h-4 bg-surface-muted rounded w-3/4" />
    </div>
  );
}

export default function ArticleLibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/articles").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
    ]).then(([arts, settings]) => {
      setArticles(arts);
      setHealthGoals(settings?.healthGoals ?? []);
      setIsLoading(false);
    });
  }, []);

  // Select the featured article: first one whose tags intersect with health goals,
  // falling back to the newest article in the list.
  const featured =
    articles.find((a) => healthGoals.length > 0 && a.tags.some((t) => healthGoals.includes(t))) ?? articles[0];

  const grid = articles.filter((a) => {
    if (a.id === featured?.id) return false;
    if (activeTag === "All") return true;
    return a.tags.includes(activeTag);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-brand-ink" />
            Health Library
          </h1>
          <p className="text-ink-muted mt-1">Evidence-based insights, curated for you.</p>
        </div>
      </div>

      {/* ── Featured Insight Hero ── */}
      {isLoading ? (
        <div className="h-56 bg-brand-pressed rounded-3xl animate-pulse" />
      ) : featured ? (
        <div className="relative bg-brand-pressed rounded-3xl p-8 md:p-10 text-white overflow-hidden shadow-lg">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-lavender/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase text-on-brand/80 bg-white/10 px-3 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" /> Daily Insight
                </span>
                {featured.tags.slice(0, 2).map((t) => (
                  <span key={t} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-on-brand">
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-snug">{featured.title}</h2>
              <p className="text-sm text-on-brand leading-relaxed max-w-xl">{excerpt(featured.content, 160)}</p>
              <div className="flex items-center gap-4 pt-1">
                <span className="flex items-center gap-1.5 text-xs text-on-brand/80">
                  <Clock className="w-3.5 h-3.5" /> {readingTime(featured.content)} min read
                </span>
                <Link href={`/dashboard/articles/${featured.id}`}>
                  <button className="flex items-center gap-2 bg-surface text-brand-ink text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand-soft transition-colors shadow-sm">
                    Read Insight <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Tag filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              activeTag === tag
                ? "bg-brand text-white shadow-sm"
                : "bg-surface border border-hairline text-ink-soft hover:border-brand-line hover:text-brand-ink"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* ── Article grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <>
            <ArticleSkeleton />
            <ArticleSkeleton />
            <ArticleSkeleton />
          </>
        ) : grid.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-ink-muted">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No articles for this topic yet.</p>
            <button onClick={() => setActiveTag("All")} className="text-sm text-brand-ink mt-2 hover:underline">
              Show all articles
            </button>
          </div>
        ) : (
          grid.map((article) => (
            <Link key={article.id} href={`/dashboard/articles/${article.id}`} className="group block">
              <article className="h-full card-surface hover:shadow-md hover:border-brand-line transition-all p-6 flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.slice(0, 3).map((t) => (
                    <TagPill key={t} tag={t} small />
                  ))}
                </div>
                <h3 className="text-base font-bold text-ink group-hover:text-brand-ink transition-colors leading-snug">
                  {article.title}
                </h3>
                <p className="text-sm text-ink-muted flex-1 leading-relaxed">{excerpt(article.content)}</p>
                <div className="flex items-center justify-between pt-1 border-t border-hairline">
                  <span className="flex items-center gap-1 text-xs text-ink-muted">
                    <Clock className="w-3 h-3" /> {readingTime(article.content)} min read
                  </span>
                  <span className="text-xs font-bold text-brand-ink flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
