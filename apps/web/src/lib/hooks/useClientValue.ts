"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Reads a browser-only value (URL, storage) without a hydration mismatch:
 * returns `serverValue` during SSR and hydration, then the client value.
 * `read` must return a primitive (or a stable reference) on each call.
 */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}
