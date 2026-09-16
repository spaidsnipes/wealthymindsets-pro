import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { selectSetupPerformance } from "./selectSetupPerformance";

/**
 * SETUP PERFORMANCE — three laws this repo already owned, in one unguarded row.
 *
 * Found by census, not by reading one file: the H1 shape was swept across the
 * whole tree after the masthead defect proved that a Sentinel naming a PATH
 * goes green and blind the moment a second surface exists.
 *
 * These tests drive the OWNER. The row's markup cannot satisfy them with
 * punctuation, and a later rewrite of the row cannot lose them.
 */

const be = (setup: string, pnl: unknown) => ({ setup, result: "be", pnl });
const win = (setup: string, pnl: unknown) => ({ setup, result: "win", pnl });
const loss = (setup: string, pnl: unknown) => ({ setup, result: "loss", pnl });

describe("a ratio with no denominator is UNDEFINED, not zero percent", () => {
  it("THE DEFECT: a setup with nothing decided prints no win rate", () => {
    const [row] = selectSetupPerformance([be("ORB", 0), be("ORB", 0)]);
    expect(row.winRatePct).toBeNull();
    expect(row.winRateLabel).toBe("—");
    expect(row.winRateLabel).not.toBe("0%");
    expect(row.reason).toMatch(/UNDEFINED, not zero percent/);
  });

  it("OVER-CORRECTION: a setup that HAS been decided still reports its rate", () => {
    const [row] = selectSetupPerformance([
      win("ORB", 100), win("ORB", 100), win("ORB", 100), loss("ORB", -50),
    ]);
    expect(row.winRatePct).toBe(75);
    expect(row.winRateLabel).toBe("75%");
  });

  it("the denominator is the DECIDED count, not the entry count", () => {
    // A breakeven entry is filed, counted, and shown — but it decides nothing,
    // so it may not dilute a win rate it was never part of.
    const [row] = selectSetupPerformance([win("ORB", 100), loss("ORB", -100), be("ORB", 0)]);
    expect(row.entries).toBe(3);
    expect(row.winRatePct).toBe(50);
  });
});

describe("zero is not a gain", () => {
  it("THE DEFECT: a setup that nets exactly flat takes no win tint", () => {
    const [row] = selectSetupPerformance([win("ORB", 100), loss("ORB", -100)]);
    expect(row.tone).not.toBe("WIN");
    expect(row.tone).toBe("NEUTRAL");
    // THE OVER-CORRECTION, pre-empted: the figure is measured and it stays.
    expect(row.pnlLabel).toBe("+$0");
    expect(row.pnlLabel).not.toBe("—");
    expect(row.reason).toMatch(/no win tint/i);
  });

  it("a real result earns its tint in BOTH directions", () => {
    const [up] = selectSetupPerformance([win("ORB", 250)]);
    const [down] = selectSetupPerformance([loss("ORB", -250)]);
    expect(up.tone).toBe("WIN");
    expect(up.pnlLabel).toBe("+$250");
    expect(down.tone).toBe("LOSS");
    expect(down.pnlLabel).toBe("-$250");
  });
});

describe("a sum over values WM cannot read is not a dollar figure", () => {
  it("THE DEFECT: `pnl: null` is not silently counted as a flat $0", () => {
    // JSON.stringify(NaN) writes null, so this is the ROUND-TRIP shape and
    // therefore the common one. The old `+=` scored it as a fabricated zero.
    const [row] = selectSetupPerformance([win("ORB", 100), win("ORB", null)]);
    expect(row.pnl.status).toBe("PARTIAL");
    expect(row.pnl.counted).toBe(1);
    expect(row.pnl.unreadable).toBe(1);
    expect(row.pnl.total).toBe(100);
    expect(row.reason).toMatch(/covers 1 of 2 records/);
  });

  it("THE DEFECT: a STRING does not concatenate into a fabricated total", () => {
    // 100 + "250.00" is "100250.00" — off by three orders of magnitude and
    // rendered with total confidence.
    const [row] = selectSetupPerformance([win("ORB", 100), win("ORB", "250.00")]);
    expect(row.pnl.total).toBe(100);
    expect(row.pnlLabel).toBe("+$100");
    expect(row.pnlLabel).not.toContain("100250");
  });

  it("THE DEFECT: a missing pnl does not poison the row to NaN and paint it RED", () => {
    const [row] = selectSetupPerformance([win("ORB", 100), { setup: "ORB", result: "win" }]);
    expect(row.pnlLabel).not.toMatch(/NaN/);
    expect(row.tone).toBe("WIN");
  });

  it("a setup where NOTHING is readable says UNKNOWN and takes the ALERT tone", () => {
    const [row] = selectSetupPerformance([win("ORB", null), loss("ORB", "x")]);
    expect(row.pnl.total).toBeNull();
    expect(row.pnlLabel).toBe("UNKNOWN");
    expect(row.pnlLabel).not.toContain("0");
    expect(row.tone).toBe("ALERT");
    // The win rate is still knowable — the two questions are independent.
    expect(row.winRatePct).toBe(50);
  });
});

describe("the row is grouped, ordered and explained", () => {
  it("groups by setup name and keeps every entry", () => {
    const rows = selectSetupPerformance([win("ORB", 300), win("VWAP", 100), loss("ORB", -50)]);
    expect(rows.map((r) => r.name)).toEqual(["ORB", "VWAP"]);
    expect(rows[0].entries).toBe(2);
    expect(rows[0].pnl.total).toBe(250);
  });

  it("an UNKNOWN total sorts LAST, never among the flat setups", () => {
    // Sorting an unreadable sum as if it were 0 is the ordering equivalent of
    // printing $0 — it makes an unread row look measured and unremarkable.
    const rows = selectSetupPerformance([
      win("UNREADABLE", null),
      win("LOSER", -500),
      win("FLAT", 0),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["FLAT", "LOSER", "UNREADABLE"]);
  });

  it("every row carries a reason a human can read", () => {
    const rows = selectSetupPerformance([
      win("ORB", 100), be("VWAP", 0), win("BROKEN", null),
    ]);
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.reason.length).toBeGreaterThan(60);
  });

  it("an empty journal produces no rows at all — not one empty row", () => {
    expect(selectSetupPerformance([])).toEqual([]);
  });
});

/**
 * THE SWEEP — stated positively, so it survives a rewrite of the row.
 *
 * The law is not "no file may divide wins by a total". It is that any surface
 * computing a per-setup breakdown must route it through the one owner. A
 * second inline copy is how this defect existed in the first place.
 */
const SRC = resolve(__dirname, "..", "..");
const JOURNAL = resolve(SRC, "app", "journal", "page.tsx");

function codeOf(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function sweptFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { sweptFiles(full, acc); continue; }
    if (!/\.tsx?$/.test(full) || /\.test\.tsx?$/.test(full)) continue;
    acc.push(full);
  }
  return acc;
}

const FILES = sweptFiles(SRC);

describe("the setup-performance law is swept, not located", () => {
  it("the sweep is not vacuous", () => {
    // A sweep that silently covered zero files reports a clean bill of health
    // forever, which is the whole reason this defect survived.
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES).toContain(JOURNAL);
  });

  it("no surface re-implements the per-setup sum inline", () => {
    const INLINE_SUM = /\w+\[\w+\.setup\]\.pnl\s*\+=/;
    // `[\w.]*` and not `\w*`, because the shipped form was `data.wins +
    // data.losses` — a predicate that cannot match the code it was written
    // from is the vacuity defect wearing a regex.
    const INVENTED_RATE = /\bwins\s*\+\s*[\w.]*[Ll]osses\s*>\s*0\s*\?[\s\S]{0,80}?:\s*0\b/;
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = codeOf(file);
      if (INLINE_SUM.test(code) || INVENTED_RATE.test(code)) {
        offenders.push(file.slice(SRC.length + 1));
      }
    }
    expect(
      offenders,
      "a per-setup breakdown computed inline re-creates three defects this repo " +
        "already owns: an unguarded `+=` over values storage may not hold as numbers, " +
        "a hardcoded 0% win rate where there is no denominator, and a green tint " +
        "earned by `0 >= 0`. Route it through selectSetupPerformance.",
    ).toEqual([]);
  });

  it("REVIVE CONTROL: the sweep's predicates each fire on a synthetic offender", () => {
    const INLINE_SUM = /\w+\[\w+\.setup\]\.pnl\s*\+=/;
    // `[\w.]*` and not `\w*`, because the shipped form was `data.wins +
    // data.losses` — a predicate that cannot match the code it was written
    // from is the vacuity defect wearing a regex.
    const INVENTED_RATE = /\bwins\s*\+\s*[\w.]*[Ll]osses\s*>\s*0\s*\?[\s\S]{0,80}?:\s*0\b/;
    expect(INLINE_SUM.test("setupMap[e.setup].pnl += e.pnl;")).toBe(true);
    expect(
      INVENTED_RATE.test("wr: data.wins + data.losses > 0 ? data.wins / (data.wins + data.losses) * 100 : 0,"),
    ).toBe(true);
    // and the owner itself is not an offender
    expect(INLINE_SUM.test(codeOf(resolve(__dirname, "selectSetupPerformance.ts")))).toBe(false);
  });

  it("/journal delegates, and keeps no sign-tint on the setup row", () => {
    const code = codeOf(JOURNAL);
    expect(code).toContain("selectSetupPerformance(");
    expect(code).not.toMatch(/s\.pnl\s*>=\s*0\s*\?\s*"text-wm-green"/);
    expect(code).not.toMatch(/s\.wr\.toFixed/);
  });

  it("every colour on the setup row is chosen by TONE, not by a sign", () => {
    // The lesson from the masthead revive: a guard that catches the arithmetic
    // and not the CLAIM guards the wrong half. The win colour may appear only
    // in an expression that reads the owner's tone.
    const code = codeOf(JOURNAL);
    // Anchor on CODE, never on a comment: codeOf strips comments, so a
    // comment-anchored slice silently becomes `slice(0, -1 + 400)` and the
    // guard inspects the wrong region. That is this suite's own vacuity trap.
    const start = code.indexOf("sortedSetups.map");
    expect(start).toBeGreaterThan(-1);
    const end = code.indexOf("bg-wm-green rounded-full", start);
    expect(end).toBeGreaterThan(start);
    const block = code.slice(start, end);
    const GREENS = [...block.matchAll(/text-wm-green/g)];
    expect(GREENS.length).toBeGreaterThan(0);
    for (const g of GREENS) {
      const before = block.slice(Math.max(0, g.index! - 60), g.index!);
      expect(
        before,
        "a win colour on the setup row is not governed by the owner's tone — " +
          "a flat setup goes green again the moment a sign test decides this",
      ).toMatch(/tone\s*===\s*"WIN"\s*\?\s*"?$/);
    }
  });
});
