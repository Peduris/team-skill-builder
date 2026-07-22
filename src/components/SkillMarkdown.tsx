"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/** Renders untrusted skill markdown safely (sanitized, no raw HTML/scripts). */
export function SkillMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose-skill">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
