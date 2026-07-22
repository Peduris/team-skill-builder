import { NextResponse } from "next/server";
import { improveDescription } from "@/lib/llm";
import { llmConfigured } from "@/lib/env";
import { stripSecrets } from "@/lib/secret-scan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!llmConfigured()) {
    return NextResponse.json({ configured: false, description: null });
  }
  let body: { draft?: string; title?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const draft = stripSecrets((body.draft ?? "").trim());
  if (!draft) return NextResponse.json({ error: "Draft is required." }, { status: 400 });

  const description = await improveDescription(
    draft,
    (body.title ?? "").trim(),
    (body.role ?? "").trim(),
  );
  return NextResponse.json({ configured: true, description });
}
