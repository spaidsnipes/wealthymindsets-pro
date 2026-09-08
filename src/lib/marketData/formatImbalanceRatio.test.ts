/**
 * formatImbalanceRatio — behaviour of the ONE display rule for aggressor
 * imbalance, plus the §24 / H21 source rule that keeps it the ONLY one.
 *
 * Two real defects are pinned here:
 *
 *   1. THE 300 SENTINEL. `selectAggressorFlow` returns 300 with `oneSided`
 *      set when the weaker side has zero volume, because the true ratio is
 *      unbounded. Painting "300" invents a 3:1 reading the tape never made.
 *
 *   2. THE UNBOUNDED TAIL. Crypto per-trade sizes are fractional, so a tiny
 *      opposing side pushes the ratio into the millions. A from-USE defect was
 *      observed on BTC at 27,261,700 — derived, and useless to a human.
 *
 * And the structural one that let both reach a screen: the rule lived as a
 * PRIVATE function inside OrderFlowCockpitStrip.tsx, so the only surface that
 * obeyed it was the one that happened to contain it. SmartMoneyPanel ran its
 * own copy of the aggressor math and printed the raw ratio.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { formatImbalanceRatio } from "./formatImbalanceRatio";
import { selectAggressorFlow, type AggressorTick } from "./selectAggressorFlow";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SRC = join(REPO_ROOT, "src");
const PANEL = "src/components/smart-money/SmartMoneyPanel.tsx";
const STRIP = "src/components/chart/OrderFlowCockpitStrip.tsx";

/** Rules must judge CODE, not the prose that explains the defect by name. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function tick(side: "buy" | "sell", size: number, price = 100): AggressorTick {
  return { side, size, price, trade: true };
}

describe("formatImbalanceRatio — the sentinel is not a measurement", () => {
  it("speaks a one-sided tape as 'one-sided', never as the 300 sentinel", () => {
    expect(formatImbalanceRatio(300, true)).toBe("one-sided");
    expect(formatImbalanceRatio(300, true)).not.toMatch(/300/);
  });

  it("ANTI-VACUITY: a genuinely two-sided ratio is still spoken as a ratio", () => {
    // "return 'one-sided' always" must not pass this file.
    expect(formatImbalanceRatio(250, false)).toBe("250:100");
    expect(formatImbalanceRatio(160, false)).toBe("160:100");
  });

  it("caps the unbounded crypto tail instead of printing 27,261,700", () => {
    expect(formatImbalanceRatio(27_261_700, false)).toBe("≥10k:1");
    expect(formatImbalanceRatio(150_000, false)).toBe("≥1k:1");
  });

  it("says 1:1 only for a ratio that was actually measured as balanced", () => {
    expect(formatImbalanceRatio(100, false)).toBe("1:1");
    expect(formatImbalanceRatio(0, false)).toBe("1:1");
  });

  /**
   * Found by writing this file, not from USE. The original guard read
   * `!Number.isFinite(ratio) || ratio <= 100` and sent BOTH non-finite inputs
   * to "1:1" — so an UNBOUNDED ratio and an UNCOMPUTED one both rendered as a
   * measured balance. §14.1's shape exactly: the absence of a number became a
   * positive claim about it.
   */
  it("never turns 'unbounded' or 'uncomputed' into a measured balance", () => {
    expect(formatImbalanceRatio(Number.POSITIVE_INFINITY, false)).toBe("one-sided");
    expect(formatImbalanceRatio(Number.NaN, false)).toBe("unknown");
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatImbalanceRatio(bad, false)).not.toBe("1:1");
    }
  });
});

describe("selectAggressorFlow → formatImbalanceRatio — the seam holds end to end", () => {
  it("an all-buy tape produces oneSided, and the display refuses to paint 300", () => {
    const snap = selectAggressorFlow([tick("buy", 0.011), tick("buy", 0.004)], 100);
    expect(snap.oneSided).toBe(true);
    expect(snap.imbRatio).toBe(300); // the sentinel, unchanged for numeric consumers
    expect(formatImbalanceRatio(snap.imbRatio, snap.oneSided)).toBe("one-sided");
  });

  it("a fractional opposing side is real flow, and is spoken as a capped ratio", () => {
    // The BTC shape: sub-1 sizes on both sides. This IS two-sided — it must not
    // collapse into "one-sided", which would be the opposite lie.
    const snap = selectAggressorFlow([tick("buy", 2.5), tick("sell", 0.0000001)], 100);
    expect(snap.oneSided).toBe(false);
    expect(snap.imbRatio).toBeGreaterThan(1e6);
    expect(formatImbalanceRatio(snap.imbRatio, snap.oneSided)).toBe("≥10k:1");
  });
});

describe("§24 / H21 — ONE OWNER for the aggressor rule and its display", () => {
  const panel = stripComments(readFileSync(join(SRC, "components/smart-money/SmartMoneyPanel.tsx"), "utf8"));
  const strip = stripComments(readFileSync(join(SRC, "components/chart/OrderFlowCockpitStrip.tsx"), "utf8"));

  it("SmartMoneyPanel consumes the canonical selector instead of its own copy", () => {
    expect(panel, `${PANEL} must call the canonical owner`).toMatch(
      /selectAggressorFlow\s*\(/,
    );
    // The private copy this cutover removed. `selectAggressorFlow.ts` says in
    // its own first line that it EXTRACTED this math from this panel; the
    // extraction happened and the cutover never did, so a second copy of the
    // rule ran here for the whole time and missed the `oneSided` correction.
    expect(panel, `${PANEL} re-implements aggressor accumulation`).not.toMatch(
      /askVol\s*\+=|bidVol\s*\+=/,
    );
  });

  it("no surface paints the raw ratio — both speak through the display owner", () => {
    for (const [rel, code] of [
      [PANEL, panel],
      [STRIP, strip],
    ] as const) {
      expect(code, `${rel} must import the one display rule`).toMatch(
        /formatImbalanceRatio\s*\(/,
      );
      // The exact defective render: `${imbRatio}%` / `${snap.imbRatio}`.
      expect(code, `${rel} paints the raw imbRatio, sentinel and all`).not.toMatch(
        /\$\{\s*(f\.|snap\.)?imbRatio\s*\}/,
      );
    }
  });

  it("the display rule is an importable module, not a private function", () => {
    // A rule a second surface cannot import is not an owner. This is the whole
    // reason both traps reached SmartMoneyPanel.
    expect(strip, `${STRIP} still declares a private formatImbalanceRatio`).not.toMatch(
      /function\s+formatImbalanceRatio/,
    );
    const owner = readFileSync(join(SRC, "lib/marketData/formatImbalanceRatio.ts"), "utf8");
    expect(owner).toMatch(/export\s+function\s+formatImbalanceRatio/);
  });
});
