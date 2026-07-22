"use client";

import { useState } from "react";
import { RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { CharCount, Notice } from "@/components/ui/Feedback";
import { cn } from "@/lib/cn";
import type { AnswerValue, ProcessStep, Question } from "@/lib/types";
import { ProcessStepsField } from "./ProcessStepsField";

export function QuestionField({
  question,
  value,
  onChange,
  error,
  llmConfigured,
  skillTitle,
  role,
  sectionTitle,
  sectionContext,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  error?: string;
  llmConfigured?: boolean;
  skillTitle?: string;
  role?: string;
  sectionTitle?: string;
  sectionContext?: string;
}) {
  const [previous, setPrevious] = useState<AnswerValue | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailorErr, setTailorErr] = useState<string | null>(null);

  const isWritable =
    question.type === "short" ||
    question.type === "long" ||
    question.type === "process-steps";

  const tailor = async () => {
    if (!llmConfigured || tailoring) return;
    setTailoring(true);
    setTailorErr(null);
    try {
      const kind = question.type === "process-steps" ? "process-steps" : "text";
      const currentAnswer =
        kind === "process-steps"
          ? JSON.stringify((value as ProcessStep[]) ?? [])
          : typeof value === "string"
            ? value
            : "";

      const res = await fetch("/api/llm/tailor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          questionLabel: question.label,
          questionHelp: question.help,
          sectionTitle: sectionTitle ?? "",
          skillTitle: skillTitle ?? "",
          role: role ?? "",
          currentAnswer,
          sectionContext: sectionContext ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTailorErr(data.error || "Tailoring failed.");
        return;
      }

      // Snapshot for Redo before applying.
      setPrevious(value === undefined ? (kind === "process-steps" ? [] : "") : cloneAnswer(value));

      if (kind === "process-steps") {
        try {
          const steps = JSON.parse(data.answer) as ProcessStep[];
          if (Array.isArray(steps)) onChange(steps);
          else setTailorErr("Unexpected response format.");
        } catch {
          setTailorErr("Could not parse tailored steps.");
        }
      } else {
        onChange(String(data.answer ?? ""));
      }
    } catch {
      setTailorErr("Could not reach the tailor. Your answer is unchanged.");
    } finally {
      setTailoring(false);
    }
  };

  const redo = () => {
    if (previous === null) return;
    onChange(cloneAnswer(previous));
    setPrevious(null);
    setTailorErr(null);
  };

  const actions =
    isWritable && llmConfigured ? (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={tailor}
          loading={tailoring}
          disabled={tailoring}
        >
          <Wand2 className="size-3.5" aria-hidden />
          Enhance / Tailor
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={previous === null || tailoring}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Redo
        </Button>
        {tailorErr && (
          <span className="text-xs text-danger">{tailorErr}</span>
        )}
      </div>
    ) : null;

  if (question.type === "process-steps") {
    return (
      <div>
        <Field label={question.label} help={question.help} required={question.required} error={error}>
          {() => (
            <ProcessStepsField
              steps={(value as ProcessStep[]) ?? []}
              onChange={(steps) => onChange(steps)}
            />
          )}
        </Field>
        {actions}
        {previous !== null && !tailorErr && (
          <Notice tone="info" className="mt-2">
            Steps tailored. Hit <strong>Redo</strong> to restore your previous draft.
          </Notice>
        )}
      </div>
    );
  }

  if (question.type === "single" || question.type === "multi") {
    const selected = Array.isArray(value) ? (value as string[]) : value ? [value as string] : [];
    const toggle = (opt: string) => {
      if (question.type === "single") {
        onChange(opt);
      } else {
        onChange(
          selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt],
        );
      }
    };
    return (
      <Field label={question.label} help={question.help} required={question.required} error={error}>
        {() => (
          <div className="flex flex-wrap gap-2">
            {question.options?.map((opt) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    active
                      ? "border-brand bg-brand-wash text-brand-ink font-medium"
                      : "border-border-strong bg-surface text-ink hover:bg-surface-2",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </Field>
    );
  }

  const strValue = typeof value === "string" ? value : "";
  const max = question.maxLength;

  return (
    <div>
      <Field
        label={question.label}
        help={question.help}
        required={question.required}
        error={error}
        hint={max ? <CharCount value={strValue.length} max={max} /> : undefined}
      >
        {(id) =>
          question.type === "short" ? (
            <Input
              id={id}
              value={strValue}
              maxLength={max}
              placeholder={question.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <Textarea
              id={id}
              value={strValue}
              maxLength={max}
              placeholder={question.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          )
        }
      </Field>
      {actions}
      {previous !== null && !tailorErr && (
        <Notice tone="info" className="mt-2">
          Answer tailored. Hit <strong>Redo</strong> to restore your previous draft.
        </Notice>
      )}
    </div>
  );
}

function cloneAnswer(value: AnswerValue): AnswerValue {
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    if (typeof value[0] === "string") return [...(value as string[])];
    return (value as ProcessStep[]).map((s) => ({ ...s }));
  }
  return value;
}
