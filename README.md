# Team Skill Builder

Internal web app that walks a team member through a guided questionnaire and produces a valid Agent Skill (`SKILL.md`), then saves it to a shared GitHub repository. Anyone can also browse skills that already exist in that repo.

## Stack (chosen up front)

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16** (App Router) + **TypeScript** |
| UI | **Tailwind CSS 4** + small local UI primitives (shadcn-style) |
| LLM | **Vercel AI Gateway** via AI SDK (`ai`) — follow-ups, description polish, Enhance Skill, SKILL.md assembly |
| GitHub | **Octokit** (`@octokit/rest`) — list skills, PR or direct commit |
| Deploy target | **Vercel** |
| Persistence | None for v1 — in-memory + `sessionStorage` mid-survey only (no accounts, no DB) |

Secrets (`GITHUB_TOKEN`, optional `AI_GATEWAY_API_KEY`) stay server-side. Never import `@/lib/env` from client components. On Vercel, AI Gateway authenticates via OIDC — no Anthropic/OpenAI keys required.

## What it does

1. **Landing** — Explains skills; CTA to start; searchable list of existing `skills/*/SKILL.md` from the configured repo (60s cache + Refresh).
2. **Identity & basics** — Name, role, optional email; skill title → live slug; description with char counter + optional “Improve with AI”.
3. **Hybrid questionnaire** — Fixed core sections (when / context / process / judgment / standards / mistakes / examples / resources) plus 1–3 AI follow-ups per section (skippable). File uploads with text extraction.
4. **Review → Generate** — LLM assembles `SKILL.md` (deterministic fallback if LLM fails). Raw/rendered preview; edit before save.
5. **Enhance skill** — optional LLM pass that fills gaps, sharpens triggers, and deepens judgment from the questionnaire (does not invent fake company facts).
6. **Save** — Frontmatter validation blocks invalid files. Saves to the configured team skills repo (`GITHUB_OWNER`/`GITHUB_REPO`). `GITHUB_SAVE_MODE=pr` (default) opens a PR; `direct` commits to the default branch. Download always available.

## Setup

```bash
cd skill-builder
npm install
cp .env.local.example .env.local
# Fill GitHub vars. For LLM locally: `npx vercel env pull` (OIDC) or set AI_GATEWAY_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See [`.env.local.example`](.env.local.example):

| Variable | Purpose |
|----------|---------|
| `LLM_MODEL` | AI Gateway model slug, default `anthropic/claude-sonnet-4.6` |
| `AI_GATEWAY_API_KEY` | Optional static gateway key (OIDC preferred on Vercel) |
| `GITHUB_TOKEN` | Fine-grained PAT or app token with repo contents + PR write |
| `GITHUB_OWNER` / `GITHUB_REPO` | Target team skills repo (default `Peduris` / `team-skills`) |
| `GITHUB_DEFAULT_BRANCH` | Usually `main` |
| `GITHUB_SAVE_MODE` | `pr` (default) or `direct` |
| `MAX_UPLOAD_MB` | Per-file size cap (default `10`) |

**Production target repo:** [Peduris/team-skills](https://github.com/Peduris/team-skills)

The target repo should have (or will grow) a `skills/` directory. Files land at:

```
skills/<slug>/SKILL.md
skills/<slug>/examples/...
skills/<slug>/checklists/...
skills/<slug>/assets/...
```

## GitHub save modes

- **`pr` (default)** — Creates branch `skill/<slug>-<timestamp>`, commits `SKILL.md` + resources, opens a PR titled `Add skill: <title>` (or `Update skill:` if the slug already exists). Returns the PR URL.
- **`direct`** — Commits straight to `GITHUB_DEFAULT_BRANCH`. Returns the commit URL.

If the slug already exists, the UI asks for confirmation before updating.

## SKILL.md contract (enforced)

Frontmatter validation blocks save when violated:

- **`name`**: lowercase letters, numbers, hyphens; ≤64 chars; no `anthropic` / `claude`; no spaces/tags.
- **`description`**: non-empty; ≤1024 chars; must convey what it does **and** when to use it.

Body sections: When to use / Context / The process / Judgment / Standards / Resources / Common mistakes / Examples.

Assembly system prompt + deterministic fallback live in [`src/lib/assembler.ts`](src/lib/assembler.ts).

## Non-negotiable behaviors

- **No auth / no accounts** — name + role only for attribution.
- **Every visit starts over** — landing is fresh; mid-survey refresh keeps answers via `sessionStorage` only.
- **No secrets in skills** — answers/uploads/generated markdown are scanned; save is blocked if secrets remain.
- **Graceful degradation** — LLM failure → fallback template; GitHub failure → download still works.

## Scripts

```bash
npm run dev      # local server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
npx playwright test   # smoke tests (install browsers first if needed)
```

## Deploy (Vercel)

1. Push this app and import the `skill-builder` project in Vercel (already: `team-skill-builder`).
2. Set `GITHUB_*` env vars. AI Gateway uses **OIDC automatically** on Vercel — no provider API keys.
3. Optionally set `LLM_MODEL` (default `anthropic/claude-sonnet-4.6`).
4. Enable AI Gateway for the team/project if prompted in the Vercel dashboard.
5. Deploy.

## Project layout

```
src/
  app/                  # pages + API routes
  components/builder/   # questionnaire UI
  components/           # landing + shared UI
  lib/
    assembler.ts        # LLM system prompt + fallback template
    questionnaire.ts    # fixed core sections/questions
    skill-validation.ts # frontmatter rules
    github.ts           # Octokit list/save
    llm.ts              # Anthropic calls
    secret-scan.ts      # key/token detection
    draft-store.ts      # sessionStorage draft
```

## Acceptance checklist

- [x] Fresh visit starts empty; refresh mid-survey keeps answers; no accounts / no cross-visit persistence
- [x] Generated `SKILL.md` validated; save blocked on frontmatter failure
- [x] Uploads extracted, committed under `examples/` / `checklists/` / `assets/`, referenced by relative path
- [x] `GITHUB_SAVE_MODE=pr` → PR URL; `direct` → commit URL
- [x] Landing lists skills (name + description), searchable, refreshable
- [x] Secrets never in client bundle; secret-like content flagged
- [x] LLM/GitHub failures degrade (fallback + download)
