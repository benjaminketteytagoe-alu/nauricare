"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore,
  type ReactNode,
} from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

// ─── Shared collapsible sidebar for the patient, provider and admin portals ──
// Desktop (lg+): in-flow sticky column, collapsible between w-64 and w-20,
// state persisted in localStorage. Below lg: off-canvas drawer, always
// expanded. Each portal keeps its own colour tone.

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export type SidebarTone = "light" | "dark";

const STORAGE_KEY = "nauricare_sidebar_collapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";

interface SidebarState {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  ready: boolean;
}

const SidebarContext = createContext<SidebarState | null>(null);

export function useSidebar(): SidebarState {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

// localStorage-backed preference exposed as an external store, so React reads
// it without setState-in-effect and every sidebar instance stays in sync.
const COLLAPSE_EVENT = "nauricare:sidebar-collapsed";

// Fallback when storage is blocked: the toggle still works for this page view.
let memoryCollapsed = false;

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return memoryCollapsed;
  }
}

function subscribeCollapsed(cb: () => void) {
  window.addEventListener(COLLAPSE_EVENT, cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Enable width transitions one frame after hydration, so a sidebar that
  // loads collapsed snaps into place instead of animating on every page load.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Close the mobile drawer after navigation (state adjusted during render,
  // React's recommended alternative to a setState-in-effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggleCollapsed = useCallback(() => {
    const next = !readCollapsed();
    memoryCollapsed = next;
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* storage blocked: memoryCollapsed carries the state */
    }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, mobileOpen, setMobileOpen, ready }),
    [collapsed, toggleCollapsed, mobileOpen, ready],
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

const TONE = {
  light: {
    aside: "nav-glass border-r border-rose-100",
    divider: "border-rose-100",
    label: "text-rose-600",
    active: "nav-pill-active",
    idle: "rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600",
    iconIdle: "text-slate-400 group-hover:text-rose-600",
    iconActive: "text-white",
    monogram: "bg-rose-600 text-white",
    control: "text-slate-500 hover:bg-rose-50 hover:text-rose-600",
  },
  dark: {
    aside: "bg-teal-900 text-teal-50 lg:shadow-xl",
    divider: "border-teal-800",
    label: "text-teal-300",
    active: "rounded-xl bg-teal-800 text-white shadow-sm",
    idle: "rounded-xl text-teal-100 hover:bg-teal-800/50 hover:text-white",
    iconIdle: "text-teal-200 group-hover:text-white",
    iconActive: "text-white",
    monogram: "bg-white text-teal-900",
    control: "text-teal-100 hover:bg-teal-800/50 hover:text-white",
  },
} as const;

/** Icon + label row for sidebar actions (sign out, feedback, collapse). */
export function SidebarAction({
  icon: Icon,
  label,
  onClick,
  tone,
  collapsed,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: SidebarTone;
  collapsed: boolean;
}) {
  return (
    <Tooltip label={label} disabled={!collapsed}>
      <button
        type="button"
        onClick={onClick}
        aria-label={collapsed ? label : undefined}
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${TONE[tone].control} ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        <span className={collapsed ? "sr-only" : ""}>{label}</span>
      </button>
    </Tooltip>
  );
}

export function SidebarMobileTrigger({ className = "" }: { className?: string }) {
  const { setMobileOpen } = useSidebar();
  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label="Open navigation menu"
      className={`rounded-xl p-2 transition-colors lg:hidden ${className}`}
    >
      <Menu className="h-6 w-6" aria-hidden />
    </button>
  );
}

function Brand({ homeHref, tone, compact }: { homeHref: string; tone: SidebarTone; compact: boolean }) {
  const t = TONE[tone];
  return (
    <Link href={homeHref} className="flex items-center transition-opacity hover:opacity-80" aria-label="NauriCare home">
      {compact ? (
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-extrabold shadow-sm ${t.monogram}`} aria-hidden>
          N
        </span>
      ) : (
        <span className={tone === "dark" ? "rounded-lg bg-white p-1.5 shadow-sm" : ""}>
          <Image src="/logo-horizontal.jpg" alt="NauriCare" width={160} height={40} className="h-8 w-auto object-contain" priority />
        </span>
      )}
    </Link>
  );
}

export function AppSidebar({
  items,
  homeHref,
  portalLabel,
  tone,
  footer,
}: {
  items: NavItem[];
  homeHref: string;
  portalLabel: string;
  tone: SidebarTone;
  /** Footer actions; receives whether the sidebar is currently icon-only. */
  footer?: (iconOnly: boolean) => ReactNode;
}) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen, ready } = useSidebar();
  const t = TONE[tone];
  // The mobile drawer is always shown expanded, whatever the desktop setting.
  const iconOnly = collapsed && isDesktop;

  return (
    <>
      {mobileOpen && (
        <div aria-hidden onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
      )}

      <aside
        aria-label={`${portalLabel} navigation`}
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col shadow-xl",
          "lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          ready ? "transition-all duration-300 ease-in-out" : "",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-20" : "lg:w-64",
          t.aside,
        ].join(" ")}
      >
        {/* Brand */}
        <div className={`flex h-16 shrink-0 items-center justify-between border-b px-4 lg:h-20 ${t.divider} ${iconOnly ? "lg:justify-center lg:px-0" : ""}`}>
          <div className="min-w-0">
            <Brand homeHref={homeHref} tone={tone} compact={iconOnly} />
            {!iconOnly && (
              <p className={`ml-1 mt-1.5 hidden text-[10px] font-extrabold uppercase tracking-[0.2em] lg:block ${t.label}`}>
                {portalLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className={`rounded-lg p-1.5 lg:hidden ${t.control}`}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 ${iconOnly ? "lg:px-2" : ""}`}>
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== homeHref && pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Tooltip key={item.href} label={item.name} disabled={!iconOnly}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={iconOnly ? item.name : undefined}
                  className={`group flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors ${
                    active ? t.active : t.idle
                  } ${iconOnly ? "justify-center px-0" : ""}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? t.iconActive : t.iconIdle}`} aria-hidden />
                  <span className={`truncate ${iconOnly ? "sr-only" : ""}`}>{item.name}</span>
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`shrink-0 space-y-1 border-t p-3 ${t.divider} ${iconOnly ? "lg:px-2" : ""}`}>
          {footer?.(iconOnly)}
          <div className="hidden lg:block">
            <SidebarAction
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
              tone={tone}
              collapsed={iconOnly}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
