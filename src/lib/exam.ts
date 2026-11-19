import { FULL_QUOTA, PASS_SCORE } from "./mocks";
import type { Attempt, HistoryEntry, ModuleScore, QItem } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isCorrect(q: QItem, ans: string[] | undefined): boolean {
  if (!ans || ans.length === 0) return false;
  if (q.type === "ordering") return ans.length === q.answer.length && ans.every((a, i) => a === q.answer[i]);
  // multiple-answer must match exactly — no partial credit
  return ans.length === q.answer.length && q.answer.every((a) => ans.includes(a));
}

/** Option display order: shuffled, except True/False keeps its natural order. */
export function makeOptionOrder(qs: QItem[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const q of qs) {
    const ids = q.options.map((o) => o.id);
    out[q.id] = q.type === "truefalse" ? ids : shuffle(ids);
  }
  return out;
}

/** Weighted random pick for a full mock; tops up from the rest of the bank if a module is short. */
export function pickWeighted(bank: QItem[], total: number): QItem[] {
  const byMod = new Map<string, QItem[]>();
  for (const q of bank) byMod.set(q.module, [...(byMod.get(q.module) ?? []), q]);
  const picked: QItem[] = [];
  for (const [m, n] of Object.entries(FULL_QUOTA)) picked.push(...shuffle(byMod.get(m) ?? []).slice(0, n));
  if (picked.length < total) {
    const chosen = new Set(picked.map((q) => q.id));
    picked.push(...shuffle(bank.filter((q) => !chosen.has(q.id))).slice(0, total - picked.length));
  }
  return picked.slice(0, total);
}

export function newAttempt(mockId: string, title: string, qs: QItem[], minutes: number | null, instant: boolean): Attempt {
  const now = Date.now();
  const ordered = shuffle(qs);
  return {
    attemptId: `${mockId}-${now.toString(36)}`,
    mockId,
    title,
    instant,
    questionIds: ordered.map((q) => q.id),
    optionOrder: makeOptionOrder(ordered),
    answers: {},
    checked: [],
    flags: [],
    current: 0,
    startedAt: now,
    deadline: minutes ? now + minutes * 60_000 : null,
  };
}

export function grade(att: Attempt, qs: QItem[], timedOut: boolean): HistoryEntry {
  const map = new Map(qs.map((q) => [q.id, q]));
  const perModule: Record<string, ModuleScore> = {};
  let correct = 0;
  for (const id of att.questionIds) {
    const q = map.get(id);
    if (!q) continue;
    const ok = isCorrect(q, att.answers[id]);
    const s = (perModule[q.module] ??= { correct: 0, total: 0 });
    s.total++;
    if (ok) {
      s.correct++;
      correct++;
    }
  }
  const total = att.questionIds.length;
  const finishedAt = Date.now();
  const score = total ? Math.round((correct / total) * 1000) : 0;
  return {
    attemptId: att.attemptId,
    mockId: att.mockId,
    title: att.title,
    startedAt: att.startedAt,
    finishedAt,
    durationSec: Math.round(((att.deadline && timedOut ? att.deadline : finishedAt) - att.startedAt) / 1000),
    timedOut,
    correct,
    total,
    score,
    passed: score >= PASS_SCORE,
    perModule,
    questionIds: att.questionIds,
    optionOrder: att.optionOrder,
    answers: att.answers,
    flags: att.flags,
  };
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}
