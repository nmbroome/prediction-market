import type { Metadata } from "next";
import { readLegalDoc } from "@/lib/legalDocs";
import MarkdownContent from "@/components/MarkdownContent";

export const metadata: Metadata = {
  title: "Terms of Service — Prophet",
  description: "The terms governing your use of the Prophet research platform.",
};

export default function TermsPage() {
  const markdown = readLegalDoc("terms");
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <MarkdownContent markdown={markdown} />
    </main>
  );
}
