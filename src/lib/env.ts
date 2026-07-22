import "server-only";
import type { SaveMode } from "./types";

/**
 * Central, server-only access to configuration. Never import from client code.
 *
 * LLM calls go through Vercel AI Gateway (AI SDK `generateText` with a
 * `provider/model` string). Auth priority:
 * 1. AI_GATEWAY_API_KEY (optional static key)
 * 2. VERCEL_OIDC_TOKEN (auto on Vercel + after `vercel env pull`)
 */
export const env = {
  llm: {
    /** Gateway model slug, e.g. anthropic/claude-sonnet-4.6 */
    model: process.env.LLM_MODEL || "anthropic/claude-sonnet-4.6",
  },
  github: {
    token: process.env.GITHUB_TOKEN || "",
    owner: process.env.GITHUB_OWNER || "",
    repo: process.env.GITHUB_REPO || "",
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH || "main",
    saveMode: (process.env.GITHUB_SAVE_MODE as SaveMode) || "pr",
  },
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || "10"),
};

/** True when AI Gateway auth is available (OIDC on Vercel, or an explicit key). */
export function llmConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL === "1",
  );
}

export function githubConfigured(): boolean {
  return Boolean(env.github.token && env.github.owner && env.github.repo);
}
