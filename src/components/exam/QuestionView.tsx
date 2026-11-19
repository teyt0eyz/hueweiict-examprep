"use client";

import Topology from "@/components/Topology";
import { isCorrect } from "@/lib/exam";
import { MODULES } from "@/lib/modules";
import { writeStore } from "@/lib/storage";
import type { QItem } from "@/lib/types";
import { useStore } from "@/lib/useStore";

const LETTERS = "ABCDEFGHIJ";
const TYPE_LABEL: Record<QItem["type"], string> = {
  single: "เลือก 1 ข้อ",
  multiple: "เลือกได้มากกว่า 1 ข้อ (ต้องตอบให้ครบทุกข้อที่ถูกจึงได้คะแนน)",
  truefalse: "ถูก / ผิด",
  ordering: "เรียงลำดับให้ถูกต้อง (ใช้ปุ่ม ↑ ↓)",
};
const TYPE_LABEL_EN: Record<QItem["type"], string> = {
  single: "Choose 1 answer",
  multiple: "Choose all that apply (all correct options are required)",
  truefalse: "True / False",
  ordering: "Arrange in the correct order (use ↑ ↓)",
};
const DIFF = ["", "ง่าย", "กลาง", "ยาก"];

export type Lang = "en" | "th";
/** Question language (real exam is English). Explanations stay Thai. */
export const useLang = () => useStore<Lang>("lang", "en");
export const setLang = (l: Lang) => writeStore("lang", l);

export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <span role="group" aria-label="ภาษาของโจทย์" className={`inline-flex overflow-hidden rounded-md border border-border text-xs ${className}`}>
      {(["en", "th"] as Lang[]).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`px-2 py-0.5 font-medium ${lang === l ? "bg-accent text-accent-fg" : "hover:bg-surface-2"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

export function Html({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`q-html ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

type Props = {
  q: QItem;
  number: number;
  total?: number;
  order: string[];
  answer?: string[];
  onAnswer?: (ids: string[]) => void;
  revealed?: boolean;
  showMeta?: boolean;
  bookmarked?: boolean;
  onBookmark?: () => void;
};

export default function QuestionView({ q, number, total, order, answer, onAnswer, revealed = false, showMeta = true, bookmarked, onBookmark }: Props) {
  const lang = useLang();
  const en = lang === "en" && !!q.qEn;
  const optMap = new Map(q.options.map((o) => [o.id, o]));
  const optHtml = (o: QItem["options"][number] | undefined) => (o ? (en && o.htmlEn ? o.htmlEn : o.html) : "");
  const locked = revealed || !onAnswer;
  const chosen = answer ?? [];
  const mod = MODULES.find((m) => m.id === q.module);

  function choose(id: string) {
    if (locked) return;
    if (q.type === "multiple") onAnswer!(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
    else onAnswer!([id]);
  }

  const sequence = q.type === "ordering" ? (answer && answer.length === order.length ? answer : order) : order;
  function move(i: number, d: -1 | 1) {
    if (locked) return;
    const j = i + d;
    if (j < 0 || j >= sequence.length) return;
    const next = sequence.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onAnswer!(next);
  }

  const correct = revealed ? isCorrect(q, answer) : null;

  return (
    <article aria-labelledby={`q-${q.id}`} className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <header className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-fg">
          ข้อ {number}
          {total ? `/${total}` : ""}
        </span>
        {showMeta && (
          <>
            <span>
              {q.module}
              {mod ? ` · ${mod.title}` : ""}
            </span>
            <span>· {q.topic}</span>
            <span>· {DIFF[q.difficulty]}</span>
          </>
        )}
        {q.qEn && <LangToggle className="ml-auto" />}
        {onBookmark && (
          <button type="button" onClick={onBookmark} aria-pressed={bookmarked} className={`${q.qEn ? "" : "ml-auto "} rounded-md border px-2 py-0.5 ${bookmarked ? "border-warning text-warning" : "border-border hover:text-fg"}`}>
            {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
          </button>
        )}
      </header>

      <div id={`q-${q.id}`}>
        <Html html={en ? q.qEn! : q.q} className="text-[1.02rem]" />
      </div>
      {q.diagram && <Topology name={q.diagram} />}

      <p className="mb-2 mt-4 text-xs font-medium text-muted">{(en ? TYPE_LABEL_EN : TYPE_LABEL)[q.type]}</p>

      {q.type === "ordering" ? (
        <ol className="space-y-2">
          {sequence.map((id, i) => {
            const o = optMap.get(id);
            if (!o) return null;
            const right = revealed && q.answer[i] === id;
            return (
              <li key={id} className={`flex items-center gap-3 rounded-lg border p-3 ${revealed ? (right ? "border-success" : "border-danger") : "border-border"}`}>
                <span className="w-6 shrink-0 text-center font-mono text-sm text-muted">{i + 1}</span>
                <Html html={optHtml(o)} className="min-w-0 flex-1" />
                {!locked && (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" aria-label="เลื่อนขึ้น" disabled={i === 0} onClick={() => move(i, -1)} className="h-8 w-8 rounded-md border border-border disabled:opacity-30">↑</button>
                    <button type="button" aria-label="เลื่อนลง" disabled={i === sequence.length - 1} onClick={() => move(i, 1)} className="h-8 w-8 rounded-md border border-border disabled:opacity-30">↓</button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}
      {q.type === "ordering" && !locked && !(answer && answer.length) && (
        <button type="button" onClick={() => onAnswer!(sequence)} className="mt-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-fg">
          ✓ ยืนยันลำดับนี้เป็นคำตอบ
        </button>
      )}
      {q.type === "ordering" ? null : (
        <ul className="space-y-2" role={q.type === "multiple" ? "group" : "radiogroup"}>
          {order.map((id, i) => {
            const o = optMap.get(id);
            if (!o) return null;
            const isChosen = chosen.includes(id);
            const isAns = q.answer.includes(id);
            let tone = isChosen ? "border-accent bg-accent-soft" : "border-border hover:border-muted";
            if (revealed) tone = isAns ? "border-success bg-success/10" : isChosen ? "border-danger bg-danger/10" : "border-border opacity-80";
            return (
              <li key={id}>
                <button
                  type="button"
                  role={q.type === "multiple" ? "checkbox" : "radio"}
                  aria-checked={isChosen}
                  disabled={locked}
                  onClick={() => choose(id)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-default ${tone}`}
                >
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border text-xs font-semibold ${q.type === "multiple" ? "rounded-md" : "rounded-full"} ${isChosen ? "border-accent bg-accent text-accent-fg" : "border-border text-muted"}`}
                  >
                    {LETTERS[i]}
                  </span>
                  <Html html={optHtml(o)} className="min-w-0 flex-1" />
                  {revealed && isAns && <span className="shrink-0 text-sm text-success" aria-label="คำตอบที่ถูก">✓</span>}
                  {revealed && isChosen && !isAns && <span className="shrink-0 text-sm text-danger" aria-label="คำตอบที่เลือกผิด">✗</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {revealed && (
        <section className="mt-5 rounded-lg border border-border bg-surface-2 p-4">
          <p className={`mb-2 font-semibold ${correct ? "text-success" : "text-danger"}`}>
            {answer && answer.length ? (correct ? "✓ ตอบถูก" : "✗ ตอบผิด") : "— ไม่ได้ตอบ"}
            <span className="ml-2 font-normal text-muted">
              เฉลย:{" "}
              {q.type === "ordering"
                ? q.answer.map((id) => LETTERS[q.options.findIndex((o) => o.id === id)] ?? id).join(" → ")
                : order.map((id, i) => (q.answer.includes(id) ? LETTERS[i] : null)).filter(Boolean).join(", ")}
            </span>
          </p>
          {q.type === "ordering" && (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">
              {q.answer.map((id) => (
                <li key={id}>
                  <Html html={optHtml(optMap.get(id)) || id} />
                </li>
              ))}
            </ol>
          )}
          <Html html={q.exp} className="text-sm" />
          {q.ref && <p className="mt-2 text-xs text-muted">อ้างอิง: {q.ref}</p>}
        </section>
      )}
    </article>
  );
}
