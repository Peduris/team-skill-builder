export interface SecretHit {
  kind: string;
  preview: string;
}

/**
 * Detect common secret / credential patterns in free text.
 * Intentionally conservative-but-noisy: we would rather warn than leak.
 */
const PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: "OpenAI key", re: /\bsk-[a-zA-Z0-9]{20,}\b/g },
  { kind: "Anthropic key", re: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/g },
  { kind: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { kind: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "Slack token", re: /\bxox[abposr]-[0-9A-Za-z-]{10,}\b/g },
  { kind: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { kind: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: "Bearer token", re: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi },
  {
    kind: "Generic secret assignment",
    re: /\b(?:api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*['"]?[A-Za-z0-9._\-/+]{12,}['"]?/gi,
  },
];

export function scanForSecrets(text: string): SecretHit[] {
  if (!text) return [];
  const hits: SecretHit[] = [];
  const seen = new Set<string>();
  for (const { kind, re } of PATTERNS) {
    const matches = text.matchAll(re);
    for (const m of matches) {
      const raw = m[0];
      const key = `${kind}:${raw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ kind, preview: redact(raw) });
    }
  }
  return hits;
}

export function hasSecrets(text: string): boolean {
  return scanForSecrets(text).length > 0;
}

/** Replace detected secrets with a placeholder so a file never carries them. */
export function stripSecrets(text: string): string {
  let out = text;
  for (const { re } of PATTERNS) {
    out = out.replace(re, "[REDACTED_SECRET]");
  }
  return out;
}

function redact(raw: string): string {
  if (raw.length <= 8) return "****";
  return `${raw.slice(0, 4)}…${raw.slice(-2)}`;
}
