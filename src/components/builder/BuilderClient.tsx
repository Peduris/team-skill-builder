"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, FileCode2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Feedback";
import { SECTIONS, questionsForSection } from "@/lib/questionnaire";
import { validateName, validateDescription } from "@/lib/skill-validation";
import { useSkillDraft } from "@/lib/draft-store";
import type { ProcessStep, SaveMode, SaveResult, SkillDraft } from "@/lib/types";
import { IdentityStep } from "./IdentityStep";
import { SectionStep } from "./SectionStep";
import { ReviewStep } from "./ReviewStep";
import { PreviewStep } from "./PreviewStep";
import { ResultStep } from "./ResultStep";
import { LiveFile } from "./LiveFile";

type Phase = "identity" | "section" | "review" | "preview" | "result";

interface Config {
  githubConfigured: boolean;
  llmConfigured: boolean;
  saveMode: SaveMode;
  repo: string | null;
}

export function BuilderClient() {
  const { draft, setDraft, reset, hydrated } = useSkillDraft();
  const [phase, setPhase] = useState<Phase>("identity");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [config, setConfig] = useState<Config>({
    githubConfigured: false,
    llmConfigured: false,
    saveMode: "pr",
    repo: null,
  });

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => {});
  }, []);

  const totalSteps = 1 + SECTIONS.length + 2; // identity + sections + review + preview
  const currentStep =
    phase === "identity"
      ? 1
      : phase === "section"
        ? 2 + sectionIndex
        : phase === "review"
          ? 1 + SECTIONS.length + 1
          : 2 + SECTIONS.length + 1;
  const progress = (Math.min(currentStep, totalSteps) / totalSteps) * 100;

  const identityValid = useMemo(() => {
    const nameOk = draft.identity.name.trim().length > 0;
    const roleOk = draft.identity.role.trim().length > 0;
    const slugOk = validateName(draft.basics.slug).length === 0;
    const descOk = validateDescription(draft.basics.description).errors.length === 0;
    return nameOk && roleOk && slugOk && descOk;
  }, [draft]);

  const sectionValid = (index: number): boolean => {
    const section = SECTIONS[index];
    return questionsForSection(section.id)
      .filter((q) => q.required)
      .every((q) => {
        const v = draft.answers[q.id];
        if (q.type === "process-steps") {
          return ((v as ProcessStep[]) ?? []).some((s) => s.what.trim());
        }
        return typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) && v.length > 0;
      });
  };

  const goNext = () => {
    if (phase === "identity") {
      if (!identityValid) return setShowErrors(true);
      setShowErrors(false);
      setPhase("section");
      setSectionIndex(0);
      scrollTop();
      return;
    }
    if (phase === "section") {
      if (!sectionValid(sectionIndex)) return setShowErrors(true);
      setShowErrors(false);
      if (sectionIndex < SECTIONS.length - 1) {
        setSectionIndex((i) => i + 1);
      } else {
        setPhase("review");
      }
      scrollTop();
      return;
    }
    if (phase === "review") {
      setPhase("preview");
      scrollTop();
    }
  };

  const goBack = () => {
    setShowErrors(false);
    if (phase === "section") {
      if (sectionIndex === 0) setPhase("identity");
      else setSectionIndex((i) => i - 1);
    } else if (phase === "review") {
      setPhase("section");
      setSectionIndex(SECTIONS.length - 1);
    } else if (phase === "preview") {
      setPhase("review");
    }
    scrollTop();
  };

  const startOver = () => {
    reset();
    setPhase("identity");
    setSectionIndex(0);
    setResult(null);
    setShowErrors(false);
    scrollTop();
  };

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted">Loading…</div>
    );
  }

  const showLiveFile = phase === "identity" || phase === "section";

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Home
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileCode2 className="size-4 text-brand" aria-hidden />
          Team Skill Builder
        </div>
        <button
          onClick={startOver}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Start over
        </button>
      </div>

      {phase !== "result" && (
        <div className="mb-8">
          <Progress
            value={progress}
            label={`Step ${Math.min(currentStep, totalSteps)} of ${totalSteps}`}
          />
        </div>
      )}

      <div
        className={
          showLiveFile ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" : ""
        }
      >
        <div className="min-w-0 animate-fade-rise" key={`${phase}-${sectionIndex}`}>
          {phase !== "result" && (
            <header className="mb-6">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
                {headerFor(phase, sectionIndex).title}
              </h1>
              <p className="mt-1.5 text-muted measure">{headerFor(phase, sectionIndex).blurb}</p>
            </header>
          )}

          {phase === "identity" && (
            <IdentityStep
              draft={draft}
              setDraft={setDraft}
              llmConfigured={config.llmConfigured}
              showErrors={showErrors}
            />
          )}
          {phase === "section" && (
            <SectionStep
              section={SECTIONS[sectionIndex]}
              draft={draft}
              setDraft={setDraft}
              llmConfigured={config.llmConfigured}
              showErrors={showErrors}
            />
          )}
          {phase === "review" && <ReviewStep draft={draft} />}
          {phase === "preview" && (
            <PreviewStep
              draft={draft}
              githubConfigured={config.githubConfigured}
              defaultSaveMode={config.saveMode}
              repo={config.repo}
              llmConfigured={config.llmConfigured}
              onSaved={(r) => {
                setResult(r);
                setPhase("result");
                scrollTop();
              }}
            />
          )}
          {phase === "result" && result && (
            <ResultStep result={result} onBuildAnother={startOver} />
          )}

          {phase !== "result" && phase !== "preview" && (
            <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={phase === "identity"}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back
              </Button>
              <Button onClick={goNext}>
                {phase === "review" ? "Generate skill" : "Continue"}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}

          {phase === "preview" && (
            <div className="mt-6">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="size-4" aria-hidden />
                Back to review
              </Button>
            </div>
          )}
        </div>

        {showLiveFile && (
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <LiveFile draft={draft} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function headerFor(phase: Phase, sectionIndex: number): { title: string; blurb: string } {
  if (phase === "identity")
    return {
      title: "Let's start with the basics",
      blurb: "Tell us who you are and what skill you're capturing.",
    };
  if (phase === "section") {
    const s = SECTIONS[sectionIndex];
    return { title: s.title, blurb: s.blurb };
  }
  if (phase === "review")
    return { title: "Review your answers", blurb: "Check everything, then generate the file." };
  return {
    title: "Your SKILL.md",
    blurb:
      "Preview, enhance with AI to fill gaps, then save it to the team skills repository.",
  };
}

function scrollTop() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
}

export type { SkillDraft };
