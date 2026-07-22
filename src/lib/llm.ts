import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env, llmConfigured } from "./env";
import type { SkillDraft } from "./types";
import {
  ASSEMBLER_SYSTEM_PROMPT,
  buildFallbackSkill,
  composeUserPayload,
} from "./assembler";

function client(): Anthropic | null {
  if (!llmConfigured()) return null;
  return new Anthropic({ apiKey: env.llm.apiKey });
}

async function complete(
  system: string,
  user: string,
  maxTokens = 2000,
): Promise<string | null> {
  const anthropic = client();
  if (!anthropic) return null;
  try {
    const res = await anthropic.messages.create({
      model: env.llm.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.error("[llm] completion failed:", (err as Error).message);
    return null;
  }
}

/** Rewrite a rough description into a tighter, trigger-focused one. Returns null on failure. */
export async function improveDescription(
  draft: string,
  title: string,
  role: string,
): Promise<string | null> {
  const system =
    "You improve Agent Skill descriptions. Return ONE line: what the skill does AND when to use it. Max 1024 chars. Be specific and slightly pushy about when to trigger. No quotes, no markdown, no preamble.";
  const user = `Skill title: ${title}\nAuthor role: ${role}\nDraft description: ${draft}`;
  const out = await complete(system, user, 400);
  return out ? out.replace(/^["']|["']$/g, "").trim() : null;
}

/** Generate 1-3 tailored follow-up questions for a section. Returns [] on failure. */
export async function generateFollowUps(
  sectionTitle: string,
  role: string,
  answersSoFar: string,
): Promise<string[]> {
  const system =
    "You generate 1-3 short, specific follow-up questions to deepen an Agent Skill. Base them on the person's role and answers. Return ONLY the questions, one per line, no numbering, no preamble. Keep each under 160 characters.";
  const user = `Section: ${sectionTitle}\nAuthor role: ${role}\nAnswers so far:\n${answersSoFar}`;
  const out = await complete(system, user, 500);
  if (!out) return [];
  return out
    .split("\n")
    .map((l) => l.replace(/^[\d.)\-*\s]+/, "").trim())
    .filter((l) => l.length > 3)
    .slice(0, 3);
}

/**
 * Assemble the final SKILL.md. Always returns a string:
 * the LLM output when available, otherwise the deterministic fallback template.
 */
export async function assembleSkill(
  draft: SkillDraft,
): Promise<{ markdown: string; usedFallback: boolean }> {
  const payload = composeUserPayload(draft);
  const out = await complete(ASSEMBLER_SYSTEM_PROMPT, payload, 3500);
  if (!out) {
    return { markdown: buildFallbackSkill(draft), usedFallback: true };
  }
  // Strip accidental surrounding code fences if the model added them.
  const cleaned = out
    .replace(/^```(?:markdown|md)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
  return { markdown: cleaned, usedFallback: false };
}

/** System prompt for turning a draft SKILL.md into a stronger, more complete skill. */
export const ENHANCE_SYSTEM_PROMPT = `You are an expert Agent Skill editor. You receive a draft SKILL.md plus the author's questionnaire answers and bundled resource paths.

Your job: ENHANCE the skill — fill gaps, sharpen triggers, deepen judgment, and make it ready for a teammate or AI to follow — WITHOUT inventing false company facts, fake tools, or fake examples.

Rules:
1. Output ONLY the complete enhanced SKILL.md (frontmatter + body). No preamble, no code fences around the whole file.
2. Keep the frontmatter \`name\` (slug) EXACTLY as given. Improve \`description\` so it states what it does AND when to use it (≤1024 chars); make triggers slightly pushy.
3. Preserve every required body section in this order:
   When to use this | Context the assistant needs | The process | Judgment calls & principles | Standards / what good looks like | Resources | Common mistakes | Examples
4. Expand thin sections with concrete, actionable guidance derived from the author's answers and role. Prefer explaining WHY behind steps.
5. Replace vague "[TODO: ...]" placeholders with best-effort content grounded in the draft. If you truly lack signal, keep a short TODO rather than inventing.
6. Under Resources, keep every bundled relative path (e.g. examples/foo.md) and any tools/links the author named.
7. Keep the body skimmable (aim under 500 lines). No secrets or credentials. Write in a clear professional voice.
8. Do not invent example outputs that claim to be real past work — invent only illustrative patterns clearly marked as "Example pattern:" if needed.`;

/**
 * Enhance an existing SKILL.md draft. Returns null if the LLM is unavailable.
 * Caller should keep the previous markdown on failure.
 */
export async function enhanceSkill(
  draft: SkillDraft,
  currentMarkdown: string,
): Promise<string | null> {
  const payload = [
    "## Current SKILL.md draft",
    currentMarkdown.trim(),
    "",
    "## Author questionnaire (source of truth — use this to fill gaps)",
    composeUserPayload(draft),
  ].join("\n");
  const out = await complete(ENHANCE_SYSTEM_PROMPT, payload, 4000);
  if (!out) return null;
  return out
    .replace(/^```(?:markdown|md)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
}
