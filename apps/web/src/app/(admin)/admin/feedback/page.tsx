"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Search, MessageSquareHeart, TrendingUp, Users, Loader2 } from "lucide-react";

type Category = "GENERAL" | "BUG_REPORT" | "FEATURE_REQUEST" | "PROVIDER_EXPERIENCE" | "BILLING";
type Status = "NEW" | "REVIEWED" | "ACTIONED";

interface FeedbackItem {
  id: string;
  rating: number;
  category: Category;
  comment: string;
  status: Status;
  createdAt: string;
  user: { name: string; email: string; role: string };
}

interface FeedbackStats {
  total: number;
  averageRating: number;
  csatPercent: number;
  byCategory: Partial<Record<Category, number>>;
  byStatus: Partial<Record<Status, number>>;
}

const CATEGORY_LABELS: Record<Category, string> = {
  GENERAL: "General",
  BUG_REPORT: "Bug Report",
  FEATURE_REQUEST: "Feature Request",
  PROVIDER_EXPERIENCE: "Provider Experience",
  BILLING: "Billing",
};

const CATEGORY_BADGE: Record<Category, string> = {
  GENERAL: "bg-slate-50 text-slate-700 border-slate-200",
  BUG_REPORT: "bg-red-50 text-red-700 border-red-200",
  FEATURE_REQUEST: "bg-blue-50 text-blue-700 border-blue-200",
  PROVIDER_EXPERIENCE: "bg-purple-50 text-purple-700 border-purple-200",
  BILLING: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_BADGE: Record<Status, string> = {
  NEW: "bg-amber-50 text-amber-700 border-amber-200",
  REVIEWED: "bg-blue-50 text-blue-700 border-blue-200",
  ACTIONED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function StarRow({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const fetchFeedback = useCallback(() => {
    const params = new URLSearchParams();
    if (ratingFilter) params.set("rating", ratingFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    fetch(`/api/admin/feedback?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data: { items: FeedbackItem[]; stats: FeedbackStats }) => {
        setItems(data.items);
        setStats(data.stats);
      })
      .catch(() => console.error("Failed to fetch feedback"))
      .finally(() => setIsLoading(false));
  }, [ratingFilter, categoryFilter, statusFilter, search]);

  useEffect(() => {
    const handle = setTimeout(fetchFeedback, 250); // debounce search typing
    return () => clearTimeout(handle);
  }, [fetchFeedback]);

  async function handleStatusChange(id: string, status: Status) {
    setUpdatingId(id);
    const previous = items;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems(previous); // roll back on failure
      alert("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <MessageSquareHeart className="w-8 h-8 text-teal-600" />
          User Feedback
        </h1>
        <p className="text-gray-500 mt-1">Satisfaction analytics and feedback triage across patients and providers.</p>
      </div>

      {/* CSAT & Sentiment Analytics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Rating</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-extrabold text-gray-900">
              {stats ? stats.averageRating.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-gray-400">/ 5.0</span>
          </div>
          <StarRow rating={stats?.averageRating ?? 0} />
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">CSAT Score</p>
          <div className="flex items-center gap-2 mt-1.5">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span className="text-2xl font-extrabold text-gray-900">{stats?.csatPercent ?? 0}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Share of 4–5★ ratings</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Feedback</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Users className="w-5 h-5 text-teal-500" />
            <span className="text-2xl font-extrabold text-gray-900">{stats?.total ?? 0}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats?.byStatus.NEW ?? 0} new · {stats?.byStatus.REVIEWED ?? 0} reviewed · {stats?.byStatus.ACTIONED ?? 0} actioned
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">By Category</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
              <span key={cat} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CATEGORY_BADGE[cat]}`}>
                {CATEGORY_LABELS[cat]}: {stats?.byCategory[cat] ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search feedback text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{r} Star{r === 1 ? "" : "s"}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Categories</option>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ACTIONED">Actioned</option>
        </select>
      </div>

      {/* Feedback list */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading feedback…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <MessageSquareHeart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No feedback matches these filters</h3>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-3 flex-wrap">
                      <StarRow rating={item.rating} />
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CATEGORY_BADGE[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 mt-2 leading-relaxed">{item.comment}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {item.user.name} ({item.user.email}) · {item.user.role} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(["NEW", "REVIEWED", "ACTIONED"] as Status[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(item.id, s)}
                        disabled={updatingId === item.id || item.status === s}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors disabled:cursor-default ${
                          item.status === s
                            ? STATUS_BADGE[s]
                            : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
                        }`}
                      >
                        {s === "NEW" ? "Mark New" : s === "REVIEWED" ? "Mark Reviewed" : "Mark Actioned"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
