import { NextResponse } from "next/server";
import { tailorAnswer, type TailorKind } from "@/lib/llm";
import { llmConfigured } from "@/lib/env";
import { stripSecrets } from "@/lib/secret-scan";

export const runtime = "nodejs";

interface TailorBody {
  kind?: TailorKind;
  questionLabel?: string;
  questionHelp?: string;
  sectionTitle?: string;
  skillTitle?: string;
  role?: string;
  currentAnswer?: string;
  sectionContext?: string;
}

export async function POST(request: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      {
        error:
          "LLM is not configured. On Vercel, AI Gateway uses OIDC automatically.",
      },
      { status: 503 },
    );
  }

  let body: TailorBody;
  try {
    body = (await request.json()) as TailorBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind: TailorKind = body.kind === "process-steps" ? "process-steps" : "text";
  const questionLabel = (body.questionLabel ?? "").trim();
  if (!questionLabel) {
    return NextResponse.json({ error: "questionLabel is required." }, { status: 400 });
  }

  const result = await tailorAnswer({
    kind,
    questionLabel,
    questionHelp: body.questionHelp,
    sectionTitle: (body.sectionTitle ?? "").trim(),
    skillTitle: (body.skillTitle ?? "").trim(),
    role: (body.role ?? "").trim(),
    currentAnswer: stripSecrets((body.currentAnswer ?? "").trim()).slice(0, 8000),
    sectionContext: stripSecrets((body.sectionContext ?? "").trim()).slice(0, 4000),
  });

  if (!result) {
    return NextResponse.json(
      { error: "Tailoring failed. Your answer is unchanged — try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ answer: stripSecrets(result) });
}
