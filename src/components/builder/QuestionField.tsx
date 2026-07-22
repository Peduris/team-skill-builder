"use client";

import { Field, Input, Textarea } from "@/components/ui/Field";
import { CharCount } from "@/components/ui/Feedback";
import { cn } from "@/lib/cn";
import type { AnswerValue, ProcessStep, Question } from "@/lib/types";
import { ProcessStepsField } from "./ProcessStepsField";

export function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  error?: string;
}) {
  if (question.type === "process-steps") {
    return (
      <Field label={question.label} help={question.help} required={question.required} error={error}>
        {() => (
          <ProcessStepsField
            steps={(value as ProcessStep[]) ?? []}
            onChange={(steps) => onChange(steps)}
          />
        )}
      </Field>
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
  );
}
