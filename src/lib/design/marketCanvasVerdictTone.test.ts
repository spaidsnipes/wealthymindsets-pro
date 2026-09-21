/**
 * SENTINEL + truth-lock for the Market Canvas verdict tone.
 *
 * ── The defect this file exists to prevent ──────────────────────────────────
 *
 * On 2026-09-21 three surfaces each carried a private copy of the verdict →
 * colour table: MarketCanvasPanel, CanvasSummaryPill, CanvasBadgeMini. All
 * three agreed exactly, which is why nobody had noticed. A duplicated fact that
 * currently agrees is not a healthy duplicate — it is a defect with a delay
 * fuse, because the agreement is maintained by nothing.
 *
 * The consolidation is only worth the commit if a FOURTH table cannot grow.
 * Deleting three tables and trusting everyone to keep importing the owner is
 * the same convention that failed the first time, just newer. So the scan below
 * is the actual deliverable; the refactor was the easy half.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { WM } from "./wmTokens";
import { marketCanvasVerdictColor, marketCanvasVerdictTone } from "./marketCanvasVerdictTone";

const SRC = join(process.cwd(), "src");
const OWNER = join(SRC, "lib", "design", "marketCanvasVerdictTone.ts");

/** Every .ts/.tsx file under src/, excluding tests (a test may quote a value). */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      sourceFiles(p, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe("the Market Canvas verdict tone has exactly one owner", () => {
  it("THE SHIPPED PIXELS ARE UNCHANGED by the consolidation", () => {
    // The literal values the three tables carried before the move. Written out
    // rather than derived, because the whole point of this assertion is to be a
    // second, independent record of what shipped — deriving it from the module
    // under test would make it agree with any future edit, including a wrong
    // one. THIS is the block to update, deliberately, if a tone ever changes.
    expect(marketCanvasVerdictColor("ACTION")).toBe("#d4af37");
    expect(marketCanvasVerdictColor("CAUTION")).toBe("#c9a55c");
    expect(marketCanvasVerdictColor("WAIT")).toBe("#c9a55c");
    expect(marketCanvasVerdictColor("NO TRADE")).toBe("#e07b5c");
    expect(marketCanvasVerdictColor("UNKNOWN")).toBe("#8a8271");

    expect(marketCanvasVerdictTone("ACTION")).toEqual({
      fg: "#d4af37",
      border: "rgba(212,175,55,0.55)",
      bg: "rgba(212,175,55,0.10)",
    });
    expect(marketCanvasVerdictTone("UNKNOWN")).toEqual({
      fg: "#8a8271",
      border: "rgba(138,130,113,0.30)",
      bg: "rgba(138,130,113,0.04)",
    });
  });

  it("the tones that HAVE a token are spelled as the token, not as a hex", () => {
    // Three of the five are WM palette colours. If they were re-typed as hex
    // here, a palette refresh would move the rest of the product and leave the
    // verdict behind — the exact drift the token file was created to stop.
    expect(marketCanvasVerdictColor("ACTION")).toBe(WM.gold.hero);
    expect(marketCanvasVerdictColor("CAUTION")).toBe(WM.gold.mark);
    expect(marketCanvasVerdictColor("WAIT")).toBe(WM.gold.mark);
    expect(marketCanvasVerdictColor("UNKNOWN")).toBe(WM.text.muted);

    // And the one that genuinely has no token is NOT quietly the warn colour.
    // If someone later decides it should be, that is a design decision and it
    // should arrive as a failing assertion here, not as a silent repaint.
    expect(marketCanvasVerdictColor("NO TRADE")).not.toBe(WM.state.warn);
  });

  it("WAIT and CAUTION share a foreground, so the WORD must carry the meaning", () => {
    // Colour alone cannot distinguish them. Recorded as an invariant so nobody
    // "fixes" a surface by relying on the tone to tell the two apart.
    expect(marketCanvasVerdictColor("WAIT")).toBe(marketCanvasVerdictColor("CAUTION"));
  });

  it("SENTINEL: no other source file declares the verdict palette", () => {
    // WHAT THIS SCAN LOOKS FOR, and why it is not the obvious thing.
    //
    // The first draft of this Sentinel used the raw colour #e07b5c as the
    // fingerprint, on the assumption that the NO TRADE terracotta was unique to
    // the verdict. It failed against eleven files on its first run. They are
    // not verdict tables: #e07b5c is the product's de-facto WARN colour
    // (SceneAdmissionPanel.WARN, DecisionWhyPanel.HARD_RULE, FailureStateChip
    // .BLOCKED, OneStoryStrip.OBJECTION, CommandContextRibbon.warn, …). A guard
    // that fired on all of those would have been noise from birth, and the
    // fastest way to make a team ignore a Sentinel is to have it cry wolf once.
    //
    // The real fingerprint of the DEFECT is not the colour — it is the SHAPE:
    // the verdict word used as a lookup key into a colour. Nothing legitimately
    // does that except the owner. `"NO TRADE": true` in selectOneNextThing and
    // `value: "NO TRADE"` in the permission compiler are untouched, because
    // neither line carries a colour.
    const VERDICT_KEY_TO_COLOUR = /"NO TRADE"\s*:\s*[^,\n]*(#[0-9a-fA-F]{3,8}|rgba?\()/;

    const offenders = sourceFiles(SRC)
      .filter((p) => p !== OWNER)
      .filter((p) => VERDICT_KEY_TO_COLOUR.test(stripComments(readFileSync(p, "utf8"))))
      .map((p) => p.slice(SRC.length + 1));

    expect(
      offenders,
      "these files map the canvas verdict to a colour themselves instead of " +
        "reading marketCanvasVerdictTone(). Three copies of this table already " +
        "agreed with each other by luck once; import the owner instead.",
    ).toEqual([]);
  });

  it("SENTINEL: the three canvas surfaces read the owner", () => {
    // The scan above proves nobody re-declares the palette. It cannot prove the
    // surfaces still USE it — a component that dropped the colour entirely, or
    // swapped in some unrelated grey, would pass a scan for an absent literal
    // while quietly un-wiring the fact. Named consumers, named breadcrumb.
    const CONSUMERS = [
      "components/experience/MarketCanvasPanel.tsx",
      "components/experience/CanvasSummaryPill.tsx",
      "components/experience/CanvasBadgeMini.tsx",
    ];
    for (const rel of CONSUMERS) {
      const code = stripComments(readFileSync(join(SRC, rel), "utf8"));
      expect(code, `${rel} must import the verdict tone owner`).toContain(
        "@/lib/design/marketCanvasVerdictTone",
      );
      expect(code, `${rel} must call the owner, not just import it`).toMatch(
        /marketCanvasVerdictTone\(|marketCanvasVerdictColor\(/,
      );
    }
  });

  it("THE SENTINEL IS NOT VACUOUS: it reads real files and can see a violation", () => {
    // A scan that silently found zero files would report a permanently clean
    // repository. Prove the file walk and the stripper both work.
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain(OWNER);

    // The regex must actually MATCH the shape it claims to hunt. Both the
    // string form the pill/panel used and the object form the badge used.
    const RE = /"NO TRADE"\s*:\s*[^,\n]*(#[0-9a-fA-F]{3,8}|rgba?\()/;
    expect(RE.test('  "NO TRADE": "#e07b5c",')).toBe(true);
    expect(RE.test('  "NO TRADE":  { fg: "#e07b5c", border: "rgba(224,123,92,0.45)" },')).toBe(true);

    // …and must NOT match the two legitimate non-colour uses that exist today,
    // or the Sentinel would be unrunnable without deleting real code.
    expect(RE.test('  "NO TRADE": true,')).toBe(false);
    expect(RE.test('return { value: "NO TRADE", detail: "hard rule engaged" };')).toBe(false);

    // and the stripper removes prose while preserving code (positive control)
    const sample = stripComments('/* "NO TRADE": "#e07b5c" in prose */\nconst x = "#e07b5c";');
    expect(sample).not.toContain("in prose");
    expect(sample).toContain('const x = "#e07b5c";');
  });
});
