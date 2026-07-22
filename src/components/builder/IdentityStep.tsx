"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { CharCount, Notice } from "@/components/ui/Feedback";
import { slugify } from "@/lib/slug";
import { DESCRIPTION_MAX, validateName, validateDescription } from "@/lib/skill-validation";
import { ROLES, type SkillDraft } from "@/lib/types";

export function IdentityStep({
  draft,
  setDraft,
  llmConfigured,
  showErrors,
}: {
  draft: SkillDraft;
  setDraft: React.Dispatch<React.SetStateAction<SkillDraft>>;
  llmConfigured: boolean;
  showErrors: boolean;
}) {
  const [slugEdited, setSlugEdited] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveErr, setImproveErr] = useState<string | null>(null);

  const { identity, basics } = draft;
  const setIdentity = (patch: Partial<SkillDraft["identity"]>) =>
    setDraft((d) => ({ ...d, identity: { ...d.identity, ...patch } }));
  const setBasics = (patch: Partial<SkillDraft["basics"]>) =>
    setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));

  const onTitle = (title: string) => {
    setBasics({ title, ...(slugEdited ? {} : { slug: slugify(title) }) });
  };
  const onSlug = (slug: string) => {
    setSlugEdited(true);
    setBasics({ slug: slugify(slug) });
  };

  const nameErr = showErrors && !identity.name.trim() ? "Your name is required." : undefined;
  const slugErrors = validateName(basics.slug);
  const slugErr =
    (showErrors || slugEdited) && slugErrors.length ? slugErrors[0].message : undefined;
  const descCheck = validateDescription(basics.description);
  const descErr = showErrors && descCheck.errors.length ? descCheck.errors[0].message : undefined;
  const descWarn = basics.description.trim() && descCheck.warnings.length
    ? descCheck.warnings[0].message
    : undefined;

  const improve = async () => {
    if (!basics.description.trim()) return;
    setImproving(true);
    setImproveErr(null);
    try {
      const role = identity.role === "Other" ? identity.roleOther || "Other" : identity.role;
      const res = await fetch("/api/llm/improve-description", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: basics.description, title: basics.title, role }),
      });
      const data = await res.json();
      if (data.description) setBasics({ description: data.description });
      else setImproveErr("Couldn't improve the description right now. Your text is unchanged.");
    } catch {
      setImproveErr("Couldn't reach the AI service. Your text is unchanged.");
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" required error={nameErr}>
          {(id) => (
            <Input
              id={id}
              value={identity.name}
              onChange={(e) => setIdentity({ name: e.target.value })}
              placeholder="Jordan Rivera"
              autoComplete="name"
            />
          )}
        </Field>
        <Field label="Your role / position" required>
          {(id) => (
            <Select
              id={id}
              value={identity.role}
              onChange={(e) => setIdentity({ role: e.target.value as SkillDraft["identity"]["role"] })}
            >
              <option value="" disabled>
                Select a role…
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {identity.role === "Other" && (
        <Field label="Describe your role">
          {(id) => (
            <Input
              id={id}
              value={identity.roleOther ?? ""}
              onChange={(e) => setIdentity({ roleOther: e.target.value })}
              placeholder="e.g. Community Manager"
            />
          )}
        </Field>
      )}

      <Field label="Email (optional)" help="Only used to attribute the skill in the commit/PR.">
        {(id) => (
          <Input
            id={id}
            type="email"
            value={identity.email ?? ""}
            onChange={(e) => setIdentity({ email: e.target.value })}
            placeholder="jordan@company.com"
            autoComplete="email"
          />
        )}
      </Field>

      <hr className="border-border" />

      <Field
        label="Skill name"
        help="A human title for the skill. We derive the file slug from it."
        required
      >
        {(id) => (
          <Input
            id={id}
            value={basics.title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Landing page copywriting"
          />
        )}
      </Field>

      <Field
        label="File slug"
        error={slugErr}
        hint={<span className="font-mono text-xs text-muted">skills/{basics.slug || "…"}/</span>}
      >
        {(id) => (
          <Input
            id={id}
            value={basics.slug}
            onChange={(e) => onSlug(e.target.value)}
            placeholder="landing-page-copywriting"
            className="font-mono"
          />
        )}
      </Field>

      <Field
        label="Skill description"
        help="One line: what it does AND when to use it. Be specific and a little pushy about when to trigger."
        required
        error={descErr}
        hint={<CharCount value={basics.description.length} max={DESCRIPTION_MAX} />}
      >
        {(id) => (
          <div className="space-y-2">
            <Textarea
              id={id}
              value={basics.description}
              maxLength={DESCRIPTION_MAX + 200}
              onChange={(e) => setBasics({ description: e.target.value })}
              placeholder="Use when writing or revising landing page copy for product launches and campaigns…"
            />
            {llmConfigured && (
              <Button
                variant="secondary"
                size="sm"
                onClick={improve}
                loading={improving}
                disabled={!basics.description.trim()}
                type="button"
              >
                <Sparkles className="size-4" aria-hidden />
                Improve with AI
              </Button>
            )}
          </div>
        )}
      </Field>

      {descWarn && <Notice tone="warn">{descWarn}</Notice>}
      {improveErr && <Notice tone="danger">{improveErr}</Notice>}
    </div>
  );
}
