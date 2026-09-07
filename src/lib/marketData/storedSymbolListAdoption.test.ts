/**
 * ONE READER FOR THE STORED WATCHLIST — enforced, not merely intended.
 *
 * `wm_watchlists` had THREE readers and they disagreed:
 *
 *   WatchlistPanel init    Array.from(new Set(p[k]))       - no entry check
 *                                                            -> ErrorBoundary
 *   WatchlistPanel import  String(s).toUpperCase()          - INVENTS symbols
 *   WatchlistGrid          Array.isArray(syms) ? syms : []  - container only
 *
 * Each was locally reasonable and collectively they meant the same bytes
 * produced three different lists. The measured cost was the whole watchlist
 * panel being destroyed by one junk entry — see storedSymbolList.ts.
 *
 * This Sentinel is source-text, which is a blunt instrument, so it asserts the
 * BEHAVIOUR-BEARING facts only: every file that reads the key routes through
 * the one owner, and the two specific rejected spellings do not come back.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");

const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

/**
 * Source with comments stripped.
 *
 * The rejected spellings below are NAMED in the comments that explain why they
 * were rejected — so a raw text match flags the very documentation that keeps
 * the fix understandable, and the cheapest way to go green would be to delete
 * the explanation. Match code only.
 */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Files that read the stored watchlist and must therefore use the one reader. */
const WATCHLIST_READERS = [
  "components/chart/WatchlistPanel.tsx",
  "components/chart/WatchlistGrid.tsx",
] as const;

describe("stored watchlist — one reader, no second copy of the rule", () => {
  it.each(WATCHLIST_READERS)("%s routes through storedSymbolList", (rel) => {
    const src = read(rel);
    expect(src, `${rel} reads wm_watchlists`).toContain("wm_watchlists");
    expect(src, `${rel} must import the one reader`).toContain(
      'from "@/lib/marketData/storedSymbolList"',
    );
    expect(src, `${rel} must actually call it`).toContain("readSymbolList(");
  });

  it("no reader resurrects the de-dupe that skipped the entry check", () => {
    // `Array.from(new Set(p[k]))` de-duped without asking whether an entry was
    // a symbol. That is the exact line that reached sym.toUpperCase().
    for (const rel of WATCHLIST_READERS) {
      expect(code(rel), rel).not.toMatch(/Array\.from\(\s*new Set\(/);
    }
  });

  it("no reader resurrects String(s) coercion, which fabricates symbols", () => {
    // `String(s).toUpperCase()` never rejects — it converts 42 into "42" and
    // {} into "[OBJECT OBJECT]". §14.1: an unreadable value must not be
    // resolved into a confident one.
    for (const rel of WATCHLIST_READERS) {
      expect(code(rel), rel).not.toMatch(/String\(\s*\w+\s*\)\.toUpperCase\(\)/);
    }
  });

  it("the tape's reader is the SAME owner, not a parallel implementation", () => {
    // tapeSymbols.ts is where this logic was proven; storedSymbolList.ts is
    // that logic promoted. If tapeSymbols ever re-grows its own parse loop,
    // the two surfaces can drift apart again.
    const tape = read("lib/marketData/tapeSymbols.ts");
    expect(tape).toContain('from "./storedSymbolList"');
    expect(tape, "tapeSymbols must not re-implement JSON parsing").not.toContain("JSON.parse");
  });
});
