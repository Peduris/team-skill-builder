import "server-only";
import { Octokit } from "@octokit/rest";
import { env, githubConfigured } from "./env";
import { parseFrontmatter } from "./skill-validation";
import type { ExistingSkill, SaveMode, SaveResult, UploadedResource } from "./types";

export class GitHubConfigError extends Error {}
export class GitHubApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function octokit(): Octokit {
  if (!githubConfigured()) {
    throw new GitHubConfigError(
      "GitHub is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.",
    );
  }
  return new Octokit({ auth: env.github.token });
}

function friendlyError(err: unknown): never {
  const e = err as { status?: number; message?: string };
  const status = e?.status;
  if (status === 401) throw new GitHubApiError("GitHub token is invalid or expired.", 401);
  if (status === 404)
    throw new GitHubApiError(
      `Repository ${env.github.owner}/${env.github.repo} not found (or token lacks access).`,
      404,
    );
  if (status === 403)
    throw new GitHubApiError("GitHub rate limit or permission error. Try again shortly.", 403);
  throw new GitHubApiError(e?.message || "GitHub request failed.", status);
}

const SKILLS_DIR = "skills";

/** List every skill in the repo under skills/<slug>/SKILL.md. */
export async function listSkills(): Promise<ExistingSkill[]> {
  const gh = octokit();
  const { owner, repo } = env.github;
  let dirs: { name: string }[] = [];
  try {
    const res = await gh.repos.getContent({ owner, repo, path: SKILLS_DIR });
    if (Array.isArray(res.data)) {
      dirs = res.data.filter((e) => e.type === "dir").map((e) => ({ name: e.name }));
    }
  } catch (err) {
    if ((err as { status?: number }).status === 404) return []; // no skills/ yet
    friendlyError(err);
  }

  const skills = await Promise.all(
    dirs.map(async (d): Promise<ExistingSkill | null> => {
      try {
        const path = `${SKILLS_DIR}/${d.name}/SKILL.md`;
        const res = await gh.repos.getContent({ owner, repo, path });
        if (Array.isArray(res.data) || res.data.type !== "file") return null;
        const content = Buffer.from(res.data.content, "base64").toString("utf8");
        const fm = parseFrontmatter(content);
        const authorMatch = content.match(/_Authored by ([^,_]+)(?:,\s*([^._]+))?\._/);
        return {
          slug: fm.name || d.name,
          title: fm.title || d.name,
          description: fm.description,
          author: authorMatch?.[1]?.trim(),
          role: authorMatch?.[2]?.trim(),
          htmlUrl: res.data.html_url ?? "",
          path,
        } satisfies ExistingSkill;
      } catch {
        return null;
      }
    }),
  );

  return skills.filter((s): s is ExistingSkill => s !== null).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

/** Does a skill with this slug already exist? */
export async function skillExists(slug: string): Promise<boolean> {
  const gh = octokit();
  const { owner, repo } = env.github;
  try {
    await gh.repos.getContent({
      owner,
      repo,
      path: `${SKILLS_DIR}/${slug}/SKILL.md`,
    });
    return true;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return false;
    friendlyError(err);
  }
}

async function getFileSha(
  gh: Octokit,
  path: string,
  ref: string,
): Promise<string | undefined> {
  try {
    const res = await gh.repos.getContent({
      owner: env.github.owner,
      repo: env.github.repo,
      path,
      ref,
    });
    if (!Array.isArray(res.data) && res.data.type === "file") return res.data.sha;
  } catch {
    /* not found */
  }
  return undefined;
}

export interface SaveParams {
  slug: string;
  title: string;
  markdown: string;
  resources: UploadedResource[];
  author: string;
  role: string;
  description: string;
  mode?: SaveMode;
}

/** Commit the SKILL.md (+ bundled resources) to the repo, via PR or direct commit. */
export async function saveSkill(params: SaveParams): Promise<SaveResult> {
  const gh = octokit();
  const { owner, repo, defaultBranch } = env.github;
  const mode = params.mode ?? env.github.saveMode;
  const isUpdate = await skillExists(params.slug);

  try {
    let targetBranch = defaultBranch;
    if (mode === "pr") {
      const baseRef = await gh.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });
      targetBranch = `skill/${params.slug}-${Date.now()}`;
      await gh.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${targetBranch}`,
        sha: baseRef.data.object.sha,
      });
    }

    const files: { path: string; base64: string }[] = [
      {
        path: `${SKILLS_DIR}/${params.slug}/SKILL.md`,
        base64: Buffer.from(params.markdown, "utf8").toString("base64"),
      },
      ...params.resources.map((r) => ({
        path: `${SKILLS_DIR}/${params.slug}/${r.relativePath}`,
        base64: r.contentBase64,
      })),
    ];

    let lastCommitUrl = "";
    for (const file of files) {
      const sha = await getFileSha(gh, file.path, targetBranch);
      const res = await gh.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file.path,
        message: `${isUpdate ? "Update" : "Add"} skill: ${params.title} (${file.path.split("/").pop()})`,
        content: file.base64,
        branch: targetBranch,
        sha,
        committer: { name: params.author || "Team Skill Builder", email: "skills@localhost" },
        author: { name: params.author || "Team Skill Builder", email: "skills@localhost" },
      });
      lastCommitUrl = res.data.commit.html_url ?? lastCommitUrl;
    }

    if (mode === "pr") {
      const pr = await gh.pulls.create({
        owner,
        repo,
        head: targetBranch,
        base: defaultBranch,
        title: `${isUpdate ? "Update" : "Add"} skill: ${params.title}`,
        body: prBody(params, isUpdate),
      });
      return {
        mode,
        path: files[0].path,
        url: pr.data.html_url,
        isUpdate,
        prNumber: pr.data.number,
      };
    }

    return { mode, path: files[0].path, url: lastCommitUrl, isUpdate };
  } catch (err) {
    if (err instanceof GitHubApiError || err instanceof GitHubConfigError) throw err;
    friendlyError(err);
  }
}

function prBody(params: SaveParams, isUpdate: boolean): string {
  return [
    `**${isUpdate ? "Updates" : "Adds"} skill:** \`${params.slug}\``,
    "",
    `**Author:** ${params.author || "unknown"}${params.role ? ` (${params.role})` : ""}`,
    "",
    `**Description:** ${params.description}`,
    params.resources.length
      ? `\n**Bundled resources:**\n${params.resources.map((r) => `- \`${r.relativePath}\``).join("\n")}`
      : "",
    "",
    "_Generated by Team Skill Builder._",
  ].join("\n");
}
