/**
 * SENTINEL — GO IS UNREACHABLE WHILE ANY CONDITION IS OWED.
 *
 * ── Why this is a Sentinel and not a unit test ───────────────────────────────
 *
 * Every other test in this codebase asserts that a FUNCTION returns the right
 * value for the inputs that test happened to think of. That is the wrong shape
 * of assurance for an interlock. An interlock is only an interlock if there is
 * NO input that opens it — the whole value is in the absence of a path, and an
 * absence cannot be demonstrated by a handful of examples.
 *
 * So this file does not pick cases. It enumerates the ENTIRE cross-product of
 * every permission verdict the steward can return against every meaningful
 * shape of decision chain, compiles each pair through the real production
 * path, and asserts the same two facts about all of them:
 *
 *   1. `computeRightOfWay` never returns ACTION while `missing > 0`.
 *   2. `selectGoInterlock` never returns CLEAR while `missing > 0`.
 *
 * (1) is the canon guarantee — "the surface can NEVER read ACTION while there
 * is missing evidence, regardless of what selectPermission returned". It has
 * been true by construction since Rule 1 was written, and has never been
 * proven over the full input space. (2) is new, and is the part that could
 * plausibly rot: `selectGoInterlock` reads a verdict rather than recomputing
 * one, so the day someone "helpfully" gives it a fast path, the lock opens.
 *
 * ── The failure this is standing in front of ─────────────────────────────────
 *
 * A trader reads PERMISSION GRANTED over a roster that still holds `?` chips
 * and takes the trade. Nothing throws. The suite stays green — because the
 * plaque and the chips are drawn by different lines of the same component and
 * no existing test renders them together with a contradictory fixture.
 *
 * That is the most expensive single pixel this product can get wrong, and it
 * is worth an exhaustive proof rather than an example.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { computeEvidenceDebt, computeRightOfWay } from "./decisionPermissionCompiler";
import type { RightOfWay } from "./decisionPermissionCompiler";
import { selectGoInterlock } from "./selectGoInterlock";
import type { DecisionChainNode } from "./selectDecisionChain";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";

const perm = (verdict: PermissionVM["verdict"], reason?: string): PermissionVM =>
  ({ verdict, ...(reason ? { reason } : {}) }) as PermissionVM;

const node = (
  label: string,
  indicator: DecisionChainNode["indicator"],
  extra: Partial<DecisionChainNode> = {},
): DecisionChainNode => ({
  key: label.toLowerCase().replace(/\s+/g, "-"),
  label,
  verdict: indicator === "OK" ? "RESOLVED" : "UNRESOLVED",
  resolution: "RESOLVED",
  narrative: "sentinel",
  indicator,
  ...extra,
});

/**
 * TOTAL over PermissionVerdict. A fifth steward verdict fails the build here
 * rather than quietly entering the product untested against the interlock.
 */
const PERMISSION_VERDICTS: Record<PermissionVM["verdict"], true> = {
  ALLOWED: true,
  ADVISORY: true,
  RESTRICTED: true,
  UNKNOWN: true,
};

/**
 * Every kind of unpaid node, because "owed" is not one thing. A node can be
 * owed and payable by evidence, owed and payable by declaration, owed and
 * composed (unpayable by anyone), or owed and blocked by the venue. The
 * interlock must hold for all four — the venue-blocked case especially, since
 * that is the one the product most wants to excuse.
 */
const OWED_VARIANTS: readonly (Partial<DecisionChainNode> & { readonly note: string })[] = [
  { note: "payable by evidence", payableBy: "EVIDENCE" },
  { note: "payable by declaration", payableBy: "DECLARATION" },
  { note: "a composition — payable by nobody", payableBy: "COMPOSITION" },
  { note: "unclassified", },
  { note: "venue-blocked", payableBy: "EVIDENCE", venueBlocked: true },
];

/** Settled and flagged filler, so the owed node is never alone on the chain. */
const SETTLED = node("Direction", "OK");
const FLAGGED = node("Location", "WARN");
const OBSERVED = node("Session", "WATCH");

describe("SENTINEL — GO is unreachable while any condition is owed", () => {
  it("no (permission × chain) pair in the whole space reaches ACTION while something is owed", () => {
    const verdicts = Object.keys(PERMISSION_VERDICTS) as PermissionVM["verdict"][];
    const seen: RightOfWay[] = [];
    let pairs = 0;

    for (const verdict of verdicts) {
      for (const owed of OWED_VARIANTS) {
        // Vary the company the owed node keeps: alone, beside settled evidence,
        // beside a flagged node, beside an ungradeable one, and all together.
        const owedNode = node("Aggression", "UNKNOWN", owed);
        const chains: readonly DecisionChainNode[][] = [
          [owedNode],
          [SETTLED, owedNode],
          [FLAGGED, owedNode],
          [OBSERVED, owedNode],
          [SETTLED, FLAGGED, OBSERVED, owedNode],
        ];

        for (const chain of chains) {
          const debt = computeEvidenceDebt(chain)!;
          expect(debt.missing).toBeGreaterThan(0);

          const decision = computeRightOfWay(perm(verdict, "a rule"), debt);
          seen.push(decision.value);
          pairs += 1;

          expect(
            decision.value,
            `steward=${verdict} owed=${owed.note} chain=[${chain.map((n) => n.label).join(",")}]`,
          ).not.toBe("ACTION");

          const lock = selectGoInterlock(decision, debt);
          expect(
            lock.state,
            `steward=${verdict} owed=${owed.note} chain=[${chain.map((n) => n.label).join(",")}]`,
          ).not.toBe("CLEAR");
          expect(lock.plaque).not.toBe("PERMISSION GRANTED");
        }
      }
    }

    // The space was actually walked — a silently-empty loop would pass every
    // assertion above and prove nothing at all.
    expect(pairs).toBe(verdicts.length * OWED_VARIANTS.length * 5);
    expect(new Set(seen).has("ACTION")).toBe(false);
  });

  it("the interlock is not vacuous — the SAME machinery does open on a paid chain", () => {
    // Without this, a `selectGoInterlock` that returned HELD unconditionally
    // would pass the proof above with full marks.
    const paid = [SETTLED, node("Location", "OK")];
    const debt = computeEvidenceDebt(paid)!;
    expect(debt.missing).toBe(0);

    const decision = computeRightOfWay(perm("ALLOWED"), debt);
    expect(decision.value).toBe("ACTION");
    expect(selectGoInterlock(decision, debt).state).toBe("CLEAR");
  });

  it("a paid ledger still does not open the door when the STEWARD holds it", () => {
    // The two locks are independent. Paying every condition clears the evidence
    // lock and nothing else — the release sentence promises exactly this much.
    const paid = [SETTLED, node("Location", "OK")];
    const debt = computeEvidenceDebt(paid)!;

    for (const verdict of ["ADVISORY", "RESTRICTED", "UNKNOWN"] as const) {
      const decision = computeRightOfWay(perm(verdict, "a rule"), debt);
      expect(decision.value).not.toBe("ACTION");
      expect(selectGoInterlock(decision, debt).state).not.toBe("CLEAR");
    }
  });

  it("the lock names the same conditions the roster draws — one source, never two", () => {
    const chain = [
      SETTLED,
      node("Aggression", "UNKNOWN", { payableBy: "EVIDENCE" }),
      node("CLC", "UNKNOWN", { payableBy: "DECLARATION" }),
      node("Regime", "UNKNOWN", { payableBy: "COMPOSITION" }),
    ];
    const debt = computeEvidenceDebt(chain)!;
    const decision = computeRightOfWay(perm("ALLOWED"), debt);
    const lock = selectGoInterlock(decision, debt);

    expect(lock.state).toBe("HELD");
    expect(lock.heldBy).toEqual(
      debt.roll!.filter((e) => e.standing === "MISSING").map((e) => e.label),
    );
    expect(lock.heldBy).toHaveLength(debt.missing);
  });

  it("the rail still CALLS the interlock — the last link in the wire", () => {
    // Scope, stated honestly: this asserts the component still consults the
    // selector and still emits the element. What the element SAYS is proven by
    // render, in DecisionSpineBand.test.tsx ("never says PERMISSION GRANTED
    // while a condition is owed") — a source-literal cannot reach that, and a
    // breadcrumb that pretended to would be worse than none.
    //
    // This exists because a component that silently stops calling its own
    // selector breaks no test anywhere: the selector suite stays green proving
    // a function nobody invokes.
    const src = readFileSync(
      resolve(__dirname, "../../../components/experience/DecisionSpineBand.tsx"),
      "utf8",
    );
    expect(src).toContain("selectGoInterlock(nowDecision");
    expect(src).toContain('data-testid="go-interlock"');
    expect(src).toContain("data-interlock={interlock.state}");
  });
});
