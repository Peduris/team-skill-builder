import { NextResponse } from "next/server";
import { generateFollowUps } from "@/lib/llm";
import { llmConfigured } from "@/lib/env";
import { stripSecrets } from "@/lib/secret-scan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!llmConfigured()) {
    return NextResponse.json({ configured: false, questions: [] });
  }
  let body: { sectionTitle?: string; role?: string; answersSoFar?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const questions = await generateFollowUps(
    (body.sectionTitle ?? "").trim(),
    (body.role ?? "").trim(),
    stripSecrets((body.answersSoFar ?? "").trim()).slice(0, 6000),
  );
  return NextResponse.json({ configured: true, questions });
}
