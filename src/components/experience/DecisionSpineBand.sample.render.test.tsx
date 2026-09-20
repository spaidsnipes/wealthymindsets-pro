/**
 * THE DECISION RAIL, RENDERED WHERE A HUMAN CAN LOOK AT IT.
 *
 * Three drawn forms landed in this rail today — the evidence ladder under NEXT,
 * the severity bar under WHY, and the to-scale risk axis. Every one of them is
 * a claim about PIXELS, and the suite that guards them asserts on objects.
 *
 * POST-EDIT PIXEL PROOF LAW: a drawn change that nobody looked at is not shipped.
 * The authenticated routes need a session, and a session is not available to a
 * test, so this follows the pattern `MainLayout.founderRoute.render.test.tsx`
 * already established: render the real component to static markup at suite time
 * and write it where it can simply be opened —
 *
 *     open $(node -p "require('os').tmpdir()+'/decision-rail-sample.html'")
 *
 * ── THIS IS A FIXTURE RENDER AND SAYS SO ON ITS FACE ─────────────────────────
 *
 * LIVING-PIXEL LAW says every pixel needs a real owner. The numbers below have
 * no market behind them — they are constructed states chosen to exercise the
 * geometry's edges (full debt, partial debt, cleared, UNKNOWN). So the artifact
 * is LABELLED as a fixture, in the page, above the rails. It is proof that the
 * geometry draws, never evidence about any market.
 *
 * The component under it is the real one. If the rail stops drawing, this page
 * stops showing bars.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import DecisionSpineBand from "./DecisionSpineBand";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { DecisionWhyVM } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import { DECISION_WHY_VERSION } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";
import type { EvidenceDebt } from "@/lib/marketData/viewModels/decisionPermissionCompiler";

const PUBLIC_SAMPLE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "public",
  "decision-rail-sample.html",
);

function debt(p: Partial<EvidenceDebt>): EvidenceDebt {
  return {
    payable: 0,
    watch: 0,
    resolved: 0,
    missing: 0,
    warn: 0,
    missingLabels: [],
    warnLabels: [],
    missingPayableLabels: [],
    missingPayable: 0,
    ...p,
  };
}

function story(d: EvidenceDebt, verdict: OneStoryVM["decision"]): OneStoryVM {
  return {
    primary: "Range is compressing — participants are undecided.",
    contradiction: null,
    contradictionDetectability: "COMPARABLE",
    missing: d.missing > 0 ? "regime" : null,
    decision: verdict,
    debt: d,
  } as OneStoryVM;
}

function why(p: Partial<DecisionWhyVM>): DecisionWhyVM {
  return {
    version: DECISION_WHY_VERSION,
    verdict: "WAIT",
    clear: false,
    headline: "Right-of-way is withheld — the market has not earned entry.",
    blockers: [],
    blockerCount: 0,
    clearances: [],
    invalidators: [],
    evidenceLedger: null,
    ...p,
  };
}

function availableR(p: Partial<AvailableRVM>): AvailableRVM {
  return {
    resolution: "UNKNOWN",
    conservativeR: "UNKNOWN",
    optimisticR: "UNKNOWN",
    riskPerUnit: "UNKNOWN",
    costDragR: "UNKNOWN",
    destination: null,
    missingInputs: [],
    warnings: [],
    ...p,
  } as AvailableRVM;
}

const NOW = { token: "MARKET OPEN", detail: "Calendar session established.", established: true };
const MARKET = {
  symbol: "TSLA",
  timeframe: "15m",
  quality: "VERIFIED",
  capturedAt: Date.UTC(2026, 8, 17, 15, 30, 0),
  last: 412.86,
  barsSettled: true,
};

/** Three states, chosen because their geometry must NOT look alike. */
const STATES = [
  {
    caption: "UNPAID — 9-node ledger, 2 paid, 1 flagged, 1 WATCH node outside the bar",
    props: {
      decisionId: "dec_0001",
      decisionIdAbsence: "",
      now: NOW,
      market: MARKET,
      oneStory: story(
        debt({ payable: 9, watch: 1, resolved: 2, warn: 1, missing: 6, missingLabels: ["regime", "direction", "location"] }),
        { value: "WAIT" as const, detail: "Evidence is unpaid.", tone: "pending" as const },
      ),
      availableR: availableR({ resolution: "RESOLVED", conservativeR: 2.4, optimisticR: 3.8, riskPerUnit: 1.83, costDragR: 0.25 }),
      decisionWhy: why({
        blockers: [
          { kind: "HARD_RULE" as const, label: "daily loss cap", detail: "engaged" },
          { kind: "EVIDENCE_DEBT" as const, label: "regime", detail: "UNKNOWN" },
          { kind: "EVIDENCE_WARN" as const, label: "location", detail: "flagged" },
        ],
        blockerCount: 9,
        clearances: ["No active contradiction to the thesis."],
      }),
      expression: null,
    },
  },
  {
    caption: "CLEARED — every payable node paid, no blockers, reward to scale",
    props: {
      decisionId: "dec_0002",
      decisionIdAbsence: "",
      now: NOW,
      market: MARKET,
      oneStory: story(debt({ payable: 6, resolved: 6 }), {
        value: "ACTION" as const,
        detail: "Path is clear.",
        tone: "resolved" as const,
      }),
      availableR: availableR({ resolution: "RESOLVED", conservativeR: 1.2, optimisticR: 1.2, riskPerUnit: 0.9, costDragR: 0.15 }),
      decisionWhy: why({
        verdict: "ACTION",
        clear: true,
        headline: "Right-of-way is granted — the path is clear.",
        blockerCount: 0,
        clearances: ["No active contradiction to the thesis.", "6/6 evidence nodes paid."],
      }),
      expression: null,
    },
  },
  {
    caption: "UNKNOWN — nothing compiled; no bar is drawn, and the words say why",
    props: {
      decisionId: null,
      decisionIdAbsence: "No decision has been born yet on this selection.",
      now: { token: "SESSION UNKNOWN", detail: "No calendar in evidence.", established: false },
      market: { ...MARKET, quality: null, capturedAt: null, last: null, barsSettled: false },
      oneStory: null,
      availableR: null,
      decisionWhy: null,
      expression: null,
    },
  },
];

let SAMPLE_HTML = "";
let SAMPLE_WRITE_ERROR = "";
try {
  const rails = STATES.map(
    (state) => `
    <section style="display:flex;flex-direction:column;gap:8px;max-width:290px">
      <div style="font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:#8a8271">${state.caption}</div>
      <div style="border:1px solid rgba(139,106,41,.22);border-radius:10px;overflow:hidden;background:rgba(255,255,255,.015)">
${renderToStaticMarkup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <DecisionSpineBand {...(state.props as any)} presentation="rail" />,
)}
      </div>
    </section>`,
  ).join("\n");

  const sample = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WM Pro · Decision rail sample</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* THE FIXTURE MUST NOT LIE ABOUT THE PRODUCT.
       The app loads Tailwind Preflight ("@tailwind base" in src/app/globals.css),
       whose first rule is this one. Without it the rail's cells — width:100% plus
       11px of side padding — measured 310px inside a 306px column and grew a
       horizontal scrollbar that exists nowhere in the running app. MEASURED
       2026-09-19: scrollWidth 330 vs clientWidth 306. A fixture that draws
       overflow the product does not have sends someone hunting a bug that is not
       there, which is the same harm as hiding one that is. */
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin:0; padding:0; background:#07080a; color:#f3efe6;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { padding:24px; display:flex; flex-wrap:wrap; gap:24px; align-items:flex-start; }
  </style>
</head>
<body>
  <div style="padding:20px 24px 0;font-size:11px;line-height:1.6;color:#8a8271;max-width:760px">
    <strong style="color:#d4af37;letter-spacing:.8px">FIXTURE RENDER — NOT A MARKET.</strong>
    The component is the real <code>DecisionSpineBand</code>; the states below are
    constructed to exercise the geometry's edges. No number on this page is evidence
    about any instrument. It exists so the drawn forms can be LOOKED AT without a session.
    <br><br>
    <strong style="color:#d4af37;letter-spacing:.8px">S-501 FOUR CHUNK BUDGET.</strong>
    Each rail below opens with identity, NOW and NEXT. RISK, WHY and the fidelity
    plaque sit behind the <em>Risk · Why · Fidelity</em> fold — click one to confirm
    the organs were collapsed, not deleted.
  </div>
  <main>${rails}</main>
</body>
</html>`;
  SAMPLE_HTML = sample;
  const dest = path.join(tmpdir(), "decision-rail-sample.html");
  writeFileSync(dest, sample);
  writeFileSync(PUBLIC_SAMPLE, sample);
  process.stdout.write(`\n  Decision rail sample written to: ${dest}\n`);
  process.stdout.write(`  Open it: file://${dest}\n\n`);
} catch (error) {
  SAMPLE_WRITE_ERROR = error instanceof Error ? error.message : String(error);
}

describe("Decision rail sample — the drawn forms must actually draw", () => {
  it("wrote the sample without error", () => {
    expect(SAMPLE_WRITE_ERROR).toBe("");
    expect(SAMPLE_HTML.length).toBeGreaterThan(0);
  });

  it("draws nine ledger segments for a nine-node ledger, plus the WATCH node apart", () => {
    // Counting in the MARKUP, not in the view model: this is the assertion that
    // fails if the bar is rendered behind a condition that is never true.
    const segments = SAMPLE_HTML.match(/data-testid="evidence-ladder-segment"/g) ?? [];
    // 9 payable + 1 watch (first rail) + 6 resolved (second rail) = 16.
    expect(segments.length).toBe(16);
    expect(SAMPLE_HTML).toContain('data-testid="evidence-ladder-watch-rule"');
  });

  it("draws the WHY census, not the three-blocker sample", () => {
    const ticks = SAMPLE_HTML.match(/data-testid="why-severity-segment"/g) ?? [];
    expect(ticks.length).toBe(9);
    expect(SAMPLE_HTML).toContain('data-state="UNATTRIBUTED"');
  });

  it("draws a risk axis where reward is measured, and none where it is UNKNOWN", () => {
    const bars = SAMPLE_HTML.match(/data-testid="risk-reach-bar"/g) ?? [];
    expect(bars.length).toBe(2);
    expect(SAMPLE_HTML).toContain('data-testid="risk-reach-cost-drag"');
  });

  it("says on its own face that it is a fixture", () => {
    // A sample page that could be mistaken for a market is worse than no page.
    expect(SAMPLE_HTML).toContain("FIXTURE RENDER — NOT A MARKET.");
  });
});
