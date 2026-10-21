/**
 * Today's risk plan inside the Prop Evaluation desk (Megazord order §6). Synthetic figures only.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PropEvaluationDesk } from "./PropEvaluationDesk";
import { PropSessionPlanPanel } from "./PropSessionPlanPanel";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
const known = { drawdownHeadroomCents: { known: true as const, value: 200_000 }, contractLimit: null, verified: true };

describe("today's risk plan", () => {
  it("an empty plan shows no dollar figure and says nothing is sized", () => {
    const html = renderToStaticMarkup(<PropSessionPlanPanel storageKey="k" account={known} />);
    expect(html).not.toMatch(/\$\d/);
    expect(html).toContain("TODAY&#x27;S RISK PLAN");
    expect(html).toMatch(/data-testid="prop-session-verdict"[^>]*>No plan sized yet\./);
    expect(html).toContain('data-verdict="NOT_SIZED"');
  });

  it("the sample desk sizes the sample plan under its contract limit, labels the loss count an illustration, and stays CANNOT_SAY while UNVERIFIED", () => {
    const html = renderToStaticMarkup(<PropEvaluationDesk storageKey={null} sample />);
    // The sample account's 5-contract limit caps the $150 risk (7 contracts at $21.04) to 5 — $105.20 a trade.
    expect(html).toMatch(/capped by the contract limit\)<\/span><span[^>]*>5 MNQ</);
    expect(html).toContain("· 5 MNQ · $105.20 a trade · one and done");
    expect(html).toContain("ILLUSTRATION — equal full-stop losses, before slippage and gaps. Not a forecast.");
    expect(html).toContain("The arithmetic permits these attempts. It is not a reason to take them.");
    expect(html).toMatch(/data-testid="prop-session" data-verdict="CANNOT_SAY"/);
    expect(html).toMatch(/data-attempts="1"[^>]*>One and done</);
  });

  it("the desk hands over its own headroom, contract limit and verified stamp — nothing is recomputed in the panel", () => {
    const desk = read("components/journal/PropEvaluationDesk.tsx");
    expect(desk).toContain("drawdownHeadroomCents: r.drawdownHeadroomCents, contractLimit: inputs.contractLimit, verified: r.verified");
    const panel = read("components/journal/PropSessionPlanPanel.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(panel).toContain("readSessionPlan(p, account)");
    expect(panel).not.toMatch(/pointValue|tickValue\s*\*|Math\.floor/);
  });

  it("source: kept on this device only, never in a proof scene, nothing sent, no target or promise", () => {
    const panel = read("components/journal/PropSessionPlanPanel.tsx");
    const code = panel.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).toContain("if (sample || !loaded || !key || proofSceneHoldsWrites()) return;");
    expect(code.match(/localStorage\.setItem\(/g)).toHaveLength(1);
    expect(code).not.toMatch(/fetch\(|sendBeacon|XMLHttpRequest|sessionStorage/);
    const lib = read("lib/journal/propSessionPlan.ts");
    for (const src of [panel, lib]) expect(src).not.toMatch(/you will pass|guarantee|you need to make|make \$?[\d,]+ today|should make|must make|daily goal|daily target/i);
  });
});
