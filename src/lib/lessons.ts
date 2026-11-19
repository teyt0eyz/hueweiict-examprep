import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { QItem } from "./types";

const ROOT = process.cwd();

/** Reads the pre-rendered bank (public/data, produced by `npm run data`) at build time. */
export function readModuleQuestions(moduleId: string): QItem[] {
  const f = path.join(ROOT, "public/data/q", `${moduleId.toLowerCase()}.json`);
  if (!fs.existsSync(f)) return [];
  return JSON.parse(fs.readFileSync(f, "utf8")) as QItem[];
}

/** 5 fixed quiz questions per lesson: prefer easy/medium ones, spread across topics. */
export function pickLessonQuiz(moduleId: string, n = 5): QItem[] {
  const all = readModuleQuestions(moduleId);
  const pool = all.filter((q) => q.difficulty <= 2);
  const picked: QItem[] = [];
  const topics = new Set<string>();
  for (const q of pool) {
    if (picked.length >= n) break;
    if (!topics.has(q.topic)) {
      picked.push(q);
      topics.add(q.topic);
    }
  }
  for (const q of [...pool, ...all]) {
    if (picked.length >= n) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}
