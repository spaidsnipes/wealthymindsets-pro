import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ProtectionGradeLine, { PROTECTION_GRADE_EDGE } from "./ProtectionGradeLine";
import { selectProtectionState, NEVER_GREEN_GRADES, type ProtectionGrade } from "@/lib/protectionState";

/**
 * PROTECTION_GRADE — position-book guard.
 *
 * NOT a first-pixel suite. `ContractStance` has rendered §7's grade on /paper's
 * OPTIONS blotter since 2026-09-08. This line covers the position book, which
 * had no grade at all, and is fed from the actual order book rather than the
 * literal `0` every prior caller passes for covered quantity.
 *
 * Three things are fenced:
 *
 *   1. the §7 grammar reaches the DOM, uncovered size included
 *   2. §9's colour rule holds — no green, for ANY grade, BROKER-WORKING too
 *   3. /paper actually mounts it, in the book region, not behind a drawer
 */

const ALL_GRADES: readonly ProtectionGrade[] = [
  "FLAT",
  "BROKER-WORKING",
  "WM-SUPERVISED",
  "MANUAL-DEGRADED",
  "UNPROTECTED",
  "UNVERIFIED — LAST KNOWN",
];

function render(state: Parameters<typeof ProtectionGradeLine>[0]["state"]) {
  return renderToStaticMarkup(<ProtectionGradeLine state={state} book="PAPER BOOK" />);
}

describe("ProtectionGradeLine — the sentence reaches the DOM", () => {
  it("renders the §7 grammar with the uncovered count", () => {
    const state = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 2 });
    const html = render(state);

    expect(html).toContain("POSITION 3 PROTECTED 2 UNPROTECTED 1");
    expect(html).toContain("MANUAL-DEGRADED");
    // The uncovered count is machine-readable too, so a Sentinel can assert on
    // exposure without parsing prose.
    expect(html).toContain('data-uncovered="1"');
  });

  it("renders FLAT as a sentence rather than as blank space", () => {
    const html = render(selectProtectionState({ filledQty: 0, brokerAckedProtectedQty: 0 }));

    // An empty risk column reads as a calm one. FLAT must be SAID.
    expect(html).toContain("FLAT");
    expect(html).toContain("nothing to protect");
  });

  it("names the book, so the grade cannot be read out of its environment", () => {
    const html = render(selectProtectionState({ filledQty: 1, brokerAckedProtectedQty: 1 }));

    expect(html).toContain("PAPER BOOK");
  });

  it("announces grade, sentence and detail as one accessible label", () => {
    const state = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 0 });
    const html = render(state);

    // A reader that hears the grade without the count does not learn how much
    // is exposed.
    expect(html).toMatch(/aria-label="[^"]*UNPROTECTED[^"]*POSITION 3 PROTECTED 0 UNPROTECTED 3[^"]*"/);
  });
});

describe("ProtectionGradeLine — §9: no green means safe", () => {
  it("emits no green for any grade, including BROKER-WORKING", () => {
    for (const grade of ALL_GRADES) {
      const edge = PROTECTION_GRADE_EDGE[grade];
      // The palette is brass-family only: rgba(201,165,92) / rgba(139,106,41).
      // Both are red>green>blue. A green-dominant accent would fail here.
      const [r, g, b] = edge.match(/\d+/g)!.slice(0, 3).map(Number);
      expect(r, `${grade} edge must not be green-dominant`).toBeGreaterThan(g);
      expect(g, `${grade} edge must not be blue-dominant`).toBeGreaterThan(b);
    }
  });

  it("carries no green hex or named green anywhere in the source", () => {
    const src = readFileSync(resolve(__dirname, "ProtectionGradeLine.tsx"), "utf8");

    // Prose may DISCUSS green (the docstring quotes §9). Only values count, so
    // comments are stripped before the palette is examined.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    expect(code).not.toMatch(/\bgreen\b/i);
    expect(code).not.toMatch(/#(?:0f0|00ff00|22c55e|16a34a|4ade80|10b981)/i);
  });

  it("renders the fully-covered case as fact, not reassurance", () => {
    const html = render(selectProtectionState({ filledQty: 2, brokerAckedProtectedQty: 2 }));

    expect(html).toContain("BROKER-WORKING");
    // The disclaimer is load-bearing: a working stop is an order state, not an
    // outcome promise.
    expect(html).toContain("can still gap");
  });

  it("keeps every NEVER_GREEN grade in brass rather than finding-ivory", () => {
    for (const grade of NEVER_GREEN_GRADES) {
      const state = {
        grade,
        positionQty: 3,
        protectedQty: 0,
        uncoveredQty: 3,
        sentence: "POSITION 3 PROTECTED 0 UNPROTECTED 3",
        fullyCovered: false,
      } as const;

      expect(render(state)).toContain("#c9a55c");
    }
  });
});

describe("ProtectionGradeLine — it is actually mounted", () => {
  it("/paper imports and renders it", () => {
    const page = readFileSync(resolve(__dirname, "../../app/paper/page.tsx"), "utf8");

    expect(page).toContain("ProtectionGradeLine");
    expect(page).toContain("selectPaperProtection");
    // Not parked behind a disclosure. The whole defect this closes was a risk
    // fact that existed and was not on screen.
    expect(page).toMatch(/<ProtectionGradeLine[\s\S]{0,200}?\/>/);
  });

  it("is fed from the order book, not from a literal covered quantity", () => {
    const page = readFileSync(resolve(__dirname, "../../app/paper/page.tsx"), "utf8");

    // THE DEFECT THIS EXISTS FOR. /paper's other protection caller passes
    // `brokerAckedProtectedQty: 0` as a literal (line ~1469), so that grade is
    // decided before the book is read and no real stop could ever move it.
    // This mount must pass `orders`, or it is the same lie with a new pixel.
    const call = page.match(/selectPaperProtection\(\{[\s\S]{0,400}?\}\)/);
    expect(call, "selectPaperProtection call not found on /paper").not.toBeNull();
    expect(call![0]).toContain("orders");
    expect(call![0]).not.toMatch(/brokerAckedProtectedQty/);
  });

  it("degrades with the book instead of vanishing when it cannot be read", () => {
    const page = readFileSync(resolve(__dirname, "../../app/paper/page.tsx"), "utf8");

    // An unreadable book must not be allowed to render BROKER-WORKING off a
    // position list it could not fully parse, and must not silently drop the
    // risk line either. Same flag as the recovery banner.
    expect(page).toMatch(/bookUnverified:\s*bookRecoveryRequired/);

    // Mounted ABOVE the recovery/empty/table ternary. Inside any branch it
    // disappears exactly when a trader most needs it.
    const tab = page.slice(page.indexOf('tab==="positions" &&'));
    expect(tab.indexOf("<ProtectionGradeLine")).toBeLessThan(tab.indexOf("bookRecoveryRequired ? ("));
  });
});
