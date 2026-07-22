import { NextResponse } from "next/server";
import { githubConfigured } from "@/lib/env";
import { GitHubApiError, GitHubConfigError, saveSkill } from "@/lib/github";
import { parseFrontmatter, validateFrontmatter } from "@/lib/skill-validation";
import { scanForSecrets } from "@/lib/secret-scan";
import type { SaveMode, SkillDraft } from "@/lib/types";

export const runtime = "nodejs";

interface SaveBody {
  draft: SkillDraft;
  markdown: string;
  mode?: SaveMode;
}

export async function POST(request: Request) {
  if (!githubConfigured()) {
    return NextResponse.json(
      { error: "GitHub is not configured on the server. Download the file instead." },
      { status: 503 },
    );
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { draft, markdown } = body;
  if (!markdown?.trim() || !draft?.basics?.slug) {
    return NextResponse.json({ error: "Missing markdown or skill basics." }, { status: 400 });
  }

  // Block save on invalid frontmatter.
  const fm = parseFrontmatter(markdown);
  const validation = validateFrontmatter({ name: fm.name, description: fm.description });
  if (!validation.ok) {
    return NextResponse.json(
      { error: "SKILL.md failed validation.", validation },
      { status: 422 },
    );
  }

  // Never write secrets into the repo.
  const secrets = scanForSecrets(markdown);
  if (secrets.length > 0) {
    return NextResponse.json(
      {
        error: `The file appears to contain secrets (${secrets.map((s) => s.kind).join(", ")}). Remove them before saving.`,
      },
      { status: 422 },
    );
  }

  const role =
    draft.identity.role === "Other"
      ? draft.identity.roleOther || "Other"
      : draft.identity.role || "";

  try {
    const result = await saveSkill({
      slug: draft.basics.slug,
      title: draft.basics.title || fm.title || draft.basics.slug,
      markdown,
      resources: draft.resources ?? [],
      author: draft.identity.name || "",
      role,
      description: fm.description,
      mode: body.mode,
    });
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof GitHubConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
