"use client";

import Link from "next/link";
import { useState } from "react";
import QuestionView from "@/components/exam/QuestionView";
import { isCorrect } from "@/lib/exam";
import { recordResults } from "@/lib/progress";
import type { QItem } from "@/lib/types";

export default function LessonQuiz({ questions, mockId }: { questions: QItem[]; mockId: string }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState<string[]>([]);

  if (!questions.length) return null;
  const done = checked.length === questions.length;
  const score = questions.filter((q) => checked.includes(q.id) && isCorrect(q, answers[q.id])).length;

  function answer(q: QItem, ids: string[]) {
    if (checked.includes(q.id)) return;
    setAnswers((a) => ({ ...a, [q.id]: ids }));
    if (q.type === "single" || q.type === "truefalse") reveal(q, ids);
  }
  function reveal(q: QItem, ids = answers[q.id] ?? q.options.map((o) => o.id)) {
    if (checked.includes(q.id)) return;
    setAnswers((a) => ({ ...a, [q.id]: ids }));
    setChecked((c) => [...c, q.id]);
    recordResults([{ id: q.id, correct: isCorrect(q, ids) }]);
  }

  return (
    <section aria-labelledby="quiz-h" className="mt-12 border-t border-border pt-8">
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h2 id="quiz-h" className="text-xl font-bold">Mini Quiz</h2>
        <p className="text-sm text-muted">
          {questions.length} ข้อ · เฉลยทันที {checked.length > 0 && `· ได้ ${score}/${checked.length}`}
        </p>
      </div>
      <div className="space-y-5">
        {questions.map((q, i) => (
          <div key={q.id}>
            <QuestionView q={q} number={i + 1} total={questions.length} showMeta={false} order={q.options.map((o) => o.id)} answer={answers[q.id]} onAnswer={(ids) => answer(q, ids)} revealed={checked.includes(q.id)} />
            {!checked.includes(q.id) && (q.type === "multiple" || q.type === "ordering") && (
              <button type="button" onClick={() => reveal(q)} disabled={q.type === "multiple" && !answers[q.id]?.length} className="mt-2 rounded-lg border border-accent px-4 py-2 text-sm text-accent disabled:opacity-40">
                ตรวจคำตอบ
              </button>
            )}
          </div>
        ))}
      </div>
      {done && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="font-semibold">
            ได้ {score}/{questions.length} ข้อ {score === questions.length ? "🎉" : ""}
          </p>
          <Link href={`/mock/${mockId}/`} className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">
            ทำ Mock by Module 20 ข้อ →
          </Link>
        </div>
      )}
    </section>
  );
}
