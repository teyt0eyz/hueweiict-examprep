#!/usr/bin/env node
// npm run validate — checks content/questions/*.json and content/mocks/*.json
import { TARGET, validateBank } from "./lib/bank.mjs";

const strict = process.argv.includes("--strict"); // also fail when module targets are not met
const { files, questions, errors, warnings, counts } = validateBank();

console.log(`Question bank: ${questions.length} questions in ${files.length} files`);
const rows = Object.entries(counts).map(([m, n]) => {
  const t = TARGET[m];
  const mark = n >= t ? "✓" : n === 0 ? "·" : "…";
  return `${mark} ${m.padEnd(4)} ${String(n).padStart(3)} / ${t}`;
});
for (let i = 0; i < rows.length; i += 3) console.log("  " + rows.slice(i, i + 3).map((r) => r.padEnd(20)).join(""));

for (const w of warnings) console.warn(`warn  ${w}`);
const short = Object.entries(counts).filter(([m, n]) => n < TARGET[m]);
if (strict && short.length) errors.push(`below target: ${short.map(([m, n]) => `${m}=${n}/${TARGET[m]}`).join(", ")}`);

if (errors.length) {
  for (const e of errors) console.error(`error ${e}`);
  console.error(`\n✗ ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`\n✓ valid (${warnings.length} warning(s))`);
