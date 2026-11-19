import type { HighlighterCore } from "shiki/core";
export function getHighlighter(): Promise<HighlighterCore>;
export function highlightSync(h: HighlighterCore, code: string, lang?: string): string;
