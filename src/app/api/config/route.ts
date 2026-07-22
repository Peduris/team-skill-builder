import { NextResponse } from "next/server";
import { env, githubConfigured, llmConfigured } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    githubConfigured: githubConfigured(),
    llmConfigured: llmConfigured(),
    saveMode: env.github.saveMode,
    maxUploadMb: env.maxUploadMb,
    repo:
      githubConfigured() ? `${env.github.owner}/${env.github.repo}` : null,
  });
}
