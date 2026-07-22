"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Save, Code, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { parseFrontmatter, validateFrontmatter } from "@/lib/skill-validation";
import { SkillMarkdown } from "@/components/SkillMarkdown";
import type { SaveMode, SaveResult, SkillDraft } from "@/lib/types";

export function PreviewStep({
  draft,
  githubConfigured,
  defaultSaveMode,
  onSaved,
}: {
  draft: SkillDraft;
  githubConfigured: boolean;
  defaultSaveMode: SaveMode;
  onSaved: (result: SaveResult) => void;
}) {
  const [markdown, setMarkdown] = useState("");
  const [generating, setGenerating] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);
  const [view, setView] = useState<"rendered" | "raw">("rendered");
  const [mode, setMode] = useState<SaveMode>(defaultSaveMode);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    setSaveErr(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      setMarkdown(data.markdown ?? "");
      setUsedFallback(Boolean(data.usedFallback));
    } catch {
      setSaveErr("Generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  }, [draft]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    if (!githubConfigured || !draft.basics.slug) return;
    fetch(`/api/skills/exists?slug=${encodeURIComponent(draft.basics.slug)}`)
      .then((r) => r.json())
      .then((d) => setDuplicate(Boolean(d.exists)))
      .catch(() => setDuplicate(false));
  }, [githubConfigured, draft.basics.slug]);

  const validation = useMemo(() => {
    const fm = parseFrontmatter(markdown);
    return validateFrontmatter({ name: fm.name, description: fm.description });
  }, [markdown]);

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft, markdown, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveErr(data.error || "Save failed.");
        return;
      }
      onSaved(data.result as SaveResult);
    } catch {
      setSaveErr("Could not reach the server. Your file is safe — download it as a backup.");
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    validation.ok && !generating && (!duplicate || confirmUpdate) && githubConfigured;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border-strong bg-surface p-0.5">
          <ToggleBtn active={view === "rendered"} onClick={() => setView("rendered")}>
            <Eye className="size-4" aria-hidden /> Rendered
          </ToggleBtn>
          <ToggleBtn active={view === "raw"} onClick={() => setView("raw")}>
            <Code className="size-4" aria-hidden /> Raw / edit
          </ToggleBtn>
        </div>
        <Button variant="ghost" size="sm" onClick={generate} loading={generating}>
          <RefreshCw className="size-4" aria-hidden /> Regenerate
        </Button>
      </div>

      {usedFallback && (
        <Notice tone="info">
          Built with the deterministic template (AI assembly unavailable). You can edit the raw
          file below before saving.
        </Notice>
      )}

      {!validation.ok && (
        <Notice tone="danger" title="This file can't be saved yet">
          <ul className="mt-1 list-disc pl-5">
            {validation.errors.map((e, i) => (
              <li key={i}>
                <strong>{e.field}:</strong> {e.message}
              </li>
            ))}
          </ul>
          Edit the raw file to fix the frontmatter.
        </Notice>
      )}
      {validation.ok && validation.warnings.length > 0 && (
        <Notice tone="warn">
          {validation.warnings.map((w, i) => (
            <p key={i}>{w.message}</p>
          ))}
        </Notice>
      )}

      <div className="min-h-[300px] rounded-lg border border-border bg-surface">
        {generating ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted">
            <span className="mr-2 size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Assembling your SKILL.md…
          </div>
        ) : view === "rendered" ? (
          <div className="p-5">
            <SkillMarkdown markdown={markdown} />
          </div>
        ) : (
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            aria-label="Edit SKILL.md"
            className="h-[60vh] w-full resize-y rounded-lg bg-surface p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none"
          />
        )}
      </div>

      {duplicate && (
        <Notice tone="warn" title={`A skill named "${draft.basics.slug}" already exists`}>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmUpdate}
              onChange={(e) => setConfirmUpdate(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            <span>Yes, update the existing skill.</span>
          </label>
        </Notice>
      )}

      {saveErr && (
        <Notice tone="danger">
          <span className="flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {saveErr}
          </span>
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button variant="secondary" onClick={download}>
          <Download className="size-4" aria-hidden /> Download SKILL.md
        </Button>

        {githubConfigured ? (
          <>
            <div className="flex items-center gap-2">
              <label htmlFor="save-mode" className="text-sm text-muted">
                Save as
              </label>
              <Select
                id="save-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as SaveMode)}
                className="h-9 w-40"
              >
                <option value="pr">Pull request</option>
                <option value="direct">Direct commit</option>
              </Select>
            </div>
            <Button onClick={save} loading={saving} disabled={!canSave}>
              <Save className="size-4" aria-hidden />
              {duplicate ? "Update in repository" : "Save to team repository"}
            </Button>
          </>
        ) : (
          <Notice tone="info" className="flex-1">
            GitHub isn&apos;t configured, so saving to the repo is disabled. Download the file
            instead.
          </Notice>
        )}
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-brand-wash text-brand-ink" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
