"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge, Notice } from "@/components/ui/Feedback";
import type { ExistingSkill } from "@/lib/types";

export function ExistingSkills() {
  const [skills, setSkills] = useState<ExistingSkill[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/skills${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();
      setConfigured(data.configured);
      setSkills(data.skills ?? []);
      if (data.error) setError(data.error);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter((s) =>
      [s.title, s.slug, s.description, s.role, s.author]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [skills, query]);

  if (!configured) {
    return (
      <Notice tone="info" title="Skill library not connected">
        Set <code>GITHUB_TOKEN</code>, <code>GITHUB_OWNER</code>, and{" "}
        <code>GITHUB_REPO</code> to list your team&apos;s existing skills here.
      </Notice>
    );
  }

  return (
    <section aria-labelledby="library-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-brand" aria-hidden />
          <h2 id="library-heading" className="text-lg font-semibold">
            Skill library
          </h2>
          <Badge>{skills.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills…"
              aria-label="Search skills"
              className="h-9 w-56 pl-8"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            loading={loading}
            aria-label="Refresh skill list"
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {!loading && filtered.length === 0 && (
        <Notice tone="info">
          {skills.length === 0
            ? "No skills in the repository yet. Be the first to add one."
            : "No skills match your search."}
        </Notice>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {filtered.map((s) => (
          <li key={s.path} className="flex items-start justify-between gap-4 p-4 hover:bg-surface-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{s.title}</span>
                <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
                  {s.slug}
                </code>
                {s.role && <Badge>{s.role}</Badge>}
              </div>
              {s.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>
              )}
            </div>
            {s.htmlUrl && (
              <a
                href={s.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm text-brand-ink hover:underline"
              >
                View <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
