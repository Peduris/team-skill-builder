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
