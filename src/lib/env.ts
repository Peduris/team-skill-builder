import "server-only";
import type { SaveMode } from "./types";

/** Central, server-only access to configuration. Never import from client code. */
export const env = {
  llm: {
    provider: process.env.LLM_PROVIDER || "anthropic",
    apiKey: process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || "",
    model: process.env.LLM_MODEL || "claude-3-5-sonnet-latest",
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

export function llmConfigured(): boolean {
  return Boolean(env.llm.apiKey);
}

export function githubConfigured(): boolean {
  return Boolean(env.github.token && env.github.owner && env.github.repo);
}
