import Link from "next/link";
import { ArrowRight, FileText, Sparkles, GitPullRequest } from "lucide-react";
import { ExistingSkills } from "@/components/ExistingSkills";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-14 sm:py-20">
      <header className="max-w-2xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <Sparkles className="size-3.5 text-brand" aria-hidden />
          Agent Skill authoring
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Teach the team&apos;s AI
          <br />
          how you actually work.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Answer a short, guided questionnaire about one thing you do well. We turn it into a
          valid <code className="font-mono text-brand-ink">SKILL.md</code> — an onboarding doc
          for an AI reader — and save it to your team&apos;s repository.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/build"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-ink active:translate-y-px"
          >
            Start building my skill
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          <span className="text-sm text-muted">No account needed. Takes ~10 minutes.</span>
        </div>

        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          <Feature icon={<FileText className="size-5" aria-hidden />} title="Live file preview">
            Watch the SKILL.md assemble itself as you answer.
          </Feature>
          <Feature icon={<Sparkles className="size-5" aria-hidden />} title="AI follow-ups">
            Tailored questions dig into what makes your work good.
          </Feature>
          <Feature icon={<GitPullRequest className="size-5" aria-hidden />} title="Saved to GitHub">
            Opens a pull request (or commits) to your skills repo.
          </Feature>
        </dl>
      </header>

      <hr className="my-14 border-border" />

      <ExistingSkills />
    </main>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="flex items-center gap-2 font-medium text-ink">
        <span className="text-brand">{icon}</span>
        {title}
      </dt>
      <dd className="mt-1.5 text-sm text-muted">{children}</dd>
    </div>
  );
}
