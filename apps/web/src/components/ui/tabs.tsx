"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

// Segmented tabs: a recessed track with a raised thumb that slides to the
// active tab. The track/thumb treatment is adapted from Pixel Perfect's
// "Tab background animation" (MIT, see THIRD_PARTY_NOTICES.md). Base UI
// provides the roles, arrow-key navigation and the --active-tab-* variables;
// the slide is a CSS transition, so reduced motion turns it off.

const Tabs = TabsPrimitive.Root;

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex w-fit items-center gap-0.5 rounded-full bg-surface-muted p-1 shadow-[inset_0_1px_2px_rgb(42_22_49/0.08)]",
        className,
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className="absolute top-1/2 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) -translate-y-1/2 rounded-full bg-surface shadow-card ring-1 ring-hairline transition-[translate,width] duration-300 ease-editorial"
      />
    </TabsPrimitive.List>
  );
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "relative z-10 inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap text-ink-muted transition-colors duration-200 outline-none select-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[active]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("mt-4 outline-none focus-visible:outline-2 focus-visible:outline-focus", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTab, TabsPanel };
