import "server-only";
// Shared with the data build script so lessons and questions highlight identically.
import { getHighlighter, highlightSync } from "../../scripts/lib/highlight.mjs";

export async function highlight(code: string, lang = "vrp"): Promise<string> {
  const h = await getHighlighter();
  return highlightSync(h, code, lang);
}
