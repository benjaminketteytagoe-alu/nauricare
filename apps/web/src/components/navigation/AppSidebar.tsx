"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Tooltip } from "@/components/ui/tooltip";

// ─── Shared collapsible sidebar for the patient, provider and admin portals ──
// Desktop (lg+): in-flow sticky column, collapsible between w-64 and w-20,
// state persisted in localStorage. Below lg: off-canvas drawer, always
// expanded. Patients get the light ivory tone; staff portals the plum one.
// Colours are semantic tokens only (tokens.css), so dark mode follows.

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/** A labelled group of links. Omit the label for the first, top-level group. */
export interface NavSection {
  label?: string;
  items: NavItem[];
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
    aside: "bg-surface border-r border-hairline",
    divider: "border-hairline",
    portal: "text-brand-ink",
    section: "text-ink-muted",
    active: "bg-brand-soft text-brand-ink font-semibold",
    indicator: "bg-brand",
    idle: "text-ink-soft hover:bg-surface-muted hover:text-ink",
    iconIdle: "text-ink-muted group-hover:text-ink",
    iconActive: "text-brand-ink",
    monogram: "bg-brand text-on-brand",
    control: "text-ink-soft hover:bg-surface-muted hover:text-ink",
  },
  dark: {
    aside: "bg-surface-inverse text-ink-inverse",
    divider: "border-ink-inverse/10",
    portal: "text-brand-line",
    section: "text-ink-inverse/60",
    active: "bg-ink-inverse/10 text-ink-inverse font-semibold",
    indicator: "bg-brand-line",
    idle: "text-ink-inverse/75 hover:bg-ink-inverse/5 hover:text-ink-inverse",
    iconIdle: "text-ink-inverse/60 group-hover:text-ink-inverse",
    iconActive: "text-ink-inverse",
    monogram: "bg-ink-inverse text-ink",
    control: "text-ink-inverse/75 hover:bg-ink-inverse/5 hover:text-ink-inverse",
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
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ease-editorial ${TONE[tone].control} ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
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
      className={`rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink lg:hidden ${className}`}
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
        <span
          className={`flex size-10 items-center justify-center rounded-xl font-display text-xl shadow-button ${t.monogram}`}
          aria-hidden
        >
          N
        </span>
      ) : (
        <span className={tone === "dark" ? "rounded-lg bg-white p-1.5 shadow-sm" : ""}>
          <Image
            src="/logo-horizontal.jpg"
            alt="NauriCare"
            width={160}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
        </span>
      )}
    </Link>
  );
}

export function AppSidebar({
  sections,
  homeHref,
  portalLabel,
  tone,
  footer,
}: {
  sections: NavSection[];
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
        <div aria-hidden onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />
      )}

      <aside
        aria-label={`${portalLabel} navigation`}
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col shadow-xl",
          "lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          ready ? "transition-[width,transform] duration-300 ease-editorial" : "",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-20" : "lg:w-64",
          t.aside,
        ].join(" ")}
      >
        {/* Brand */}
        <div
          className={`flex h-16 shrink-0 items-center justify-between border-b px-4 lg:h-20 ${t.divider} ${iconOnly ? "lg:justify-center lg:px-0" : ""}`}
        >
          <div className="min-w-0">
            <Brand homeHref={homeHref} tone={tone} compact={iconOnly} />
            {!iconOnly && (
              <p className={`ml-1 mt-1.5 hidden text-eyebrow font-semibold uppercase lg:block ${t.portal}`}>
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
        <nav className={`flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3 ${iconOnly ? "lg:px-2" : ""}`}>
          {sections.map((section, i) => (
            <div key={section.label ?? i} role="group" aria-label={section.label}>
              {section.label &&
                (iconOnly ? (
                  <hr className={`mx-3 mb-3 ${t.divider}`} />
                ) : (
                  <p className={`mb-1 px-3 text-eyebrow font-semibold uppercase ${t.section}`}>{section.label}</p>
                ))}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href || (item.href !== homeHref && pathname?.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Tooltip label={item.name} disabled={!iconOnly}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          aria-label={iconOnly ? item.name : undefined}
                          className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ease-editorial ${
                            active ? t.active : t.idle
                          } ${iconOnly ? "justify-center px-0" : ""}`}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className={`absolute inset-y-2 -left-3 w-1 rounded-r-full ${t.indicator} ${iconOnly ? "lg:-left-2" : ""}`}
                            />
                          )}
                          <Icon className={`size-5 shrink-0 ${active ? t.iconActive : t.iconIdle}`} aria-hidden />
                          <span className={`truncate ${iconOnly ? "sr-only" : ""}`}>{item.name}</span>
                        </Link>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
