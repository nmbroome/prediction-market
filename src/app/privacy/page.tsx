import type { Metadata } from "next";
import { readLegalDoc } from "@/lib/legalDocs";
import MarkdownContent from "@/components/MarkdownContent";

export const metadata: Metadata = {
  title: "Privacy Policy — Prophet",
  description: "What Prophet collects, how it is used, and what becomes public research data.",
};

export default function PrivacyPage() {
  const markdown = readLegalDoc("privacy");
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <MarkdownContent markdown={markdown} />
    </main>
  );
}
