// Safe localStorage wrapper: storage may be unavailable (private mode, SSR, quota).
const PREFIX = "hcia:";
export const STORE_EVENT = "hcia:store";

export function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function readStore<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function notify(key: string) {
  try {
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: key }));
  } catch {
    /* ignore */
  }
}

export function writeStore<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  notify(key);
}

export function removeStore(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  notify(key);
}
