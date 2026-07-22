import type { Answers, ProcessStep, SkillDraft, UploadedResource } from "./types";
import { stripSecrets } from "./secret-scan";

/** The exact system prompt embedded for the LLM that assembles the final SKILL.md. */
export const ASSEMBLER_SYSTEM_PROMPT = `You are an expert at writing "Agent Skills" — SKILL.md files that teach an AI assistant how to perform a specific job the way a particular person does it. Think of the output as an onboarding document for a new hire, written for an AI reader.

You will receive: the author's identity, the skill's name (slug) and description, their questionnaire answers grouped by section, any AI follow-up Q&A, and a list of bundled resource files with relative paths.

Produce a single, complete SKILL.md as raw Markdown. Follow this EXACT shape and section order:

---
name: <slug>
description: <what it does AND when to use it>
---

# <Human Skill Title>

## When to use this
## Context the assistant needs
## The process
## Judgment calls & principles
## Standards / what good looks like
## Resources
## Common mistakes
## Examples

HARD RULES:
- Output ONLY the file contents. No preamble, no code fences around the whole file, no commentary.
- Frontmatter name: lowercase letters, numbers, hyphens only; <= 64 chars; must NOT contain "anthropic" or "claude"; no spaces or tags. Use the provided slug verbatim.
- Frontmatter description: non-empty; <= 1024 chars; must state what it does AND when to use it; no XML/HTML tags. Make it specific and slightly pushy about when to trigger, because these descriptions tend to under-trigger.
- Fill each body section from the matching answers. If an answer is missing or empty, write a clear "[TODO: ...]" placeholder describing what's needed — do NOT invent facts, examples, numbers, or tools.
- Under "The process", render the author's steps as an ordered list; for each step keep both WHAT and WHY.
- Under "Resources", reference EVERY bundled resource file by its exact relative path (e.g. examples/great-brief.md), plus any tools/links the author named.
- Keep the body focused and skimmable (aim under 500 lines). Prefer explaining the WHY behind steps over rigid ALL-CAPS commands.
- Write in the author's professional voice; plain, active, specific. Never include secrets or credentials.`;

/** Structured, LLM-ready view of the draft (secrets stripped). */
export function composeUserPayload(draft: SkillDraft): string {
  const { identity, basics, answers, followUps, resources } = draft;
  const clean = (s: string | undefined) => stripSecrets((s ?? "").trim());

  const lines: string[] = [];
  lines.push("## Identity");
  lines.push(`Name: ${clean(identity.name)}`);
  lines.push(
    `Role: ${clean(identity.role === "Other" ? identity.roleOther || "Other" : identity.role)}`,
  );
  lines.push("");
  lines.push("## Skill basics");
  lines.push(`Title: ${clean(basics.title)}`);
  lines.push(`Slug: ${clean(basics.slug)}`);
  lines.push(`Description (draft): ${clean(basics.description)}`);
  lines.push("");
  lines.push("## Answers");
  for (const [id, value] of Object.entries(answers)) {
    lines.push(`### ${id}`);
    lines.push(renderAnswer(value, clean));
    lines.push("");
  }
  if (followUps.length) {
    lines.push("## AI follow-up Q&A");
    for (const f of followUps) {
      if (!f.answer?.trim()) continue;
      lines.push(`Q (${f.sectionId}): ${clean(f.question)}`);
      lines.push(`A: ${clean(f.answer)}`);
      lines.push("");
    }
  }
  lines.push("## Bundled resource files (reference these by relative path)");
  if (resources.length === 0) {
    lines.push("(none uploaded)");
  } else {
    for (const r of resources) {
      lines.push(`- ${r.relativePath}${r.text ? ` — excerpt: ${clean(r.text).slice(0, 400)}` : ""}`);
    }
  }
  return lines.join("\n");
}

function renderAnswer(
  value: Answers[string],
  clean: (s: string | undefined) => string,
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "(empty)";
    if (typeof value[0] === "string") {
      return (value as string[]).map((v) => `- ${clean(v)}`).join("\n");
    }
    return (value as ProcessStep[])
      .map((s, i) => `${i + 1}. WHAT: ${clean(s.what)} | WHY: ${clean(s.why)}`)
      .join("\n");
  }
  return clean(value) || "(empty)";
}

/** Deterministic fallback SKILL.md used when the LLM call is unavailable. */
export function buildFallbackSkill(draft: SkillDraft): string {
  const { identity, basics, answers, followUps, resources } = draft;
  const clean = (s: string | undefined) => stripSecrets((s ?? "").trim());
  const title = basics.title.trim() || "Untitled skill";
  const description = clean(basics.description) || "[TODO: describe what this skill does and when to use it]";

  const get = (id: string): string => {
    const v = answers[id];
    if (typeof v === "string") return clean(v);
    return "";
  };

  const followUpsFor = (sectionId: string) =>
    followUps
      .filter((f) => f.sectionId === sectionId && f.answer?.trim())
      .map((f) => `- **${clean(f.question)}** ${clean(f.answer)}`)
      .join("\n");

  const section = (heading: string, body: string, sectionId?: string) => {
    const extra = sectionId ? followUpsFor(sectionId) : "";
    const content = [body || `[TODO: add ${heading.toLowerCase()}]`, extra]
      .filter(Boolean)
      .join("\n\n");
    return `## ${heading}\n\n${content}\n`;
  };

  const whenBody = [
    get("when_covers"),
    get("when_triggers") && `**Reach for this when:** ${get("when_triggers")}`,
    get("when_not") && `**Do not use it for:** ${get("when_not")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const processBody = renderProcess(answers["process_steps"], clean);
  const resourcesBody = renderResources(get("resources_list"), resources, clean);

  return `---
name: ${basics.slug}
description: ${yamlString(description)}
---

# ${title}

${section("When to use this", whenBody, "when")}
${section("Context the assistant needs", get("context_background"), "context")}
${section("The process", processBody, "process")}
${section("Judgment calls & principles", get("judgment_heuristics"), "judgment")}
${section("Standards / what good looks like", get("standards_bar"), "standards")}
${section("Resources", resourcesBody, "resources")}
${section("Common mistakes", get("mistakes_traps"), "mistakes")}
${section("Examples", get("examples_text"), "examples")}
${authorLine(identity, clean)}`;
}

function renderProcess(
  value: Answers[string] | undefined,
  clean: (s: string | undefined) => string,
): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const steps = value as ProcessStep[];
  return steps
    .filter((s) => s.what?.trim())
    .map((s, i) => {
      const what = clean(s.what);
      const why = clean(s.why);
      return `${i + 1}. **${what}**${why ? `\n   - Why it matters: ${why}` : ""}`;
    })
    .join("\n");
}

function renderResources(
  listText: string,
  resources: UploadedResource[],
  clean: (s: string | undefined) => string,
): string {
  const parts: string[] = [];
  if (listText) parts.push(clean(listText));
  if (resources.length) {
    parts.push(
      ["**Bundled files:**", ...resources.map((r) => `- \`${r.relativePath}\``)].join("\n"),
    );
  }
  return parts.join("\n\n");
}

function authorLine(
  identity: SkillDraft["identity"],
  clean: (s: string | undefined) => string,
): string {
  const name = clean(identity.name);
  const role = clean(
    identity.role === "Other" ? identity.roleOther || "Other" : identity.role,
  );
  if (!name && !role) return "";
  return `\n---\n\n_Authored by ${name || "a team member"}${role ? `, ${role}` : ""}._\n`;
}

/** Serialize a string safely for a single-line YAML value. */
export function yamlString(value: string): string {
  const oneLine = value.replace(/\s*\n\s*/g, " ").trim();
  if (/[:#"'\[\]{}|>*&!%@`]/.test(oneLine) || oneLine !== value) {
    return `"${oneLine.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return oneLine;
}
