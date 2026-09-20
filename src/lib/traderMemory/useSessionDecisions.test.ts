/**
 * useSessionDecisions — the trader's own record, merged in ONE place.
 *
 * These lock the precedence rule AND the fact that it stays extracted. The
 * merge was found written verbatim in two files; the guard at the bottom is
 * the thing that stops it becoming three again the next time a surface needs
 * to read "what have I decided".
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { mergeSessionDecisions } from "./useSessionDecisions";
import type { DecisionMemorySnapshot } from "./viewModels/selectProcessLandscape";

function snap(decisionId: string, over: Partial<DecisionMemorySnapshot> = {}) {
  return { decisionId, ...over } as DecisionMemorySnapshot;
}

describe("mergeSessionDecisions", () => {
  it("keeps every store decision, in store order", () => {
    const out = mergeSessionDecisions([snap("a"), snap("b")], []);
    expect(out.map((d) => d.decisionId)).toEqual(["a", "b"]);
  });

  it("appends journal decisions the store does not already hold", () => {
    const out = mergeSessionDecisions([snap("a")], [snap("b"), snap("c")]);
    expect(out.map((d) => d.decisionId)).toEqual(["a", "b", "c"]);
  });

  /**
   * THE RULE THAT MATTERS. The store holds the live, in-session record; the
   * journal holds what was written down. When both describe one decision the
   * live one is the NEWER statement, so a journal copy must not be appended
   * beside it — that would render the same decision twice, and every count
   * built on the merge ("3 decisions today") would be inflated.
   */
  it("drops the journal copy when the store already carries that decisionId", () => {
    const out = mergeSessionDecisions(
      [snap("a", { symbol: "LIVE" } as Partial<DecisionMemorySnapshot>)],
      [snap("a", { symbol: "WRITTEN" } as Partial<DecisionMemorySnapshot>), snap("b")],
    );
    expect(out.map((d) => d.decisionId)).toEqual(["a", "b"]);
    expect((out[0] as { symbol?: string }).symbol).toBe("LIVE");
  });

  it("is empty when both sides are", () => {
    expect(mergeSessionDecisions([], [])).toEqual([]);
  });

  /**
   * A THIRD COPY IS THE DEFECT, NOT THE MERGE.
   *
   * `useMarketCanvasVM.ts` and `/command-deck/page.tsx` each contained this
   * merge, hand-written. Two rooms answering "what does my own record say"
   * from two independently-maintained merges is the second semantic brain the
   * workspace canon bans. This scans for the shape — a `decisionId` Set used
   * to filter journal snapshots — outside the one file that owns it.
   */
  it("is the only place the merge is written", () => {
    const root = resolve(process.cwd(), "src");
    const offenders: string[] = [];
    const scanned: string[] = [];

    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.tsx?$/.test(name)) continue;
        if (path.endsWith("useSessionDecisions.ts")) continue;
        if (path.endsWith("useSessionDecisions.test.ts")) continue;
        const src = readFileSync(path, "utf8");
        scanned.push(path);
        if (
          /new Set\(\s*storeDecisions\.map/.test(src) ||
          /journalDecisions\.filter\(\s*\(d\)\s*=>\s*!ids\.has/.test(src)
        ) {
          offenders.push(path.slice(root.length + 1));
        }
      }
    };
    walk(root);

    // PROVE THE SCAN FOUND MATERIAL FIRST. A walk that silently stopped
    // returning files would report a clean bill of health forever — the exact
    // failure mode sentinelsProveTheyScanned.test.ts exists to police.
    expect(
      scanned.length,
      "this scan found almost no source files — the walk has drifted",
    ).toBeGreaterThan(200);

    expect(
      offenders,
      "re-inlining the store/journal merge forks the trader's record — " +
        "read it from useSessionDecisions instead",
    ).toEqual([]);
  });
});
