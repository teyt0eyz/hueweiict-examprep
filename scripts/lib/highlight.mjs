// Build-time syntax highlighter (Shiki, JS regex engine — no WASM).
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubLight from "@shikijs/themes/github-light";
import githubDark from "@shikijs/themes/github-dark";
import python from "@shikijs/langs/python";
import bash from "@shikijs/langs/bash";
import json from "@shikijs/langs/json";
import vrp from "./vrp-grammar.json" with { type: "json" };

let hl;
export async function getHighlighter() {
  if (!hl) {
    hl = await createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [vrp, python, bash, json],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  }
  return hl;
}

const ALIASES = { huawei: "vrp", cli: "vrp", py: "python", sh: "bash", shell: "bash", console: "vrp" };

export function highlightSync(h, code, lang) {
  let l = ALIASES[lang] ?? lang ?? "text";
  if (!h.getLoadedLanguages().includes(l)) l = "text";
  return h.codeToHtml(code.replace(/\n$/, ""), {
    lang: l,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: "light",
  });
}
