/**
 * sourceGraph — the ONE reader of this repo's own source text.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * Two Sentinels ask structurally identical questions — "does anything actually
 * reach this?" — one about API routes, one about components. Both need to walk
 * `src`, both need to ignore tests, and both need to strip comments before
 * matching. Copying that into each would put two private opinions about what
 * counts as source into two files, and the first re-spelling would make one
 * guard quietly weaker than the other with nothing pointing at the difference.
 * That is the exact failure class these guards were written to catch.
 *
 * This module is deliberately NOT clever. It reads files and returns strings.
 * The judgement about what an absent reference MEANS belongs to each guard.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import { stripComments } from "@/lib/sourceScan";

export const SRC_ROOT = resolve(process.cwd(), "src");
export const API_ROOT = join(SRC_ROOT, "app", "api");

/** Every file under a directory, recursively. */
export function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * WHY THE COMMENT STRIPPER IS NOT DEFINED HERE.
 *
 * Stripping comments before matching is MEASURED, not theorised. The first
 * version of the API consumer guard did not strip them, and when a page's fetch
 * was deliberately typo'd to prove the guard bites, IT STAYED GREEN — because
 * that page's own explanatory JSX comment and a selector's module header both
 * spelled the endpoint path. A guard that accepts PROSE as evidence of wiring
 * is the defect it was written to catch, one level in: a clean report about
 * something nobody connected.
 *
 * That lesson was already learned once, and `src/lib/sourceScan.ts` was written
 * as its single owner — its header ends "A fourth scanner should import it
 * too." The first draft of THIS module retyped a weaker copy instead, which is
 * precisely the duplication sourceScan exists to prevent: two private opinions
 * about what counts as a comment, and the next repair silently reaching only
 * one of them. The owner's stripper is also strictly better — it spares `://`
 * inside a live URL and removes a trailing `// note` after real code, neither
 * of which the retyped version did.
 *
 * Re-exported rather than merely imported so a reader who arrives at this
 * module — the repo's source-text reader — can see the stripper is part of the
 * contract without being told to look somewhere else for it.
 */
export { stripComments };

export interface SourceFile {
  /** Path relative to `src`, e.g. "app/readiness/page.tsx". */
  readonly file: string;
  /** File text with comments removed. */
  readonly text: string;
}

/**
 * Every `.ts`/`.tsx` file under `src`, comments stripped, EXCLUDING tests.
 *
 * Tests are excluded because a thing referenced only by its own test is
 * precisely the state these guards reject. Counting the test as a consumer
 * would make every orphan look wired and turn the whole measurement into
 * decoration.
 *
 * `exclude` drops additional prefixes (relative to `src`) — used to keep a
 * subject out of its own caller set.
 */
export function sourceFiles(exclude: readonly string[] = []): SourceFile[] {
  return walk(SRC_ROOT)
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !/\.(test|spec)\.tsx?$/.test(f))
    .map((f) => f.slice(SRC_ROOT.length + 1))
    .filter((rel) => !exclude.some((prefix) => rel === prefix || rel.startsWith(prefix)))
    .map((rel) => ({ file: rel, text: stripComments(readFileSync(join(SRC_ROOT, rel), "utf8")) }));
}

/** Every API route's public path, e.g. "/api/broker/certification". */
export function apiRoutePaths(): string[] {
  return walk(API_ROOT)
    .filter((f) => f.endsWith(`${sep}route.ts`))
    .map((f) => f.slice(SRC_ROOT.length, -`${sep}route.ts`.length).split(sep).join("/"))
    .map((p) => p.replace(/^\/app/, ""))
    .sort();
}
