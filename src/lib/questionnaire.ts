import type { Question, Section, UploadCategory } from "./types";

/**
 * Fixed core of the hybrid questionnaire. AI follow-ups are interleaved after
 * relevant sections at runtime. Each question maps onto a SKILL.md body section.
 */
export const SECTIONS: Section[] = [
  {
    id: "when",
    title: "When to use this skill",
    blurb:
      "Pin down the exact situations where an assistant should reach for this — and where it shouldn't.",
  },
  {
    id: "context",
    title: "Context the assistant needs first",
    blurb:
      "The background you carry in your head that a brand-new hire wouldn't have.",
  },
  {
    id: "process",
    title: "Your process, step by step",
    blurb: "How you actually do this task, start to finish. This is the heart of the skill.",
  },
  {
    id: "judgment",
    title: "Judgment calls & principles",
    blurb: "How you decide when it isn't clear-cut.",
  },
  {
    id: "standards",
    title: "What good looks like",
    blurb: "Your quality bar and definition of done.",
  },
  {
    id: "mistakes",
    title: "Common mistakes",
    blurb: "Traps you've learned to avoid.",
  },
  {
    id: "examples",
    title: "Examples",
    blurb: "One or two concrete input to output examples of doing this well.",
    uploads: ["examples"],
  },
  {
    id: "resources",
    title: "Resources & tools",
    blurb: "The tools, docs, templates, and links you rely on. Upload the real ones.",
    uploads: ["checklists", "assets"],
  },
];

export const CORE_QUESTIONS: Question[] = [
  {
    id: "when_covers",
    sectionId: "when",
    type: "long",
    label: "What task does this skill cover?",
    help: "Describe the job in one or two sentences, the way you'd tell a new teammate.",
    placeholder: "e.g. Writing landing page copy that converts for our product launches.",
    required: true,
    mapsTo: "whenToUse",
  },
  {
    id: "when_triggers",
    sectionId: "when",
    type: "long",
    label: "What situations, requests, or phrases should trigger it?",
    help: "List the concrete cues. Be a little pushy — these tend to under-trigger.",
    placeholder: "e.g. 'write a hero section', 'we need landing copy', new campaign briefs...",
    required: true,
    mapsTo: "whenToUse",
  },
  {
    id: "when_not",
    sectionId: "when",
    type: "long",
    label: "When should it NOT be used?",
    help: "Where would reaching for this be the wrong call?",
    placeholder: "e.g. Long-form blog posts, legal copy, in-product microcopy.",
    mapsTo: "whenToUse",
  },
  {
    id: "context_background",
    sectionId: "context",
    type: "long",
    label: "What background knowledge does the assistant need first?",
    help: "Company/product context, audience, constraints, off-limits topics.",
    placeholder: "e.g. Our audience is technical founders; never promise specific ROI numbers.",
    required: true,
    mapsTo: "context",
  },
  {
    id: "process_steps",
    sectionId: "process",
    type: "process-steps",
    label: "Walk through your process, one step at a time.",
    help: "For each step, capture WHAT you do and WHY it matters. Add as many as you need.",
    required: true,
    mapsTo: "process",
  },
  {
    id: "judgment_heuristics",
    sectionId: "judgment",
    type: "long",
    label: "What rules of thumb do you use when it's ambiguous?",
    help: "The heuristics that separate a pro from a beginner.",
    placeholder: "e.g. If the benefit isn't obvious in 5 seconds, lead with the outcome, not the feature.",
    required: true,
    mapsTo: "judgment",
  },
  {
    id: "standards_bar",
    sectionId: "standards",
    type: "long",
    label: "What is your quality bar / definition of done?",
    help: "Length, tone, structure, must-haves, must-avoids.",
    placeholder: "e.g. One clear CTA, under 120 words above the fold, active voice, no jargon.",
    required: true,
    mapsTo: "standards",
  },
  {
    id: "mistakes_traps",
    sectionId: "mistakes",
    type: "long",
    label: "What common mistakes should the assistant avoid?",
    placeholder: "e.g. Burying the value proposition, writing for everyone, feature-dumping.",
    mapsTo: "commonMistakes",
  },
  {
    id: "examples_text",
    sectionId: "examples",
    type: "long",
    label: "Give one or two input to output examples.",
    help: "A concrete before/after or brief and the great result. You can also upload example files below.",
    placeholder: "Input: brief for X. Output: the hero copy you'd ship...",
    mapsTo: "examples",
  },
  {
    id: "resources_list",
    sectionId: "resources",
    type: "long",
    label: "Which tools, docs, templates, and links do you use?",
    help: "Name them. Upload the real checklists/templates/guides below so they ship with the skill.",
    placeholder: "e.g. Our brand voice guide, the QA checklist, Figma component library...",
    mapsTo: "resources",
  },
];

export function questionsForSection(sectionId: string): Question[] {
  return CORE_QUESTIONS.filter((q) => q.sectionId === sectionId);
}

export function uploadCategoriesForSection(sectionId: string): UploadCategory[] {
  return SECTIONS.find((s) => s.id === sectionId)?.uploads ?? [];
}
