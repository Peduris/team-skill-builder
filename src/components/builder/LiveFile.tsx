"use client";

import { useMemo } from "react";
import { FileCode2 } from "lucide-react";
import { buildFallbackSkill } from "@/lib/assembler";
import type { SkillDraft } from "@/lib/types";

/**
 * The signature element: the SKILL.md rendered live as the user answers.
 * Uses the deterministic assembler so it reflects exactly what a no-LLM save
 * would produce (the AI pass only refines this on generate).
 */
export function LiveFile({ draft, className }: { draft: SkillDraft; className?: string }) {
  const markdown = useMemo(() => buildFallbackSkill(draft), [draft]);
  const slug = draft.basics.slug || "your-skill";

  return (
    <div className={className}>
      <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-border bg-surface-2 px-3.5 py-2">
        <FileCode2 className="size-4 text-brand" aria-hidden />
        <span className="font-mono text-xs text-muted">
          skills/{slug}/SKILL.md
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
          <span className="size-1.5 rounded-full bg-ok" aria-hidden />
          live
        </span>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-b-lg border border-border bg-surface p-4 font-mono text-[12.5px] leading-relaxed text-ink">
        <code>{markdown}</code>
      </pre>
    </div>
  );
}
