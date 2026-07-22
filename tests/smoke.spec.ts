import { test, expect } from "@playwright/test";

test("landing page shows hero and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Teach the team");
  await expect(page.getByRole("link", { name: /Start building my skill/i })).toBeVisible();
  // GitHub isn't configured in tests, so the library shows the connect notice.
  await expect(page.getByText(/Skill library not connected/i)).toBeVisible();
});

test("builder: identity step derives slug and advances", async ({ page }) => {
  await page.goto("/build");

  await expect(page.getByRole("heading", { name: /start with the basics/i })).toBeVisible();

  await page.getByLabel(/Your name/i).fill("Jordan Rivera");
  await page.getByLabel(/Your role \/ position/i).selectOption("Copywriter");
  await page.getByLabel(/Skill name/i).fill("Landing Page Copywriting");

  // Slug is auto-derived and shown in the file slug field.
  await expect(page.getByLabel(/File slug/i)).toHaveValue("landing-page-copywriting");

  // The live file preview reflects the slug.
  await expect(page.getByText("skills/landing-page-copywriting/SKILL.md")).toBeVisible();

  await page
    .getByLabel(/Skill description/i)
    .fill("Use when writing or revising landing page hero and section copy for product launches.");

  // No AI button when the LLM isn't configured (graceful degradation).
  await expect(page.getByRole("button", { name: /Improve with AI/i })).toHaveCount(0);

  await page.getByRole("button", { name: /Continue/i }).click();

  await expect(page.getByRole("heading", { name: /When to use this skill/i })).toBeVisible();
});

test("builder: required validation blocks empty identity", async ({ page }) => {
  await page.goto("/build");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.getByText(/Your name is required/i)).toBeVisible();
});
