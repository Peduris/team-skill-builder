import { NextResponse } from "next/server";
import { assembleSkill } from "@/lib/llm";
import { llmConfigured } from "@/lib/env";
import { parseFrontmatter, validateFrontmatter } from "@/lib/skill-validation";
import { scanForSecrets } from "@/lib/secret-scan";
import type { SkillDraft } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let draft: SkillDraft;
  try {
    draft = (await request.json()) as SkillDraft;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!draft?.basics?.slug) {
    return NextResponse.json({ error: "Missing skill basics." }, { status: 400 });
  }

  const { markdown, usedFallback } = await assembleSkill(draft);
  const fm = parseFrontmatter(markdown);
  const validation = validateFrontmatter({ name: fm.name, description: fm.description });
  const secrets = scanForSecrets(markdown);

  return NextResponse.json({
    markdown,
    usedFallback,
    llmConfigured: llmConfigured(),
    validation,
    secrets: secrets.map((s) => s.kind),
  });
}
