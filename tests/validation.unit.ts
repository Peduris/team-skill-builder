import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateName,
  validateDescription,
  validateFrontmatter,
  parseFrontmatter,
} from "../src/lib/skill-validation";

describe("validateName", () => {
  it("accepts valid slugs", () => {
    assert.equal(validateName("landing-page-copy").length, 0);
  });
  it("rejects reserved words, spaces, and overlong names", () => {
    assert.ok(validateName("claude-helper").length > 0);
    assert.ok(validateName("Landing Page").length > 0);
    assert.ok(validateName("a".repeat(65)).length > 0);
  });
});

describe("validateDescription", () => {
  it("requires when-to-use language", () => {
    const bad = validateDescription("Writes landing page copy and CTAs.");
    assert.ok(bad.errors.some((e) => e.message.includes("WHEN")));
  });
  it("accepts a what+when description", () => {
    const good = validateDescription(
      "Write landing page copy. Use when someone needs a hero, CTA, or campaign page rewrite.",
    );
    assert.equal(good.errors.length, 0);
  });
});

describe("validateFrontmatter + parseFrontmatter", () => {
  it("parses and validates a complete SKILL.md", () => {
    const md = `---
name: landing-page-copy
description: Write landing page copy. Use when drafting heroes, CTAs, or campaign pages.
---

# Landing Page Copy
`;
    const fm = parseFrontmatter(md);
    assert.equal(fm.name, "landing-page-copy");
    assert.equal(fm.title, "Landing Page Copy");
    const result = validateFrontmatter(fm);
    assert.equal(result.ok, true);
  });
});
