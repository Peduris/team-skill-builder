import type { ValidationIssue, ValidationResult } from "./types";

export const NAME_MAX = 64;
export const DESCRIPTION_MAX = 1024;

const NAME_RE = /^[a-z0-9-]+$/;
const RESERVED_WORDS = ["anthropic", "claude"];
// Very light heuristic: does the description hint at *when* to use the skill?
const WHEN_HINTS = [
  "when",
  "use this",
  "use when",
  "for ",
  "whenever",
  "if you",
  "trigger",
  "reach for",
];

/** Validate a skill name (the frontmatter `name` / slug). */
export function validateName(name: string): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const value = name.trim();
  if (!value) {
    errors.push({ field: "name", message: "Name is required." });
    return errors;
  }
  if (value.length > NAME_MAX) {
    errors.push({
      field: "name",
      message: `Name must be ${NAME_MAX} characters or fewer (currently ${value.length}).`,
    });
  }
  if (!NAME_RE.test(value)) {
    errors.push({
      field: "name",
      message:
        "Name may only contain lowercase letters, numbers, and hyphens (no spaces or symbols).",
    });
  }
  if (/<[^>]*>/.test(value)) {
    errors.push({ field: "name", message: "Name must not contain XML/HTML tags." });
  }
  for (const word of RESERVED_WORDS) {
    if (value.includes(word)) {
      errors.push({
        field: "name",
        message: `Name must not contain the reserved word "${word}".`,
      });
    }
  }
  return errors;
}

/** Validate a skill description (the frontmatter `description`). */
export function validateDescription(description: string): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const value = description.trim();
  if (!value) {
    errors.push({ field: "description", message: "Description is required." });
    return { errors, warnings };
  }
  if (value.length > DESCRIPTION_MAX) {
    errors.push({
      field: "description",
      message: `Description must be ${DESCRIPTION_MAX} characters or fewer (currently ${value.length}).`,
    });
  }
  if (/<[^>]*>/.test(value)) {
    errors.push({
      field: "description",
      message: "Description must not contain XML/HTML tags.",
    });
  }
  const lower = value.toLowerCase();
  const hasWhen = WHEN_HINTS.some((h) => lower.includes(h));
  if (!hasWhen) {
    // Contract: description must contain both what it does AND when to use it.
    // Missing "when" blocks save — these descriptions tend to under-trigger.
    errors.push({
      field: "description",
      message:
        'Description must say WHEN to use the skill (e.g. include "Use when…", "whenever…", or "for …").',
    });
  }
  if (value.length < 40) {
    warnings.push({
      field: "description",
      message: "Description is very short; add what it does AND when to use it.",
    });
  }
  return { errors, warnings };
}

export interface Frontmatter {
  name: string;
  description: string;
}

export function validateFrontmatter(fm: Frontmatter): ValidationResult {
  const nameErrors = validateName(fm.name);
  const { errors: descErrors, warnings } = validateDescription(fm.description);
  const errors = [...nameErrors, ...descErrors];
  return { ok: errors.length === 0, errors, warnings };
}

/** Parse frontmatter from a full SKILL.md string (no external deps, tolerant). */
export function parseFrontmatter(md: string): {
  name: string;
  description: string;
  title: string;
} {
  const result = { name: "", description: "", title: "" };
  const match = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (match) {
    const block = match[1];
    const nameMatch = block.match(/^name:\s*(.+)$/m);
    const descMatch = block.match(/^description:\s*([\s\S]*?)(?=\n\w+:|\n*$)/m);
    if (nameMatch) result.name = unquote(nameMatch[1].trim());
    if (descMatch) result.description = unquote(descMatch[1].trim());
  }
  const titleMatch = md.match(/^#\s+(.+)$/m);
  if (titleMatch) result.title = titleMatch[1].trim();
  return result;
}

function unquote(s: string): string {
  return s.replace(/^["']|["']$/g, "").trim();
}
