import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DecisionChainPanel from "@/components/chart/DecisionChainPanel";
import type {
  DecisionChainVM,
  DecisionChainNode,
} from "@/lib/marketData/viewModels/selectDecisionChain";

/**
 * THE ARIA-LABEL MAY NOT KNOW MORE THAN THE SCREEN.
 *
 * ── THE MEASURED DEFECT ───────────────────────────────────────────────
 * `DecisionChainPanel` composed `node.reason` into each node's `aria-label`
 * and rendered it nowhere. The visible column painted label, verdict, the
 * indicator glyph, `narrative` and `hints`. `reason` had no pixel at all.
 *
 * Five of the chain's nine nodes carry one — regime, auction, CLC, Available R
 * and permission all forward their upstream VM's `reason` (see
 * `selectDecisionChain.ts`). And it is a DIFFERENT sentence from `narrative`,
 * not a rewording of it. `selectRegime` is the clearest case:
 *
 *   narrative: "Regime value has changed across the last 3 snapshots (…)."
 *   reason:    "Regime dimension has flipped recently — treat as transitional,
 *               not stable."
 *
 * The first says what the regime IS. The second says what to DO about it. Only
 * the first was ever painted, so the Founder reading his own Decision Chain got
 * the observation and a screen-reader user got the instruction.
 *
 * ── WHY THIS IS NOT "AN ACCESSIBILITY WIN RUNNING AHEAD" ──────────────
 * An accessible name exists to give NON-TEXT content a text equivalent. The
 * indicator glyph legitimately lives only in the label — `ind.label` is the
 * text alternative for a coloured "◐", and that asymmetry is correct.
 *
 * A VIEW-MODEL FIELD is not non-text content. When a compiled sentence reaches
 * assistive technology and never reaches the screen, the accessible name has
 * stopped being an alternative and become the only copy. That is an inversion,
 * and the sighted trader is the one who lost the sentence.
 *
 * ── WHY THE RULE IS NOT "DELETE reason FROM THE LABEL" ────────────────
 * That would have made the two agree by throwing away the better sentence, and
 * a rule tuned until it agrees with its author is a rubber stamp with a test
 * runner. The disagreement was real evidence that something compiled was going
 * unshown. It is fixed by PAINTING, and this pins the painting.
 */

const NODE_KEYS = ["regime", "auction", "clc", "risk", "permission"] as const;

function node(over: Partial<DecisionChainNode>): DecisionChainNode {
  return {
    key: "regime",
    label: "Regime",
    verdict: "COMPRESSION",
    resolution: "RESOLVED",
    narrative: "Regime value has changed across the last 3 snapshots.",
    indicator: "WATCH",
    ...over,
  } as DecisionChainNode;
}

/**
 * The panel reads exactly four things off the vm: `phase`, `headline`,
 * `summary` and `nodes`. The upstream VMs it also carries (`regime`, `dlar`,
 * `clc`, `auction`, `availableR`, `permission`) exist for OTHER consumers to
 * inspect deeper and are never dereferenced here — so a fixture that supplied
 * them would be six selectors' shapes copied into a test file, drifting the
 * moment any of them changed, in exchange for nothing this panel can observe.
 */
function vmWith(nodes: readonly DecisionChainNode[]): DecisionChainVM {
  const tally = { ok: 0, watch: 0, warn: 0, unknown: 0 };
  for (const n of nodes) {
    if (n.indicator === "OK") tally.ok++;
    else if (n.indicator === "WATCH") tally.watch++;
    else if (n.indicator === "WARN") tally.warn++;
    else tally.unknown++;
  }
  return {
    phase: "PREGAME",
    evaluatedAt: 0,
    nodes,
    summary: { ...tally, total: nodes.length },
    headline: "Chain headline",
  } as unknown as DecisionChainVM;
}

/** Everything OUTSIDE an aria-label. What a sighted trader can actually read. */
function visibleText(markup: string): string {
  return markup
    .replace(/aria-label="[^"]*"/g, "")
    .replace(/title="[^"]*"/g, "")
    .replace(/<[^>]+>/g, " ");
}

const REASON = "Regime dimension has flipped recently — treat as transitional, not stable.";

describe("the Decision Chain's aria-label may not know more than the screen", () => {
  it("RENDERS node.reason where a sighted trader can read it", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DecisionChainPanel, {
        vm: vmWith([node({ reason: REASON })]),
      }),
    );
    expect(markup, "the label should still carry the reason for assistive tech")
      .toContain(REASON);
    expect(
      visibleText(markup),
      "node.reason reached the accessible name and no pixel — the sighted " +
        "trader was told the observation and denied the instruction",
    ).toContain(REASON);
  });

  it("is not gated on showNarratives — a terse chain needs its caveats MOST", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DecisionChainPanel, {
        vm: vmWith([node({ reason: REASON })]),
        showNarratives: false,
      }),
    );
    expect(
      visibleText(markup),
      "showNarratives=false re-opened the aria-only hole through the other branch",
    ).toContain(REASON);
    // Control: the flag still does its job, or this test proves nothing.
    expect(visibleText(markup)).not.toContain("Regime value has changed");
  });

  it("stays silent when the selector set no reason — no empty rule, no blank row", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DecisionChainPanel, { vm: vmWith([node({})]) }),
    );
    expect(markup).not.toContain("data-decision-chain-reason");
  });

  it("paints a reason for EVERY node that can carry one, not just the first", () => {
    const nodes = NODE_KEYS.map((k, i) =>
      node({ key: k, label: k, reason: `REASON_FOR_${k}_${i}` }),
    );
    const visible = visibleText(
      renderToStaticMarkup(React.createElement(DecisionChainPanel, { vm: vmWith(nodes) })),
    );
    for (const [i, k] of NODE_KEYS.entries()) {
      expect(visible, `${k}'s reason is still unpainted`).toContain(`REASON_FOR_${k}_${i}`);
    }
  });
});

/**
 * THE SELECTOR HALF. The render tests above would keep passing on the day
 * `selectDecisionChain` stopped forwarding `reason` at all — the panel would
 * paint a field nothing ever fills, and a chain with no caveats reads exactly
 * like a chain with nothing to caveat.
 */
describe("the chain still compiles the reasons the panel now paints", () => {
  const sel = fs.readFileSync(
    path.join(process.cwd(), "src/lib/marketData/viewModels/selectDecisionChain.ts"),
    "utf8",
  );

  it("forwards a reason from its upstream view models", () => {
    const forwards = sel.match(/^\s*reason:\s*\w/gm) ?? [];
    expect(
      forwards.length,
      "selectDecisionChain stopped forwarding `reason` — the panel now has a " +
        "row that can never fill, which reads as 'nothing to warn about'",
    ).toBeGreaterThanOrEqual(5);
  });

  it("keeps reason a DIFFERENT field from narrative on the node type", () => {
    const iface = sel.slice(
      sel.indexOf("export interface DecisionChainNode"),
      sel.indexOf("export interface DecisionChainVM"),
    );
    expect(iface).toMatch(/readonly narrative:\s*string/);
    expect(iface).toMatch(/readonly reason\?:\s*string/);
  });
});
