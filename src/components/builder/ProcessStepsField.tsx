"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Field";
import type { ProcessStep } from "@/lib/types";

export function ProcessStepsField({
  steps,
  onChange,
}: {
  steps: ProcessStep[];
  onChange: (steps: ProcessStep[]) => void;
}) {
  const value = steps.length ? steps : [{ what: "", why: "" }];

  const update = (i: number, patch: Partial<ProcessStep>) => {
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const add = () => onChange([...value, { what: "", why: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {value.map((step, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
              <GripVertical className="size-4" aria-hidden />
              Step {i + 1}
            </span>
            {value.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(i)}
                aria-label={`Remove step ${i + 1}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <Label htmlFor={`what-${i}`} className="sr-only">
                Step {i + 1}: what you do
              </Label>
              <Input
                id={`what-${i}`}
                value={step.what}
                onChange={(e) => update(i, { what: e.target.value })}
                placeholder="What you do…"
              />
            </div>
            <div>
              <Label htmlFor={`why-${i}`} className="sr-only">
                Step {i + 1}: why it matters
              </Label>
              <Textarea
                id={`why-${i}`}
                value={step.why}
                onChange={(e) => update(i, { why: e.target.value })}
                placeholder="Why it matters…"
                className="min-h-16"
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={add}>
        <Plus className="size-4" aria-hidden />
        Add step
      </Button>
    </div>
  );
}
