import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { computeRightOfWay, type EvidenceDebt } from "@/lib/marketData/viewModels/decisionPermissionCompiler";
import { standingInWords } from "@/components/experience/DimensionStandingBand";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/components/experience/CanvasSummaryPill.tsx"),
  "utf8",
);
const pill = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Canvas pill verdict-legibility Sentinel.
 *
 * Observed on prod /charts (BTC): "ACTION · 8 missing · 2 cleared".
 *
 * The two numbers have DIFFERENT owners:
 *   verdict  <- decision-chain evidence debt (what authorizes)
 *   missing  <- state.unknowns, i.e. unresolved canonical DIMENSIONS
 *
 * Canon rejection #1 (RightOfWay may never be ACTION while evidence debt has
 * missing nodes) was satisfied — chain debt was 0. But the pill read as a
 * direct contradiction, which is the same failure at the presentation layer.
 *
 * Fix is a relabel, not an authority change: unresolved dimensions are named
 * "unresolved" and the tooltip states they do not gate the verdict. These
 * tests lock BOTH the label and the underlying authorization invariant.
 */
describe("canvas pill verdict legibility", () => {
  it('does not label unresolved dimensions as "missing" beside a verdict', () => {
    /* THE LABEL LEFT THE PILL, AND THE LAW FOLLOWED IT.
     *
     * This asserted the pill emitted the template `${n} unresolved` and never
     * `${n} missing`. The pill now emits neither: the dimension standing is
     * DRAWN, by `DimensionStandingBand`, because it is the same fact
     * `MarketCanvasPanel` draws and one fact in two registers is how two
     * surfaces disagree. These two already had — the pill read "7 unresolved"
     * on live TSLA while the panel beside it said "RESOLVED (4)", eleven of
     * eight, because PARTIAL was counted in both.
     *
     * The law is now satisfied by construction: the pill cannot contradict a
     * verdict with the word "missing" because it writes no dimension label at
     * all. But "satisfied by having no surface" is how a guard rots into
     * vacuity, so the assertion moves to the vocabulary's new OWNER, where the
     * word is chosen once for every surface that shows this reading.
     */
    expect(pill, "the pill must not have grown its own dimension label again").not.toContain(
      "} missing`",
    );
    expect(pill, "the pill draws the standing rather than spelling it").toContain(
      "<DimensionStandingBand",
    );

    const band = fs
      .readFileSync(
        path.join(process.cwd(), "src/components/experience/DimensionStandingBand.tsx"),
        "utf8",
      )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    // The bucket the compiler calls MISSING is SPOKEN as "unresolved". The KEY
    // keeps the compiler's name — renaming a compiler's vocabulary to match a
    // label is how two surfaces start disagreeing about which bucket they are
    // in — so only the spoken word is constrained.
    expect(band).toMatch(/MISSING:\s*\{[^}]*word:\s*"unresolved"/);
    expect(band).not.toMatch(/word:\s*"missing"/);
  });

  it("the words a screen reader gets still say 'unresolved', never 'missing'", () => {
    // The band is aria-hidden inside the pill, so `standingInWords` carries the
    // entire reading. A picture that is correct beside a sentence that is not
    // would be the original defect, moved somewhere harder to notice.
    expect(
      standingInWords({
        resolved: ["Regime", "Direction"],
        measured: ["Location"],
        missing: ["Participation", "Volatility", "Liquidity", "Time", "Correlation"],
      }),
    ).toContain("5 unresolved");
    expect(
      standingInWords({ resolved: [], measured: [], missing: ["Regime"] }),
    ).not.toContain("missing");
    // An empty bucket is omitted, never printed as a zero — H1, in a sentence.
    expect(standingInWords({ resolved: ["Regime"], measured: [], missing: [] })).toBe("1 resolved");
    // And nothing at all says nothing at all, rather than "0 resolved".
    expect(standingInWords({ resolved: [], measured: [], missing: [] })).toBe("");
  });

  it("the tooltip states unresolved dimensions do not gate the verdict", () => {
    expect(pill).toContain("do not gate the verdict");
  });

  /* The real authorization invariant, unchanged by the relabel. */
  it("canon rejection #1 still holds: missing chain debt can never yield ACTION", () => {
    for (const missing of [1, 2, 5, 9]) {
      const debt: EvidenceDebt = {
        payable: 10, watch: 0,
        resolved: 10 - missing,
        missing,
        warn: 0,
        missingLabels: ["regime", "direction"],
        missingPayableLabels: ["direction"],
        missingPayable: 1,
        warnLabels: [],
      };
      const r = computeRightOfWay(null, debt);
      expect(r.value).not.toBe("ACTION");
      expect(r.value).toBe("WAIT");
    }
  });

  it("zero chain debt does not itself fabricate ACTION without permission", () => {
    const debt: EvidenceDebt = {
      payable: 8, watch: 0, resolved: 8, missing: 0, warn: 0,
      missingLabels: [], missingPayableLabels: [], missingPayable: 0, warnLabels: [],
    };
    // No permission supplied → must not invent authorization.
    expect(computeRightOfWay(null, debt).value).not.toBe("ACTION");
  });
});
