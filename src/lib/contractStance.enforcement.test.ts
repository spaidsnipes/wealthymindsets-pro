/**
 * THE §10 EXPRESSION CARD HAS A SCREEN — enforcement.
 *
 * `expressionCard` was the last §10 compiler with no surface, and
 * `protectionState` hung beneath it as a dead SUBTREE — reachable only from a
 * module nothing rendered. ATHOS "NO ORPHAN BREAKTHROUGHS": an internal engine
 * computing into nowhere is incomplete however well it is tested, and this one
 * was very well tested.
 *
 * These rules prove the wire is real, and — the part that matters — that the
 * card is not allowed to invent the inputs /paper does not have. A surface that
 * silently produced an R would be worse than the orphan it replaced.
 *
 * The behavioural half is asserted against the REAL compiler, not greps: what
 * this file is actually defending is "UNKNOWN survives contact with the UI".
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectExpressionCard } from "@/lib/expressionCard";
import { protectionTone } from "@/components/paper/ContractStance";

const page = readFileSync(resolve(process.cwd(), "src/app/paper/page.tsx"), "utf8");
const component = readFileSync(
  resolve(process.cwd(), "src/components/paper/ContractStance.tsx"), "utf8",
);

/** The exact shape /paper passes: no real quote, no invalidation, no planned R. */
function paperShapedCard(overrides: Record<string, unknown> = {}) {
  return selectExpressionCard({
    underlyingSymbol: "TSLA",
    contractLabel: "TSLA 400C",
    isCall: true,
    strike: 400,
    expiryMs: Date.UTC(2026, 8, 30),
    nowMs: Date.UTC(2026, 8, 8),
    qtyRequested: 2,
    qtyFilled: 2,
    brokerAckedProtectedQty: 0,
    entryPremium: 3.0,
    bid: null,
    ask: null,
    modeledPremium: 5.0,
    underlyingEntry: Number.NaN,
    underlyingInvalidation: Number.NaN,
    plannedRDollars: null,
    iv: 0.6,
    contractMultiplier: 100,
    underlyingSession: null,
    optionSession: null,
    ...overrides,
  } as Parameters<typeof selectExpressionCard>[0]);
}

describe("contract stance — the orphan is wired", () => {
  it("the options list RENDERS the card — not merely imports it", () => {
    // M118 SURVIVED the first version of this rule, which asserted only that
    // the string "ContractStance" appeared in the file. Deleting the JSX left
    // the import behind and every rule stayed green — an imported-but-never-
    // rendered component is exactly the orphan shape this file exists to catch,
    // and the import-graph walk in screenReach cannot see the difference either.
    // So the assertion is on the ELEMENT, with its prop, not on the name.
    expect(page).toMatch(/<ContractStance\s+card=\{stance\}/);
    expect(page).toContain("@/components/paper/ContractStance");
    expect(page).toContain("selectExpressionCard(");
  });

  it("compiles the card from the CANONICAL owner, opening no second path", () => {
    // H21/§6. A private protection calculation here would mean two modules
    // deciding what UNPROTECTED means. The component receives a compiled card
    // and renders it; it must not import the protection owner itself.
    expect(component).not.toContain("selectProtectionState");
    expect(component).toContain("@/lib/expressionCard");
  });
});

describe("contract stance — it does not invent what /paper never collected", () => {
  it("R is UNKNOWN when no planned 1R exists, and is NOT back-filled", () => {
    // H1: "If planned 1R is missing: show R as UNKNOWN. Do not invent R from
    // contract percent." This is the whole reason the field is allowed to be
    // empty — an invented R is a lie a trader will size on.
    const card = paperShapedCard();
    expect(card.currentR).toBeNull();
    expect(card.plannedLoss).toBeNull();
  });

  it("CONTRACT % is still computed — the two are different measurements (H13)", () => {
    // Anti-vacuity for the rule above: R being null must not be achieved by the
    // card simply knowing nothing. It knows the return; it declines to call it R.
    const card = paperShapedCard();
    expect(card.contractReturnPct).not.toBeNull();
    expect(card.contractReturnPct!).toBeCloseTo(66.67, 1);
    expect(card.currentR).toBeNull();
  });

  it("capital deployed is the debit and is never the planned loss", () => {
    const card = paperShapedCard();
    expect(card.capitalDeployed).toBe(3.0 * 2 * 100);
    expect(card.plannedLoss).toBeNull();
  });

  it("a modelled premium is never sellable, and the band says why it is UNKNOWN", () => {
    const card = paperShapedCard();
    expect(card.currentPremiumRole).toBe("MODELED");
    // H18 — MODELED is not a price anyone can hit, at any hour.
    expect(card.sellNowAvailable).toBe(false);
    // No structural invalidation is recorded on this path, so the envelope must
    // report a NAMED missing input rather than a number or a blank.
    expect(card.atInvalidation.status).toBe("UNKNOWN");
    expect(card.atInvalidation.unknownReason).toBeTruthy();
  });

  it("the surface renders the reason, not just the word UNKNOWN", () => {
    expect(component).toContain("unknownReason");
  });
});

describe("contract stance — §7 protection is stated and numbered", () => {
  it("an unprotected paper contract is graded UNPROTECTED with its size", () => {
    // THE RULE THIS FILE EXISTS FOR. Every open paper contract has zero working
    // protective orders. That was true before this surface existed; it was
    // simply never said.
    const card = paperShapedCard();
    expect(card.protection.grade).toBe("UNPROTECTED");
    expect(card.protection.uncoveredQty).toBe(2);
    expect(card.protection.sentence).toContain("UNPROTECTED");
  });

  it("§14.2 — BROKER-WORKING is unsayable without an ACK", () => {
    const card = paperShapedCard({ brokerAckedProtectedQty: 0 });
    expect(card.protection.grade).not.toBe("BROKER-WORKING");
  });

  it("the grammar reaches the screen verbatim, not paraphrased", () => {
    expect(component).toContain("protection.sentence");
    expect(component).toContain("protection.grade");
  });

  it("UNPROTECTED does not share a colour with the merely-unverified (§9)", () => {
    // "Nothing is covering this" and "I could not read the broker" lead to
    // different actions and must not collapse into one tint.
    expect(protectionTone("UNPROTECTED")).not.toBe(protectionTone("UNVERIFIED — LAST KNOWN"));
  });

  it("no green badge that means safe (§7, §9)", () => {
    const green = ["#00D4AA", "#5cb85c", "#00A888"];
    for (const grade of ["FLAT", "BROKER-WORKING", "WM-SUPERVISED"] as const) {
      expect(green, `${grade} is painted green`).not.toContain(protectionTone(grade));
    }
    expect(component).not.toMatch(/text-wm-green|bg-wm-green/);
  });
});
