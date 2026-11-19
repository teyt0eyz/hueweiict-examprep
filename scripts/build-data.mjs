#!/usr/bin/env node
// Validates the bank, renders markdown → HTML (with Shiki for code), and writes
// public/data/q/<module>.json, public/data/mocks/<id>.json and public/data/index.json.
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { MOCK_DIR, ROOT, validateBank } from "./lib/bank.mjs";
import { getHighlighter, highlightSync } from "./lib/highlight.mjs";

const OUT = path.join(ROOT, "public/data");
const { questions, errors } = validateBank();
if (errors.length) {
  for (const e of errors) console.error(`error ${e}`);
  console.error("build-data: question bank is invalid — run `npm run validate`");
  process.exit(1);
}

const h = await getHighlighter();
const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) {
      return `<div class="code-block">${highlightSync(h, text, (lang || "").trim())}</div>`;
    },
  },
});
// Make tables scrollable on narrow screens.
marked.use({
  hooks: {
    postprocess: (html) => html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>"),
  },
});

const md = (s) => marked.parse(s);
const inline = (s) => (s.includes("\n") || s.includes("```") ? marked.parse(s) : marked.parseInline(s));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "q"), { recursive: true });
fs.mkdirSync(path.join(OUT, "mocks"), { recursive: true });

const byModule = {};
for (const q of questions) {
  (byModule[q.module] ??= []).push({
    id: q.id,
    module: q.module,
    topic: q.topic,
    type: q.type,
    difficulty: q.difficulty,
    q: md(q.question),
    ...(q.en ? { qEn: md(q.en.question) } : {}),
    ...(q.diagram ? { diagram: q.diagram } : {}),
    options: q.options.map((o) => ({
      id: o.id,
      html: inline(o.text),
      ...(q.en ? { htmlEn: inline(q.type === "truefalse" ? (o.id === "T" ? "True" : "False") : q.en.options[o.id]) } : {}),
    })),
    answer: q.answer,
    exp: md(q.explanation),
    ...(q.ref ? { ref: q.ref } : {}),
  });
}

const index = { generatedAt: new Date().toISOString(), total: questions.length, modules: {} };
for (const [m, list] of Object.entries(byModule)) {
  list.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(OUT, "q", `${m.toLowerCase()}.json`), JSON.stringify(list));
  index.modules[m] = { count: list.length, topics: [...new Set(list.map((q) => q.topic))] };
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index));

if (fs.existsSync(MOCK_DIR)) {
  for (const f of fs.readdirSync(MOCK_DIR).filter((x) => x.endsWith(".json"))) {
    fs.copyFileSync(path.join(MOCK_DIR, f), path.join(OUT, "mocks", f));
  }
}
console.log(`build-data: ${questions.length} questions → public/data (${Object.keys(byModule).length} modules)`);
