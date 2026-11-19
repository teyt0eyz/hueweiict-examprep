// Shared loading + validation for the question bank (used by validate & build-data).
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const Q_DIR = path.join(ROOT, "content/questions");
export const MOCK_DIR = path.join(ROOT, "content/mocks");
export const DIAGRAMS = path.join(ROOT, "content/diagrams.json");

export const MODULE_IDS = Array.from({ length: 17 }, (_, i) => `M${i + 1}`);
// Target bank size per module (spec: high-weight ≥25, others ≥15)
export const TARGET = {
  M1: 15, M2: 15, M3: 25, M4: 25, M5: 25, M6: 25, M7: 25, M8: 25, M9: 25,
  M10: 15, M11: 15, M12: 25, M13: 15, M14: 15, M15: 15, M16: 15, M17: 15,
};

const TYPES = new Set(["single", "multiple", "truefalse", "ordering"]);
const ID_RE = /^m(\d{1,2})-[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$/;

export function loadBank() {
  const files = fs.existsSync(Q_DIR) ? fs.readdirSync(Q_DIR).filter((f) => f.endsWith(".json")).sort() : [];
  const errors = [];
  const questions = [];
  for (const f of files) {
    const full = path.join(Q_DIR, f);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      errors.push(`${f}: invalid JSON — ${e.message}`);
      continue;
    }
    if (!Array.isArray(data)) {
      errors.push(`${f}: top level must be an array of questions`);
      continue;
    }
    const fileModule = f.replace(/\.json$/, "").toUpperCase();
    data.forEach((q, i) => questions.push({ q, file: f, index: i, fileModule }));
  }
  return { files, questions, errors };
}

export function loadDiagrams() {
  if (!fs.existsSync(DIAGRAMS)) return {};
  return JSON.parse(fs.readFileSync(DIAGRAMS, "utf8"));
}

const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

export function validateBank() {
  const { files, questions, errors } = loadBank();
  const warnings = [];
  const diagrams = loadDiagrams();
  const seen = new Map();

  for (const { q, file, index, fileModule } of questions) {
    const where = `${file}[${index}]${q && q.id ? ` (${q.id})` : ""}`;
    const err = (m) => errors.push(`${where}: ${m}`);
    if (!q || typeof q !== "object") { err("not an object"); continue; }

    if (!nonEmpty(q.id)) err("missing id");
    else {
      if (!ID_RE.test(q.id)) err(`id must look like "m5-ospf-012"`);
      if (seen.has(q.id)) err(`duplicate id (also in ${seen.get(q.id)})`);
      seen.set(q.id, file);
      const m = q.id.match(/^m(\d+)-/);
      if (m && `M${m[1]}` !== q.module) err(`id prefix does not match module ${q.module}`);
    }
    if (!MODULE_IDS.includes(q.module)) err(`unknown module "${q.module}"`);
    else if (q.module !== fileModule) err(`module ${q.module} is in file for ${fileModule}`);
    if (!nonEmpty(q.topic)) err("missing topic");
    if (!TYPES.has(q.type)) err(`invalid type "${q.type}"`);
    if (![1, 2, 3].includes(q.difficulty)) err("difficulty must be 1, 2 or 3");
    if (!nonEmpty(q.question)) err("empty question");
    if (!nonEmpty(q.explanation)) err("empty explanation");
    else if (q.explanation.trim().length < 30) warnings.push(`${where}: explanation is very short`);
    if (q.diagram !== undefined && !diagrams[q.diagram]) err(`diagram "${q.diagram}" not found in content/diagrams.json`);
    if (q.ref !== undefined && !nonEmpty(q.ref)) err("ref must be a non-empty string when present");

    if (!Array.isArray(q.options) || q.options.length < 2) { err("needs at least 2 options"); continue; }
    const optIds = q.options.map((o) => o && o.id);
    if (optIds.some((id) => !nonEmpty(id))) err("every option needs an id");
    if (q.options.some((o) => !nonEmpty(o && o.text))) err("every option needs text");
    if (new Set(optIds).size !== optIds.length) err("duplicate option ids");
    const texts = q.options.map((o) => (o && o.text ? o.text.trim().toLowerCase() : ""));
    if (new Set(texts).size !== texts.length) err("duplicate option text");

    if (!Array.isArray(q.answer) || q.answer.length === 0) { err("answer must be a non-empty array"); continue; }
    for (const a of q.answer) if (!optIds.includes(a)) err(`answer "${a}" is not an option id`);
    if (new Set(q.answer).size !== q.answer.length) err("duplicate ids in answer");

    if (q.en !== undefined) {
      if (typeof q.en !== "object" || !q.en.question?.trim()) err("en.question must be a non-empty string");
      else if (q.type !== "truefalse") {
        const ids = (q.options ?? []).map((o) => o.id);
        const keys = Object.keys(q.en.options ?? {});
        if (ids.length !== keys.length || ids.some((id) => !q.en.options[id]?.trim())) err("en.options must give text for every option id");
      }
    }
    switch (q.type) {
      case "single":
        if (q.answer.length !== 1) err("single must have exactly one answer");
        if (q.options.length < 3) warnings.push(`${where}: single-choice with < 3 options`);
        break;
      case "truefalse":
        if (q.options.length !== 2) err("truefalse must have exactly 2 options");
        if (q.answer.length !== 1) err("truefalse must have exactly one answer");
        break;
      case "multiple":
        if (q.answer.length < 2) err("multiple must have ≥ 2 correct answers (use single otherwise)");
        if (q.answer.length === q.options.length) warnings.push(`${where}: every option is correct`);
        break;
      case "ordering":
        if (q.answer.length !== q.options.length) err("ordering answer must list every option exactly once");
        break;
    }
  }

  // Fixed mock sets
  const ids = new Set(seen.keys());
  if (fs.existsSync(MOCK_DIR)) {
    for (const f of fs.readdirSync(MOCK_DIR).filter((x) => x.endsWith(".json"))) {
      try {
        const set = JSON.parse(fs.readFileSync(path.join(MOCK_DIR, f), "utf8"));
        if (!Array.isArray(set.ids)) { errors.push(`mocks/${f}: missing ids array`); continue; }
        if (new Set(set.ids).size !== set.ids.length) errors.push(`mocks/${f}: duplicate ids`);
        for (const id of set.ids) if (!ids.has(id)) errors.push(`mocks/${f}: unknown question id ${id}`);
      } catch (e) {
        errors.push(`mocks/${f}: invalid JSON — ${e.message}`);
      }
    }
  }

  const counts = Object.fromEntries(MODULE_IDS.map((m) => [m, 0]));
  for (const { q } of questions) if (q && counts[q.module] !== undefined) counts[q.module]++;

  return { files, questions: questions.map((x) => x.q), errors, warnings, counts };
}
