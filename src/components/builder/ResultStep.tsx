"use client";

import { CheckCircle2, ExternalLink, GitPullRequest, GitCommit, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SaveResult } from "@/lib/types";

export function ResultStep({
  result,
  onBuildAnother,
}: {
  result: SaveResult;
  onBuildAnother: () => void;
}) {
  const isPr = result.mode === "pr";
  return (
    <div className="mx-auto max-w-lg py-6 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-ok/15">
        <CheckCircle2 className="size-8 text-ok" aria-hidden />
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        {result.isUpdate ? "Skill updated" : "Skill saved"}
      </h2>
      <p className="mt-2 text-muted">
        {isPr
          ? "A pull request is open for your team to review and merge."
          : "Committed straight to the default branch."}
      </p>

      <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-left">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">File path</div>
        <code className="mt-1 block break-all font-mono text-sm text-ink">{result.path}</code>
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 font-medium text-brand-ink hover:underline"
        >
          {isPr ? (
            <>
              <GitPullRequest className="size-4" aria-hidden />
              View pull request {result.prNumber ? `#${result.prNumber}` : ""}
            </>
          ) : (
            <>
              <GitCommit className="size-4" aria-hidden />
              View commit
            </>
          )}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>

      <div className="mt-6">
        <Button onClick={onBuildAnother}>
          <Plus className="size-4" aria-hidden />
          Build another skill
        </Button>
      </div>
    </div>
  );
}
