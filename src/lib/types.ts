export type Role =
  | "CEO/Founder"
  | "Copywriter"
  | "Designer"
  | "Software Engineer"
  | "Marketer"
  | "SEO"
  | "Product"
  | "Support"
  | "Other";

export const ROLES: Role[] = [
  "CEO/Founder",
  "Copywriter",
  "Designer",
  "Software Engineer",
  "Marketer",
  "SEO",
  "Product",
  "Support",
  "Other",
];

export interface Identity {
  name: string;
  role: Role | "";
  roleOther?: string;
  email?: string;
}

export interface SkillBasics {
  title: string;
  slug: string;
  description: string;
}

export type QuestionType =
  | "short"
  | "long"
  | "single"
  | "multi"
  | "process-steps";

export interface Question {
  id: string;
  sectionId: string;
  type: QuestionType;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  options?: string[];
  /** Maps this answer onto a SKILL.md body section key. */
  mapsTo: BodySectionKey;
}

export interface Section {
  id: string;
  title: string;
  blurb: string;
  /** Whether this section invites file uploads. */
  uploads?: UploadCategory[];
}

export type BodySectionKey =
  | "whenToUse"
  | "context"
  | "process"
  | "judgment"
  | "standards"
  | "resources"
  | "commonMistakes"
  | "examples";

export interface ProcessStep {
  what: string;
  why: string;
}

export type AnswerValue = string | string[] | ProcessStep[];

export type Answers = Record<string, AnswerValue>;

export type UploadCategory = "examples" | "checklists" | "assets";

export interface UploadedResource {
  id: string;
  name: string;
  category: UploadCategory;
  sizeBytes: number;
  mime: string;
  /** Extracted text (for text-bearing files). Empty for binary assets. */
  text: string;
  /** base64 content, used to commit the file to GitHub. */
  contentBase64: string;
  /** Path within the skill folder, e.g. examples/great-brief.md */
  relativePath: string;
  secretsFound?: boolean;
}

export interface FollowUp {
  id: string;
  sectionId: string;
  question: string;
  answer?: string;
}

export interface ValidationIssue {
  field: "name" | "description" | "body";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface SkillDraft {
  identity: Identity;
  basics: SkillBasics;
  answers: Answers;
  followUps: FollowUp[];
  resources: UploadedResource[];
}

export interface ExistingSkill {
  slug: string;
  title: string;
  description: string;
  author?: string;
  role?: string;
  htmlUrl: string;
  path: string;
}

export type SaveMode = "pr" | "direct";

export interface SaveResult {
  mode: SaveMode;
  path: string;
  url: string;
  isUpdate: boolean;
  prNumber?: number;
}
