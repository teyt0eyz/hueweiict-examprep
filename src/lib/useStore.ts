"use client";

import { useSyncExternalStore } from "react";
import { readRaw, STORE_EVENT } from "./storage";

function subscribe(cb: () => void) {
  window.addEventListener(STORE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(STORE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const parsed = new Map<string, { raw: string | null; value: unknown }>();

/** Reactive localStorage value. Returns `fallback` during SSR/prerender and before hydration. */
export function useStore<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  if (raw === null) return fallback;
  const hit = parsed.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  try {
    value = JSON.parse(raw) as T;
  } catch {
    /* fall back */
  }
  parsed.set(key, { raw, value });
  return value;
}

const noop = () => () => {};
/** true only on the client after hydration. */
export const useMounted = () => useSyncExternalStore(noop, () => true, () => false);
