#!/usr/bin/env node
// Generate the fixed Mock Full sets (content/mocks/full-{1,2,3}.json).
// Deterministic (seeded) so re-running gives the same sets until the bank changes.
// Each set follows FULL_QUOTA, the three sets are disjoint, and difficulty is spread within each module.
import fs from "node:fs";
import path from "node:path";
import { loadBank } from "./lib/bank.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "content", "mocks");
const SETS = 3;

// keep in sync with src/lib/mocks.ts
const FULL_QUOTA = { M1: 3, M2: 3, M3: 6, M4: 4, M5: 6, M6: 6, M7: 4, M8: 4, M9: 4, M10: 3, M11: 3, M12: 4, M13: 2, M14: 2, M15: 2, M16: 2, M17: 2 };

let seed = 0x48c1a;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

const questions = loadBank().questions.map((x) => x.q);
const sets = Array.from({ length: SETS }, () => []);

for (const [mod, quota] of Object.entries(FULL_QUOTA)) {
  const pool = questions.filter((q) => q.module === mod);
  if (pool.length < quota * SETS) throw new Error(`${mod}: need ${quota * SETS} questions, have ${pool.length}`);
  // shuffle, then order by difficulty and deal round-robin so every pile spans all difficulties
  const ordered = shuffle(pool).sort((a, b) => a.difficulty - b.difficulty);
  const piles = Array.from({ length: SETS }, () => []);
  ordered.forEach((q, i) => piles[i % SETS].push(q));
  piles.forEach((pile, k) => {
    // take `quota` items evenly spaced through the (difficulty-sorted) pile
    const step = pile.length / quota;
    for (let i = 0; i < quota; i++) sets[k].push(pile[Math.floor(i * step + step / 2)].id);
  });
}

fs.mkdirSync(OUT, { recursive: true });
sets.forEach((ids, k) => {
  const file = path.join(OUT, `full-${k + 1}.json`);
  fs.writeFileSync(file, JSON.stringify({ ids }, null, 1) + "\n");
  const diff = [1, 2, 3].map((d) => ids.filter((id) => questions.find((q) => q.id === id).difficulty === d).length);
  console.log(`full-${k + 1}: ${ids.length} questions · difficulty 1/2/3 = ${diff.join("/")}`);
});
