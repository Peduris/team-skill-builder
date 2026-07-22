"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Feedback";
import { questionsForSection, uploadCategoriesForSection } from "@/lib/questionnaire";
import type { AnswerValue, ProcessStep, Section, SkillDraft, UploadedResource } from "@/lib/types";
import { QuestionField } from "./QuestionField";
import { UploadField } from "./UploadField";

export function SectionStep({
  section,
  draft,
  setDraft,
  llmConfigured,
  showErrors,
}: {
  section: Section;
  draft: SkillDraft;
  setDraft: React.Dispatch<React.SetStateAction<SkillDraft>>;
  llmConfigured: boolean;
  showErrors: boolean;
}) {
  const questions = questionsForSection(section.id);
  const uploadCategories = uploadCategoriesForSection(section.id);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [followErr, setFollowErr] = useState<string | null>(null);

  const sectionFollowUps = draft.followUps.filter((f) => f.sectionId === section.id);

  const role =
    draft.identity.role === "Other"
      ? draft.identity.roleOther || "Other"
      : draft.identity.role || "";

  const setAnswer = (id: string, value: AnswerValue) =>
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: value } }));

  const setFollowAnswer = (id: string, answer: string) =>
    setDraft((d) => ({
      ...d,
      followUps: d.followUps.map((f) => (f.id === id ? { ...f, answer } : f)),
    }));

  const addResources = (resources: UploadedResource[]) =>
    setDraft((d) => ({ ...d, resources: [...d.resources, ...resources] }));
  const removeResource = (rid: string) =>
    setDraft((d) => ({ ...d, resources: d.resources.filter((r) => r.id !== rid) }));

  const answerError = (q: (typeof questions)[number]): string | undefined => {
    if (!showErrors || !q.required) return undefined;
    const v = draft.answers[q.id];
    if (q.type === "process-steps") {
      const steps = (v as ProcessStep[]) ?? [];
      return steps.some((s) => s.what.trim()) ? undefined : "Add at least one step.";
    }
    const empty = !v || (typeof v === "string" && !v.trim());
    return empty ? "This field is required." : undefined;
  };

  /** Context for tailor: other answers in this section (excluding the target id). */
  const sectionContextFor = (excludeId: string) =>
    questions
      .filter((q) => q.id !== excludeId)
      .map((q) => `${q.label}: ${stringifyAnswer(draft.answers[q.id])}`)
      .join("\n");

  const getFollowUps = async () => {
    setLoadingFollow(true);
    setFollowErr(null);
    try {
      const answersSoFar = questions
        .map((q) => `${q.label}: ${stringifyAnswer(draft.answers[q.id])}`)
        .join("\n");
      const res = await fetch("/api/llm/followups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sectionTitle: section.title, role, answersSoFar }),
      });
      const data = await res.json();
      const questionsOut: string[] = data.questions ?? [];
      if (questionsOut.length === 0) {
        setFollowErr("No follow-ups this time — your answers are already detailed.");
        return;
      }
      setDraft((d) => ({
        ...d,
        followUps: [
          ...d.followUps.filter((f) => f.sectionId !== section.id),
          ...questionsOut.map((q, i) => ({
            id: `${section.id}-${Date.now()}-${i}`,
            sectionId: section.id,
            question: q,
            answer: "",
          })),
        ],
      }));
    } catch {
      setFollowErr("Couldn't fetch follow-ups. You can continue without them.");
    } finally {
      setLoadingFollow(false);
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((q) => (
        <QuestionField
          key={q.id}
          question={q}
          value={draft.answers[q.id]}
          onChange={(v) => setAnswer(q.id, v)}
          error={answerError(q)}
          llmConfigured={llmConfigured}
          skillTitle={draft.basics.title}
          role={role}
          sectionTitle={section.title}
          sectionContext={sectionContextFor(q.id)}
        />
      ))}

      {uploadCategories.length > 0 && (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-ink">Attach the real materials (optional)</p>
          <UploadField
            categories={uploadCategories}
            resources={draft.resources.filter((r) => uploadCategories.includes(r.category))}
            onAdd={addResources}
            onRemove={removeResource}
          />
        </div>
      )}

      {llmConfigured && (
        <div className="rounded-lg border border-brand/20 bg-brand-wash/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-brand-ink">
              <Sparkles className="size-4" aria-hidden />
              Tailored follow-ups
            </p>
            <Button variant="secondary" size="sm" onClick={getFollowUps} loading={loadingFollow}>
              <Wand2 className="size-4" aria-hidden />
              {sectionFollowUps.length ? "Regenerate" : "Ask AI"}
            </Button>
          </div>
          {followErr && (
            <Notice tone="info" className="mt-3">
              {followErr}
            </Notice>
          )}
          {sectionFollowUps.length > 0 && (
            <div className="mt-4 space-y-4">
              {sectionFollowUps.map((f) => (
                <Field key={f.id} label={f.question}>
                  {(id) => (
                    <Textarea
                      id={id}
                      value={f.answer ?? ""}
                      onChange={(e) => setFollowAnswer(f.id, e.target.value)}
                      placeholder="Optional — skip if not relevant."
                      className="min-h-16"
                    />
                  )}
                </Field>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function stringifyAnswer(v: AnswerValue | undefined): string {
  if (!v) return "(blank)";
  if (Array.isArray(v)) {
    if (v.length === 0) return "(blank)";
    if (typeof v[0] === "string") return (v as string[]).join(", ");
    return (v as ProcessStep[]).map((s) => `${s.what} (${s.why})`).join("; ");
  }
  return v || "(blank)";
}
