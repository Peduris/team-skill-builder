"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SkillDraft } from "./types";

const KEY = "team-skill-builder:draft:v1";

export function emptyDraft(): SkillDraft {
  return {
    identity: { name: "", role: "", roleOther: "", email: "" },
    basics: { title: "", slug: "", description: "" },
    answers: {},
    followUps: [],
    resources: [],
  };
}

/**
 * Draft state persisted to sessionStorage so a mid-survey refresh does not wipe
 * answers. It is session-scoped only: there is no cross-visit persistence and no
 * accounts. Closing the tab ends the "visit".
 */
export function useSkillDraft() {
  const [draft, setDraft] = useState<SkillDraft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setDraft({ ...emptyDraft(), ...(JSON.parse(raw) as SkillDraft) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* quota / disabled: non-fatal */
    }
  }, [draft]);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setDraft(emptyDraft());
  }, []);

  return { draft, setDraft, reset, hydrated };
}
