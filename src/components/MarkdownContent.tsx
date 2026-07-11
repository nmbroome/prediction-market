import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Server component: renders a markdown string with dark-theme prose styling.
// Used by the /terms and /privacy pages, which read their source from
// src/content/*.md so the legal documents live under version control.
export default function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <article
      className="prose prose-invert max-w-none
        prose-headings:text-white prose-h1:text-3xl prose-h1:mb-2
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white prose-hr:border-gray-800
        prose-li:text-gray-300 prose-p:text-gray-300"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  );
}
