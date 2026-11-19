"use client";

import type { QItem } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const V = process.env.NEXT_PUBLIC_DATA_VERSION ?? "";

export type BankIndex = { total: number; modules: Record<string, { count: number; topics: string[] }> };

const cache = new Map<string, Promise<unknown>>();

function getJson<T>(url: string, fallback: T): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(`${BASE}${url}?v=${V}`)
        .then((r) => (r.ok ? r.json() : fallback))
        .catch(() => {
          cache.delete(url);
          return fallback;
        }),
    );
  }
  return cache.get(url) as Promise<T>;
}

export const loadIndex = () => getJson<BankIndex>("/data/index.json", { total: 0, modules: {} });

export const loadModule = (m: string) => getJson<QItem[]>(`/data/q/${m.toLowerCase()}.json`, []);

export const loadMockSet = (id: string) => getJson<{ ids: string[] } | null>(`/data/mocks/${id}.json`, null);

export async function loadModules(mods: string[]): Promise<QItem[]> {
  const lists = await Promise.all([...new Set(mods)].map(loadModule));
  return lists.flat();
}

export async function loadAll(): Promise<QItem[]> {
  const idx = await loadIndex();
  return loadModules(Object.keys(idx.modules));
}

/** Module is encoded in the id prefix: "m5-ospf-012" → "M5". */
export const moduleOf = (id: string) => id.split("-")[0].toUpperCase();

export async function loadByIds(ids: string[]): Promise<QItem[]> {
  const all = await loadModules(ids.map(moduleOf));
  const map = new Map(all.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter((q): q is QItem => !!q);
}
