"use client";

import { SECTIONS, questionsForSection } from "@/lib/questionnaire";
import type { AnswerValue, ProcessStep, SkillDraft } from "@/lib/types";

export function ReviewStep({ draft }: { draft: SkillDraft }) {
  const role =
    draft.identity.role === "Other"
      ? draft.identity.roleOther || "Other"
      : draft.identity.role;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted measure">
        Review your answers below. Anything blank becomes a clearly-marked{" "}
        <code className="font-mono text-xs">[TODO]</code> in the file, which you can fix before
        saving. Go <strong>Back</strong> to change anything, then generate the file.
      </p>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-ink">Author</h3>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <Row label="Name" value={draft.identity.name} />
          <Row label="Role" value={role} />
          <Row label="Skill" value={draft.basics.title} />
          <Row label="Slug" value={draft.basics.slug} mono />
        </dl>
        <div className="mt-2 text-sm">
          <span className="text-muted">Description: </span>
          <span className="text-ink">{draft.basics.description || "—"}</span>
        </div>
      </div>

      {SECTIONS.map((section) => {
        const questions = questionsForSection(section.id);
        const followUps = draft.followUps.filter(
          (f) => f.sectionId === section.id && f.answer?.trim(),
        );
        const hasContent =
          questions.some((q) => answered(draft.answers[q.id])) || followUps.length > 0;
        return (
          <div key={section.id} className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
            {!hasContent && <p className="mt-2 text-sm text-muted">No answers yet.</p>}
            <dl className="mt-2 space-y-3">
              {questions.map((q) => {
                const v = draft.answers[q.id];
                if (!answered(v)) return null;
                return (
                  <div key={q.id}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {q.label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-ink">
                      {formatAnswer(v)}
                    </dd>
                  </div>
                );
              })}
              {followUps.map((f) => (
                <div key={f.id}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    {f.question}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}

      {draft.resources.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-ink">Bundled resources</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {draft.resources.map((r) => (
              <li key={r.id} className="font-mono text-xs text-ink">
                {r.relativePath}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className={mono ? "font-mono text-ink" : "text-ink"}>{value || "—"}</span>
    </div>
  );
}

function answered(v: AnswerValue | undefined): boolean {
  if (!v) return false;
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    if (typeof v[0] === "string") return (v as string[]).some((s) => s.trim());
    return (v as ProcessStep[]).some((s) => s.what.trim());
  }
  return Boolean(v.trim());
}

function formatAnswer(v: AnswerValue): string {
  if (Array.isArray(v)) {
    if (typeof v[0] === "string") return (v as string[]).join(", ");
    return (v as ProcessStep[])
      .filter((s) => s.what.trim())
      .map((s, i) => `${i + 1}. ${s.what}${s.why ? ` — ${s.why}` : ""}`)
      .join("\n");
  }
  return v;
}
