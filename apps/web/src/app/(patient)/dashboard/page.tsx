// apps/web/src/app/(patient)/dashboard/page.tsx
"use client";

import { Activity, Calendar, CheckCircle2, Circle, Newspaper, Edit2, Video } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CalendarButtons } from "@/components/appointments/CalendarButtons";
import { CycleLogModal } from "@/components/cycle/CycleLogModal";

interface HabitItem {
  id: number;
  done: boolean;
  title: string;
  desc: string;
}

interface AppointmentData {
  id: string;
  status?: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  practitioner?: { user?: { name?: string } };
}

export default function PatientDashboardPage() {
  const { data: session } = useSession();
  const [nextAppointment, setNextAppointment] = useState<AppointmentData | null>(null);

  // --- INTERACTIVE HABIT TRACKER STATE ---
  const [activeTab, setActiveTab] = useState<"today" | "analytics">("today");
  const [chartPeriod, setChartPeriod] = useState<"week" | "month" | "year">("week");

  // Dynamic States for Personalization
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [articles, setArticles] = useState<{ id: string; title: string; url?: string }[]>([]);

  const [analyticsData, setAnalyticsData] = useState({
    week: [
      { label: "Mon", value: 0 },
      { label: "Tue", value: 0 },
      { label: "Wed", value: 0 },
      { label: "Thu", value: 0 },
      { label: "Fri", value: 0 },
      { label: "Sat", value: 0 },
      { label: "Sun", value: 0 },
    ],
    month: [
      { label: "Wk 1", value: 0 },
      { label: "Wk 2", value: 0 },
      { label: "Wk 3", value: 0 },
      { label: "Wk 4", value: 0 },
    ],
    year: [
      { label: "Jan", value: 0 },
      { label: "Feb", value: 0 },
      { label: "Mar", value: 0 },
      { label: "Apr", value: 0 },
      { label: "May", value: 0 },
      { label: "Jun", value: 0 },
      { label: "Jul", value: 0 },
      { label: "Aug", value: 0 },
      { label: "Sep", value: 0 },
      { label: "Oct", value: 0 },
      { label: "Nov", value: 0 },
      { label: "Dec", value: 0 },
    ],
  });

  // --- INTERACTIVE CYCLE TRACKER STATE ---
  const [isEditingCycle, setIsEditingCycle] = useState(false);
  const [lastPeriodDate, setLastPeriodDate] = useState<string | null>(null);
  const [cycleLength, setCycleLength] = useState(28);

  // --- DATA FETCHING (HYDRATION) ---
  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/habits/analytics");
      if (res.ok) setAnalyticsData(await res.json());
    } catch {
      console.warn("Analytics API not ready yet.");
    }
  };

  const fetchLatestCycle = async () => {
    try {
      const res = await fetch("/api/cycles/latest");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data) {
        setCycleLength(data.cycleLength || 28);
        if (data.lastPeriodDate) {
          setLastPeriodDate(new Date(data.lastPeriodDate).toISOString().split("T")[0]);
        }
      }
    } catch {
      console.warn("Cycles API not ready yet.");
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/habits/analytics")
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
        .then((data) => setAnalyticsData(data))
        .catch(() => {});

      fetch("/api/cycles/latest")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          if (data) {
            setCycleLength(data.cycleLength || 28);
            if (data.lastPeriodDate) {
              setLastPeriodDate(new Date(data.lastPeriodDate).toISOString().split("T")[0]);
            }
          }
        })
        .catch(() => console.warn("Cycles API not ready yet."));

      fetch("/api/personalization")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          if (data) {
            if (data.habits) setHabits(data.habits);
            if (data.articles) setArticles(data.articles);
          }
        })
        .catch(() => console.warn("Personalization API not ready yet."));

      fetch("/api/appointments")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setNextAppointment(data[0]);
          }
        })
        .catch(() => console.warn("Appointments API not ready yet."));
    }
  }, [session]);

  const toggleHabit = async (id: number) => {
    const habitToToggle = habits.find((h) => h.id === id);
    const newStatus = !habitToToggle?.done;
    setHabits(habits.map((h) => (h.id === id ? { ...h, done: newStatus } : h)));

    try {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitId: id,
          completed: newStatus,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      void fetchAnalytics();
    } catch {
      setHabits(habits.map((h) => (h.id === id ? { ...h, done: !newStatus } : h)));
    }
  };

  // --- RENDER LOGIC & MATH ---
  const today = new Date();
  const lastP = lastPeriodDate ? new Date(lastPeriodDate) : new Date();

  const diffTime = lastPeriodDate ? Math.abs(today.getTime() - lastP.getTime()) : 0;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const currentCycleDay = lastPeriodDate ? diffDays % cycleLength || 1 : 1;
  const daysUntilNextPeriod = cycleLength - currentCycleDay;

  // Predicted next period = last logged start date + saved average cycle length
  const predictedNextPeriod = lastPeriodDate ? new Date(lastP.getTime() + cycleLength * 24 * 60 * 60 * 1000) : null;
  const dateFormat: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

  let phaseInfo = "Follicular Phase";
  let phaseDesc = "Estrogen is rising. Focus on light cardio and fresh, vibrant foods.";
  if (currentCycleDay <= 5) {
    phaseInfo = "Menstrual Phase";
    phaseDesc = "Your hormones are at their lowest. Prioritize rest, hydration, and iron-rich foods.";
  } else if (currentCycleDay > 12 && currentCycleDay < 16) {
    phaseInfo = "Ovulation Phase";
    phaseDesc = "High energy expected! Great time for strength training. Keep an eye out for pelvic pain.";
  } else if (currentCycleDay >= 16) {
    phaseInfo = "Luteal Phase";
    phaseDesc = "Progesterone is dominant. You may crave carbs; opt for complex carbs to avoid insulin spikes.";
  }

  const ringCircumference = 283;
  const ringOffset = ringCircumference - (currentCycleDay / cycleLength) * ringCircumference;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">My Health</h1>
          <p className="text-ink-muted mt-1">
            Welcome back, <span className="font-semibold text-brand-ink">{session?.user?.name || "Jane"}</span>.
          </p>
        </div>
        <Link href="/dashboard/symptoms">
          <button className="btn-brand px-6 py-2.5 rounded-full font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" /> Log Today&apos;s Symptoms
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Cycle Ring */}
          <div className="card-surface p-8 relative overflow-hidden">
            <button
              onClick={() => setIsEditingCycle(true)}
              aria-label="Edit cycle details"
              className="absolute top-4 right-4 z-20 text-ink-muted p-2 rounded-full hover:bg-brand-soft hover:text-brand-ink"
            >
              <Edit2 className="w-4 h-4" aria-hidden />
            </button>
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-brand-soft)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="8"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xs font-bold text-brand-ink uppercase">Day</span>
                  <div className="text-4xl font-bold text-ink">{currentCycleDay}</div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <span className="px-3 py-1 rounded-full bg-brand-soft text-brand-ink text-xs font-bold uppercase">
                  {phaseInfo}
                </span>
                <h2 className="text-xl font-bold text-ink">Your Body Today</h2>
                <p className="text-sm text-ink-soft">{phaseDesc}</p>
                <div className="text-xs font-bold text-brand-ink bg-brand-soft px-2.5 py-1.5 rounded-lg inline-flex">
                  {lastPeriodDate ? `Next period in ${daysUntilNextPeriod} days` : "Log a period to begin tracking"}
                </div>
                {lastPeriodDate && predictedNextPeriod && (
                  <div className="flex flex-wrap gap-4 pt-1 text-xs text-ink-muted">
                    <span>
                      Last Period:{" "}
                      <span className="font-semibold text-ink-soft">
                        {lastP.toLocaleDateString("en-US", dateFormat)}
                      </span>
                    </span>
                    <span>
                      Predicted Next Period:{" "}
                      <span className="font-semibold text-ink-soft">
                        {predictedNextPeriod.toLocaleDateString("en-US", dateFormat)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <CycleLogModal
              isOpen={isEditingCycle}
              onClose={() => setIsEditingCycle(false)}
              onSuccess={fetchLatestCycle}
            />
          </div>

          {/* Daily Action Plan & Tabs */}
          <div className="card-surface overflow-hidden flex flex-col">
            <div className="flex border-b border-brand-line/60 bg-brand-soft/30">
              <button
                onClick={() => setActiveTab("today")}
                className={`flex-1 py-4 text-sm font-bold ${activeTab === "today" ? "text-brand-ink border-b-2 border-brand bg-surface" : "text-ink-muted"}`}
              >
                Today&apos;s Plan
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex-1 py-4 text-sm font-bold ${activeTab === "analytics" ? "text-brand-ink border-b-2 border-brand bg-surface" : "text-ink-muted"}`}
              >
                Habit Analytics
              </button>
            </div>

            {activeTab === "analytics" && (
              <div className="flex justify-center gap-2 pt-4 px-6">
                {["week", "month", "year"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period as "week" | "month" | "year")}
                    className={`px-3 py-1 text-xs font-bold rounded-full capitalize transition-colors ${chartPeriod === period ? "bg-brand-soft text-brand-ink" : "text-ink-muted hover:bg-brand-soft"}`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "today" ? (
              <div className="p-6 space-y-4">
                {habits.length > 0 ? (
                  habits.map((habit) => (
                    <div
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id)}
                      className="flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-surface-muted"
                    >
                      {habit.done ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-ink" />
                      ) : (
                        <Circle className="w-5 h-5 text-field" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${habit.done ? "line-through text-ink-muted" : "text-ink"}`}>
                          {habit.title}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5">{habit.desc}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-ink-muted py-4 text-center">Loading your personalized plan...</div>
                )}
              </div>
            ) : (
              <div className="p-6 h-48 flex items-end justify-between gap-2 mt-4">
                {analyticsData[chartPeriod as keyof typeof analyticsData]?.map((data, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full bg-brand rounded-t-sm transition-all duration-500"
                      style={{ height: `${Math.max(data.value, 4)}%` }}
                    ></div>
                    <span className="text-[9px] text-ink-muted mt-2 uppercase font-semibold">{data.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          {/* Dynamic Telehealth Card */}
          {nextAppointment ? (
            <div className="bg-brand-pressed rounded-2xl p-6 text-white shadow-md shadow-brand-line space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-surface opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex justify-between items-center relative z-10">
                <Calendar className="w-5 h-5 text-on-brand/80" />
                <span className="bg-white/20 text-on-brand text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
                  {nextAppointment.status || "CONFIRMED"}
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-bold">Dr. {nextAppointment.practitioner?.user?.name || "Specialist"}</h3>
                <p className="text-sm text-on-brand mt-1 font-medium">
                  {new Date(nextAppointment.startTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-on-brand/80 mt-0.5">
                  {new Date(nextAppointment.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="relative z-10">
                <CalendarButtons
                  appointment={{
                    id: nextAppointment.id,
                    startTime: new Date(nextAppointment.startTime).toISOString(),
                    endTime: new Date(nextAppointment.endTime).toISOString(),
                    meetingLink: nextAppointment.meetingLink,
                  }}
                  title={`NauriCare — Dr. ${nextAppointment.practitioner?.user?.name || "Specialist"}`}
                  variant="rose"
                />
              </div>
              <Link href={`/dashboard/telehealth/${nextAppointment.id}`} className="block relative z-10">
                <button className="w-full bg-surface text-brand-ink text-sm font-bold py-3 rounded-xl hover:bg-brand-soft transition-all shadow-sm flex justify-center items-center gap-2">
                  <Video className="w-4 h-4" /> Join Video Room
                </button>
              </Link>
            </div>
          ) : (
            <div className="bg-brand-pressed rounded-2xl p-6 text-white shadow-md shadow-brand-line space-y-4">
              <div className="flex justify-between items-center">
                <Calendar className="w-5 h-5 text-on-brand/80" />
                <span className="bg-white/20 text-on-brand text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
                  Available Now
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Telehealth Session</h3>
                <p className="text-xs text-on-brand mt-1">
                  Book a secure consultation with a verified specialist to discuss your health goals.
                </p>
              </div>
              <Link href="/dashboard/providers" className="block">
                <button className="w-full bg-surface text-brand-ink text-xs font-bold py-2.5 rounded-xl hover:bg-brand-soft transition-colors">
                  Find a Specialist
                </button>
              </Link>
            </div>
          )}

          {/* Curated Feed (Dynamic) */}
          <div className="card-surface p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-brand-line/60 pb-3">
              <h3 className="font-bold text-ink flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-lavender" /> Today&apos;s Insights
              </h3>
            </div>
            <div className="space-y-3">
              {articles.length > 0 ? (
                articles.map((article, idx) => (
                  <Link
                    key={idx}
                    href={article.url ?? "#"}
                    className="block text-xs font-bold text-ink hover:text-brand-ink cursor-pointer"
                  >
                    {article.title}
                  </Link>
                ))
              ) : (
                <div className="text-xs text-ink-muted">Curating articles for you...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
