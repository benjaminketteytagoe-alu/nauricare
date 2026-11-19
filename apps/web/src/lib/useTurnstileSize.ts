"use client";

import { useSyncExternalStore } from "react";

// Cloudflare Turnstile's normal widget is a fixed 300px, which doesn't fit a
// padded card on ~320px phones. Use the 150px "compact" widget there.

const QUERY = "(max-width: 359px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function useTurnstileSize(): "compact" | "normal" {
  return useSyncExternalStore(subscribe, () => (window.matchMedia(QUERY).matches ? "compact" : "normal"), () => "normal");
}
