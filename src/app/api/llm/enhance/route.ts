import { NextResponse } from "next/server";
import { enhanceSkill } from "@/lib/llm";
import { llmConfigured } from "@/lib/env";
import { parseFrontmatter, validateFrontmatter } from "@/lib/skill-validation";
import { scanForSecrets, stripSecrets } from "@/lib/secret-scan";
import type { SkillDraft } from "@/lib/types";

export const runtime = "nodejs";

interface EnhanceBody {
  draft: SkillDraft;
  markdown: string;
}

export async function POST(request: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      {
        error:
          "LLM is not configured. On Vercel, AI Gateway uses OIDC automatically. Locally run `vercel env pull`, or set AI_GATEWAY_API_KEY.",
      },
      { status: 503 },
    );
  }

  let body: EnhanceBody;
  try {
    body = (await request.json()) as EnhanceBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { draft, markdown } = body;
  if (!draft?.basics?.slug || !markdown?.trim()) {
    return NextResponse.json(
      { error: "Missing draft or current SKILL.md markdown." },
      { status: 400 },
    );
  }

  const enhanced = await enhanceSkill(draft, markdown);
  if (!enhanced) {
    return NextResponse.json(
      { error: "Enhancement failed. Keep your current draft and try again." },
      { status: 502 },
    );
  }

  const cleaned = stripSecrets(enhanced);
  const fm = parseFrontmatter(cleaned);
  // Preserve the author's slug even if the model drifted.
  let finalMd = cleaned;
  if (fm.name && fm.name !== draft.basics.slug) {
    finalMd = cleaned.replace(/^name:\s*.+$/m, `name: ${draft.basics.slug}`);
  }
  const finalFm = parseFrontmatter(finalMd);
  const validation = validateFrontmatter({
    name: finalFm.name || draft.basics.slug,
    description: finalFm.description,
  });
  const secrets = scanForSecrets(finalMd);

  return NextResponse.json({
    markdown: finalMd,
    validation,
    secrets: secrets.map((s) => s.kind),
  });
}
