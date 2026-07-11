import fs from "node:fs";
import path from "node:path";

export type LegalSlug = "terms" | "privacy";

// Read a legal document's markdown source. Runs at build time (the /terms and
// /privacy pages are statically rendered), so the file is read from the repo
// during `next build` and baked into the static HTML.
export function readLegalDoc(slug: LegalSlug): string {
  return fs.readFileSync(
    path.join(process.cwd(), "src", "content", `${slug}.md`),
    "utf8"
  );
}
