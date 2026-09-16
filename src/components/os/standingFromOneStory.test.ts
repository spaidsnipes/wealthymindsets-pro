/**
 * THE FRAME IS NEVER MORE — OR LESS — CONFIDENT THAN THE ROOM.
 *
 * `standingFromOneStory` exists because /charts rendered "DECISION WAIT" and
 * "9 unpaid evidence nodes" underneath a masthead reading "EVIDENCE DEBT
 * UNKNOWN / no ledger compiled". These cases pin both directions of that
 * failure: the chrome must not claim more than the story carries, and it must
 * not claim LESS either.
 *
 * Pure function, no DOM — which is the point of extracting it. The behaviour
 * that used to live inside a 2000-line client component is now provable.
 */
import { describe, expect, it } from "vitest";

import { standingFromOneStory } from "./standingFromOneStory";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { EvidenceDebt } from "@/lib/marketData/viewModels/decisionPermissionCompiler";

const debt = (over: Partial<EvidenceDebt> = {}): EvidenceDebt => ({
  payable: 9,
    watch: 0,
  resolved: 0,
  missing: 9,
  warn: 0,
  missingLabels: ["regime", "direction"],
  warnLabels: [],
  ...over,
});

const story = (over: Partial<OneStoryVM> = {}): OneStoryVM => ({
  primary: "Market is in balance around a fair-value zone.",
  contradiction: null,
  contradictionDetectability: "NOTHING_TO_COMPARE",
  missing: "regime + direction +7",
  decision: { value: "WAIT", detail: "evidence debt: need regime + direction +7", tone: "warn" },
  debt: debt(),
  ...over,
});

describe("standingFromOneStory — the chrome inherits the room's confidence", () => {
  it("THE MEASURED DEFECT: a room reading WAIT with 9 unpaid nodes publishes exactly that", () => {
    // Before this function existed, /charts published nothing and the frame
    // above this very state rendered UNKNOWN / UNKNOWN.
    expect(standingFromOneStory(story())).toEqual({
      openEvidenceItems: 9,
      rightOfWay: "WAIT",
      rightOfWayResolved: true,
    });
  });

  it("no story at all is UNKNOWN — and specifically NOT zero", () => {
    // `openEvidenceItems: 0` renders as "EVIDENCE DEBT 0 OPEN", which reads as
    // a SETTLED ledger. A room that compiled nothing has not settled anything.
    for (const nothing of [null, undefined]) {
      const out = standingFromOneStory(nothing);
      expect(out.openEvidenceItems).toBeNull();
      expect(out.openEvidenceItems).not.toBe(0);
      expect(out).toEqual({
        openEvidenceItems: null,
        rightOfWay: "UNKNOWN",
        rightOfWayResolved: false,
      });
    }
  });

  it("a chain with NO dimensions is an unopened ledger, not a paid one", () => {
    // payable 0 means there was nothing to owe against — so `missing: 0` here is
    // arithmetic about an empty set, not evidence that the work was done.
    expect(standingFromOneStory(story({ debt: debt({ payable: 0, missing: 0 }) })).openEvidenceItems)
      .toBeNull();
    expect(standingFromOneStory(story({ debt: null })).openEvidenceItems).toBeNull();
  });

  it("a FULLY PAID ledger reports 0 — the one case where zero is the truth", () => {
    // The mirror of the case above, and the reason `payable > 0` is the gate
    // rather than `missing > 0`. Nine dimensions, all resolved, is a real
    // measured zero and must not be flattened back into UNKNOWN.
    const paid = story({
      debt: debt({ resolved: 9, missing: 0, missingLabels: [] }),
      decision: { value: "ACTION", detail: "all evidence paid", tone: "resolved" },
    });
    expect(standingFromOneStory(paid)).toEqual({
      openEvidenceItems: 0,
      rightOfWay: "ACTION",
      rightOfWayResolved: true,
    });
  });

  it("UNKNOWN is a reading the compiler may return — it is still not RESOLVED", () => {
    const unresolved = story({
      decision: { value: "UNKNOWN", detail: "no permission reading", tone: "unknown" },
    });
    const out = standingFromOneStory(unresolved);
    expect(out.rightOfWay).toBe("UNKNOWN");
    expect(out.rightOfWayResolved).toBe(false);
    // …and the debt is still published, because a missing DECISION does not
    // erase a ledger the room already compiled. They are independent readings.
    expect(out.openEvidenceItems).toBe(9);
  });

  it("every decision value the compiler can emit survives the trip unchanged", () => {
    // The chrome must never translate, soften, or re-word a verdict. Anything
    // other than passthrough would make this function a SECOND author of the
    // decision — the exact defect the extraction was meant to prevent.
    for (const value of ["ACTION", "WAIT", "NO TRADE", "CAUTION", "UNKNOWN"] as const) {
      const out = standingFromOneStory(
        story({ decision: { value, detail: "d", tone: "unknown" } }),
      );
      expect(out.rightOfWay).toBe(value);
      expect(out.rightOfWayResolved).toBe(value !== "UNKNOWN");
    }
  });

  describe("THE FRAME MAY NOT BE SOFTER THAN THE ROOM BY ONE NODE", () => {
    // Measured live on the deck, in one screenshot:
    //
    //     rail  ·  EVIDENCE DEBT   8 OPEN     unpaid information
    //     cell  ·  EVIDENCE DEBT   0 of 9 paid
    //              9 evidence nodes unpaid: regime + direction +6;
    //              1 warned: permission
    //
    // One label, one set, two numbers. This published `debt.missing`, which
    // omits the WARN bucket, so a contested node vanished from the frame while
    // remaining in the room. Every fixture above happens to use `warn: 0` —
    // which is precisely why the suite was green while the rail was wrong.
    it("counts a WARN node as the debt it is", () => {
      const contested = story({
        debt: debt({ payable: 9, resolved: 0, missing: 8, warn: 1, warnLabels: ["permission"] }),
      });
      expect(standingFromOneStory(contested).openEvidenceItems).toBe(9);
    });

    it("never reports a contested ledger as PAID", () => {
      // The nastiest shape: everything gradeable came back, one came back
      // CONTESTED. `missing` is 0, so the old expression published 0 — which
      // the chrome renders as "EVIDENCE DEBT PAID". A live warning would have
      // been drawn as a clean bill of health.
      const warnOnly = story({
        debt: debt({ payable: 1, resolved: 0, missing: 0, warn: 1, missingLabels: [], warnLabels: ["permission"] }),
      });
      expect(standingFromOneStory(warnOnly).openEvidenceItems).toBe(1);
      expect(standingFromOneStory(warnOnly).openEvidenceItems).not.toBe(0);
    });

    it("equals payable - resolved across the full bucket cross-product", () => {
      // Written against the ARITHMETIC, not against a bucket by name. This is
      // the third site where the identical omission surfaced — the ledger
      // sentence, the lead count, and now the frame — so the guard has to
      // survive a FOURTH bucket being added rather than pinning today's three.
      for (const resolved of [0, 1, 2, 3]) {
        for (const missing of [0, 1, 2, 3]) {
          for (const warn of [0, 1, 2, 3]) {
            const payable = resolved + missing + warn;
            if (payable === 0) continue;
            const out = standingFromOneStory(
              story({
                debt: debt({
                  payable,
                  resolved,
                  missing,
                  warn,
                  missingLabels: missing > 0 ? ["regime"] : [],
                  warnLabels: warn > 0 ? ["permission"] : [],
                }),
              }),
            );
            expect(out.openEvidenceItems, `resolved=${resolved} missing=${missing} warn=${warn}`)
              .toBe(payable - resolved);
          }
        }
      }
    });
  });

  it("publishes NOTHING it was not given — `surface` belongs to the room", () => {
    // A shared function that invented a surface name would put two owners on
    // "what room am I in", which is the only field the room alone can know.
    expect(Object.keys(standingFromOneStory(story())).sort()).toEqual([
      "openEvidenceItems",
      "rightOfWay",
      "rightOfWayResolved",
    ]);
  });
});
