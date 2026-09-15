/**
 * THE DISCLOSURE THAT WAS DELETED BY ITS OWN SUCCESS.
 *
 * `/paper`'s MARKET PRICES rail rendered each row's status line as:
 *
 *   {chg == null ? readiness.status : `${pct}%`}
 *
 * with `readiness.actionable ? gold : red` as the only other signal. Both
 * halves fail, and they fail in a way that hides the other:
 *
 *   - `priorAsStale` KEEPS the last price, and the previous close never moves,
 *     so a STALE row still computes a percentage — and therefore never renders
 *     the word STALE. The disclosure appears only when it is not needed.
 *   - What remained was a colour, on a channel that already means direction.
 *     A stale quote printing `+4.39%` rendered RED — contradicting its own
 *     sign. Canon, verbatim: "Color may support meaning but may never replace
 *     it."
 *
 * The rail's other disclosure was a `title=` tooltip. Hover does not exist on
 * a touch device, and the phone is the primary device by binding standard.
 *
 * MEASURED LIVE on production /paper at 2026-09-15T19:05:37Z: the Order Ticket
 * said `ACTIVE DEGRADED · Observed 1:55:32 PM · 10m old` while the rail beside
 * it served 16 prices from the same provider with no freshness text at all.
 * One page, one provider, two freshness stories — canon Weakness #1.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  paperQuoteRowTruth,
  paperQuotePanelChipText,
  selectPaperQuotePanelTruth,
} from "./selectPaperQuotePanelTruth";
import type { PaperQuoteReadiness } from "./selectPaperQuoteReadiness";
import { CANONICAL_FIDELITY_LABELS } from "../canonicalFidelityLabels";

const ready = (over: Partial<PaperQuoteReadiness> = {}): PaperQuoteReadiness => ({
  status: "DELAYED",
  actionable: true,
  price: 100,
  observedAt: 1_000,
  availableAt: 1_000,
  receivedAt: 1_000,
  ageMs: 60_000,
  label: CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED,
  reason: "ok",
  ...over,
});

describe("paperQuoteRowTruth — colour may support meaning, never replace it", () => {
  it("REPRODUCES THE LIVE DEFECT SHAPE: a STALE row still computes a percentage", () => {
    // This is why the old ternary never showed the word. `priorAsStale` keeps
    // the price, so `chg` is non-null for exactly the rows that most need to
    // say STALE. The word must survive anyway.
    const row = paperQuoteRowTruth(
      ready({ status: "STALE", actionable: false }),
      4.39,
    );
    expect(row.text).toContain("STALE");
    expect(row.text).toContain("+4.39%");
    expect(row.degraded).toBe(true);
  });

  it("never lets a degraded row be identified by colour alone", () => {
    // The load-bearing invariant. For EVERY non-actionable status, and for a
    // percentage of either sign, the status word must be present in the TEXT.
    for (const status of ["STALE", "UNKNOWN", "LOADING"] as const) {
      for (const pct of [4.39, -2.71, 0]) {
        const row = paperQuoteRowTruth(ready({ status, actionable: false }), pct);
        expect(row.text, `${status} @ ${pct} lost its word`).toContain(status);
        expect(row.degraded).toBe(true);
      }
    }
  });

  it("stays quiet when the row IS actionable — no symbol-wide insult", () => {
    // Canon: "fidelity is per capability, not a symbol-wide insult." Stamping
    // ACTIVE DEGRADED on all sixteen healthy rows would be noise, not truth.
    const row = paperQuoteRowTruth(ready(), -0.58);
    expect(row.text).toBe("-0.58%");
    expect(row.degraded).toBe(false);
  });

  it("falls back to the status word when no percentage can be computed", () => {
    expect(paperQuoteRowTruth(ready({ status: "LOADING", actionable: false }), null).text)
      .toBe("LOADING");
    expect(paperQuoteRowTruth(ready(), Number.NaN).text).toBe("DELAYED");
  });

  it("treats a missing readiness as UNKNOWN, not as fine", () => {
    // H1 — absence is not zero. A row with no readiness has not been proven
    // fresh; defaulting it to actionable would be a claim never observed.
    expect(paperQuoteRowTruth(null, 1.5)).toEqual({ text: "UNKNOWN", degraded: true });
  });

  it("formats the sign the way a price rail must", () => {
    expect(paperQuoteRowTruth(ready(), 0).text).toBe("+0.00%");
    expect(paperQuoteRowTruth(ready(), -0.004).text).toBe("-0.00%");
  });
});

describe("selectPaperQuotePanelTruth — the rail states its own worst case", () => {
  it("reports the WORST row, not the average", () => {
    const truth = selectPaperQuotePanelTruth([
      ready(),
      ready(),
      ready({ status: "STALE", actionable: false }),
    ]);
    expect(truth.label).toBe(CANONICAL_FIDELITY_LABELS.STALE_PIPELINE);
    expect(truth.degradedCount).toBe(1);
    expect(truth.total).toBe(3);
    expect(paperQuotePanelChipText(truth)).toBe(
      `${CANONICAL_FIDELITY_LABELS.STALE_PIPELINE} 1/3`,
    );
  });

  it("ranks LOADING above DELAYED — silence is not reassurance", () => {
    // A row still waiting has told us NOTHING. A delayed row has told us
    // something true. The rail must not be graded by the one that spoke.
    const truth = selectPaperQuotePanelTruth([
      ready(),
      ready({ status: "LOADING", actionable: false, ageMs: null, price: null }),
    ]);
    expect(truth.label).toBe("LOADING");
  });

  it("surfaces the OLDEST observation — the fact the Order Ticket already shows", () => {
    // This is the number that closes the disagreement. The ticket disclosed
    // "10m old"; the rail beside it disclosed nothing.
    const truth = selectPaperQuotePanelTruth([
      ready({ ageMs: 60_000 }),
      ready({ ageMs: 10 * 60_000 }),
      ready({ ageMs: 120_000 }),
    ]);
    expect(truth.oldestAgeMs).toBe(10 * 60_000);
    expect(truth.reason).toContain("10m old");
  });

  it("counts a MISSING row as degraded rather than skipping it", () => {
    const truth = selectPaperQuotePanelTruth([ready(), null, undefined]);
    expect(truth.total).toBe(3);
    expect(truth.degradedCount).toBe(2);
    expect(truth.label).toBe("UNKNOWN");
  });

  it("invents nothing for an empty rail", () => {
    // Returning ACTIVE DEGRADED here would be a fidelity claim about data that
    // was never observed.
    for (const empty of [[], null, undefined]) {
      const truth = selectPaperQuotePanelTruth(empty);
      expect(truth.label).toBe("UNKNOWN");
      expect(truth.total).toBe(0);
      expect(truth.oldestAgeMs).toBeNull();
      expect(paperQuotePanelChipText(truth)).toBe("UNKNOWN");
    }
  });

  it("omits the fraction when nothing is degraded", () => {
    const truth = selectPaperQuotePanelTruth([ready(), ready()]);
    expect(truth.label).toBe(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED);
    expect(paperQuotePanelChipText(truth)).toBe(
      CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED,
    );
  });

  it("uses canon vocabulary, not free-form pill copy", () => {
    expect(
      selectPaperQuotePanelTruth([ready()]).label,
    ).toBe(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED);
    expect(
      selectPaperQuotePanelTruth([ready({ status: "STALE", actionable: false })]).label,
    ).toBe(CANONICAL_FIDELITY_LABELS.STALE_PIPELINE);
  });
});

describe("the /paper rail actually renders it — the wire, not just the arithmetic", () => {
  // VACUITY GUARD + BREADCRUMB. The selector above can be perfect while the
  // surface still hand-rolls the old ternary. That is precisely the shape this
  // codebase keeps finding: a correct owner with no consumer.
  const SRC = readFileSync(
    resolve(__dirname, "../../../app/paper/page.tsx"),
    "utf8",
  );

  it("VACUITY GUARD: the scan read the page", () => {
    expect(
      SRC.length,
      "app/paper/page.tsx read back nearly empty — the assertions below would " +
        "pass while policing nothing",
    ).toBeGreaterThan(50_000);
  });

  it("imports the panel-truth selector", () => {
    expect(SRC).toMatch(
      /from\s*"@\/lib\/marketData\/viewModels\/selectPaperQuotePanelTruth"/,
    );
  });

  it("the row status line renders rowTruth.text, not a bare percentage", () => {
    // The load-bearing line. If a future edit inlines the percentage again,
    // the word STALE disappears from every stale row and the only remaining
    // signal is a colour that already means "down".
    expect(
      SRC,
      "the MARKET PRICES row no longer renders `rowTruth.text`; a degraded row " +
        "would be identifiable by colour alone, which the canon forbids by name",
    ).toContain("{rowTruth.text}");
    expect(SRC).toContain("paperQuoteRowTruth(readiness, chg)");
  });

  it("the rail header renders its freshness as TEXT, not only as a title tooltip", () => {
    // Hover is not reachable on the primary device. The reason must be a TEXT
    // NODE, not an attribute value.
    //
    // CAUGHT DURING REVIVE (2026-09-15): the first version of this assertion
    // was `toContain("{quotePanelTruth.reason}")`, which also matches
    // `title={quotePanelTruth.reason}`. Deleting the visible line left the
    // tooltip behind and the guard stayed green — the gate agreed with the
    // truth in the default case, which is exactly what would have let it ship.
    // Anchoring on the JSX child position is what makes it load-bearing.
    expect(
      SRC,
      "the rail header no longer renders `quotePanelTruth.reason` as a visible " +
        "TEXT NODE; a `title=` tooltip is not reachable on a touch device, so " +
        "on a phone the freshness of all 16 prices becomes unreachable",
    ).toMatch(/>\s*\{quotePanelTruth\.reason\}\s*</);
    expect(SRC).toContain("paperQuotePanelChipText(quotePanelTruth)");
  });

  it("the header derives from the same readiness map the rows use", () => {
    // A second copy of the rule would agree on the happy path — which is
    // exactly what would let the two drift apart unnoticed.
    expect(SRC).toContain(
      "selectPaperQuotePanelTruth(Object.values(quoteReadiness))",
    );
  });

  it("the quarantined free-form chip is gone", () => {
    expect(
      SRC,
      "`PAPER QUOTES` named whose book the quotes belong to, not how old they " +
        "are, while occupying the one slot a fidelity label had",
    ).not.toContain("PAPER QUOTES<");
    expect(SRC).not.toMatch(/>\s*PAPER QUOTES\s*</);
  });
});
