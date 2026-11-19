"use client";

import { readStore, removeStore, writeStore } from "./storage";
import type { Attempt, HistoryEntry, SrsItem } from "./types";

const DAY = 86_400_000;
/** Leitner intervals by box (1 = due now). Box 6 = mastered (removed). */
const INTERVAL = [0, 0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY];

// ---- attempts in progress ----
export const getAttempt = (mockId: string) => readStore<Attempt | null>(`attempt:${mockId}`, null);
export const saveAttempt = (a: Attempt) => writeStore(`attempt:${a.mockId}`, a);
export const clearAttempt = (mockId: string) => removeStore(`attempt:${mockId}`);

// ---- history ----
const HISTORY_MAX = 50;
export const getHistory = () => readStore<HistoryEntry[]>("history", []);
export function addHistory(h: HistoryEntry) {
  writeStore("history", [h, ...getHistory().filter((x) => x.attemptId !== h.attemptId)].slice(0, HISTORY_MAX));
}
export const getHistoryEntry = (attemptId: string) => getHistory().find((h) => h.attemptId === attemptId) ?? null;

// ---- pending question lists for retry / review modes ----
export const setPending = (mockId: string, ids: string[]) => writeStore(`pending:${mockId}`, ids);
export const getPending = (mockId: string) => readStore<string[]>(`pending:${mockId}`, []);

// ---- bookmarks ----
export const getBookmarks = () => readStore<string[]>("bookmarks", []);
export function toggleBookmark(id: string): string[] {
  const cur = getBookmarks();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
  writeStore("bookmarks", next);
  window.dispatchEvent(new Event("hcia:bookmarks"));
  return next;
}

// ---- spaced repetition of wrong answers ----
export const getSrs = () => readStore<Record<string, SrsItem>>("srs", {});
export function recordResults(results: { id: string; correct: boolean }[]) {
  const srs = getSrs();
  const now = Date.now();
  for (const { id, correct } of results) {
    const item = srs[id];
    if (!correct) {
      srs[id] = { box: 1, due: now, wrong: (item?.wrong ?? 0) + 1, lastWrong: now };
    } else if (item) {
      const box = item.box + 1;
      if (box >= INTERVAL.length) delete srs[id];
      else srs[id] = { ...item, box, due: now + INTERVAL[box] };
    }
  }
  writeStore("srs", srs);
}
export const dueIds = (srs = getSrs(), now = Date.now()) =>
  Object.entries(srs)
    .filter(([, s]) => s.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);

// ---- lesson progress ----
export type LessonProgress = Record<string, { visitedAt: number; done: boolean }>;
export const getLessonProgress = () => readStore<LessonProgress>("lessons", {});
export function markLessonVisited(slug: string) {
  const p = getLessonProgress();
  p[slug] = { visitedAt: Date.now(), done: p[slug]?.done ?? false };
  writeStore("lessons", p);
  writeStore("lastLesson", slug);
}
export function setLessonDone(slug: string, done: boolean) {
  const p = getLessonProgress();
  p[slug] = { visitedAt: p[slug]?.visitedAt ?? Date.now(), done };
  writeStore("lessons", p);
}
export const getLastLesson = () => readStore<string | null>("lastLesson", null);
