/**
 * Garden 19 slice 4 — §64 sheriff columns (market / planned / actual) in the
 * Review row, and §23/§41 FVG answers + Personal Edge by FVG context.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StoryReviewRow } from "@/components/journal/BrokerTruthToday";
import type { FvgEvent } from "@/lib/marketData/fvg/fvgEngine";
import { amendPlan, freezePlanSnapshot } from "./managementPlan";
import { fvgContextFromEvents, fvgContextGroup, fvgReviewAnswers, planAdherenceByFvgContext } from "./planFvgContext";
import { sheriffColumns } from "./planSheriff";
import type { PlanVsActualResult, PricePath, TradeActuals } from "./planVsActual";

import { traderClock } from "@/components/time/traderClock";
const tc = (ms: number) => traderClock(ms, { seconds: false });
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const T0 = Date.parse("2026-10-07T14:30:00Z");
const M = 60_000;
const base = freezePlanSnapshot({ decisionId: "wmd_sh", frozenAt: "TICKET_SEND", atMs: T0 - 1000, source: "t",
  plan: { direction: "LONG", stopPx: 98, targetPx: 104, invalidationPx: 99, thesis: "reclaim of VWAP", conditions: ["move to breakeven after +1R"], expectedHoldMin: 20, session: "NY open" } })!;
const am = amendPlan(base, { atMs: T0 + 2 * M, targetPx: 103, newEvidence: "breadth rolled over", note: null });
if (!am.ok) throw new Error(am.reason);
const plan = am.snapshot;
const actuals: TradeActuals = {
  direction: "LONG", entry: { atMs: T0 + 10_000, px: 100, qty: 2 }, adds: [], stopMoves: [{ atMs: T0 + 3 * M, fromPx: 98, toPx: 100 }], targetMoves: [],
  exits: [{ atMs: T0 + 4 * M + 30_000, px: 101.2, qty: 2 }], source: "tastytrade order readback and trade transactions",
};
const path: PricePath = { barMs: M, source: "tastytrade 1m bars for /MNQZ26:XCME", bars: [
  [99.6, 100.4], [100.1, 101.9], [100.8, 102.2], [100.9, 101.6], [100.7, 101.3], [101.0, 103.1], [102.0, 104.2],
].map(([l, h], i) => ({ t: T0 + i * M, l, h, c: h })) };

describe("§64 the three columns, stated apart", () => {
  const s = sheriffColumns({ plan, actuals, path });
  it("WHAT THE MARKET DID — extremes in and after the hold, and when each planned level printed", () => {
    expect(s.market).toContain(`During the hold: high 102.2 (${tc(T0 + (2) * M)}), low 99.6 (${tc(T0 + (0) * M)}).`);
    expect(s.market).toContain(`After the exit, to ${tc(T0 + (6) * M)}: high 104.2, low 101.`);
    expect(s.market).toContain(`The planned target 104 printed after the exit (bar ${tc(T0 + (6) * M)}).`);
    expect(s.market).toContain("The planned stop 98 did not print in the bars loaded.");
    expect(s.market).toContain("The planned invalidation 99 did not print in the bars loaded.");
  });
  it("WHAT YOU PLANNED — frozen snapshot plus each dated amendment with its new evidence", () => {
    expect(s.planned[0]).toMatch(new RegExp(`^Frozen at the ticket's send, ${esc(tc(T0 + (-1) * M))}\\. Decision_ID wmd_sh\\.$`));
    expect(s.planned).toContain("Management: “move to breakeven after +1R”.");
    expect(s.planned).toContain(`Amended ${tc(T0 + (2) * M)}: target → 103 — new evidence: breadth rolled over.`);
  });
  it("WHAT YOU ACTUALLY DID — fills, stop/target moves, exit, with the reporter", () => {
    expect(s.actual).toEqual([
      "Reported by: tastytrade order readback and trade transactions.",
      `Entry 2 @ 100 at ${tc(T0 + (0) * M)} (long).`,
      `Stop order 98 → 100 at ${tc(T0 + (3) * M)}.`,
      `Exit 2 @ 101.2 at ${tc(T0 + (4) * M)}.`,
    ]);
  });
  it("missing facts are named, never filled", () => {
    const n = sheriffColumns({ plan: null, actuals: null, path: null });
    expect(n.market[0]).toMatch(/not loaded/);
    expect(n.planned).toEqual(["No plan was frozen for this decision."]);
    expect(n.actual).toEqual(["No trade facts were reported."]);
  });
  it("the columns carry no reasons or emotions", () => {
    expect(JSON.stringify(s)).not.toMatch(/afraid|fear|panic|greed|impatien|because you|felt|should have/i);
  });
});

describe("§64 Review row: three blocks, then the deviation lines, then the annotation box", () => {
  const html = renderToStaticMarkup(React.createElement(StoryReviewRow, { storyKey: "k", plan: { plan, actuals, path }, defaultOpen: true }));
  it("renders the three columns before the deviations and the why-box", () => {
    const i = (s: string) => html.indexOf(s);
    for (const id of ["plan-sheriff-market", "plan-sheriff-planned", "plan-sheriff-actual", "plan-deviations", "plan-why"]) expect(i(`data-testid="${id}"`)).toBeGreaterThan(0);
    expect(i('data-testid="plan-sheriff-actual"')).toBeLessThan(i('data-testid="plan-deviations"'));
    expect(i('data-testid="plan-deviations"')).toBeLessThan(i('data-testid="plan-why"'));
    expect(html).toContain("WHAT THE MARKET DID");
    expect(html).toContain("WHAT YOU PLANNED");
    expect(html).toContain("WHAT YOU ACTUALLY DID");
    expect(html).toContain("minmax(min(100%, 220px), 1fr)");
  });
});

describe("§23/§41 FVG answers from the object's own events", () => {
  const ev = (kind: string, knownAt: number, extra: Record<string, unknown> = {}) => ({ kind, knownAt, barIndex: 0, barId: "b", ...extra }) as unknown as FvgEvent;
  const ctx = fvgContextFromEvents({ objectId: "fvg_1", timeframe: "5m", direction: "BULLISH", bottom: 99, top: 100 }, [
    ev("BORN", T0 - 60 * M), ev("TOUCH_START", T0 - 20 * M, { episode: 1 }), ev("EPISODE_END", T0 - 10 * M, { episode: 1 }),
    ev("TOUCH_START", T0 + 5 * M, { episode: 2 }), ev("TRADED_THROUGH", T0 + 20 * M, { episode: 2, close: 98.5 }),
  ], 5 * M);
  const act = (entryMin: number, exitMin: number | null): TradeActuals => ({ direction: "LONG", entry: { atMs: T0 + entryMin * M, px: 99.5, qty: 1 }, adds: [], stopMoves: [], targetMoves: [],
    exits: exitMin == null ? [{ atMs: null, px: 99, qty: 1 }] : [{ atMs: T0 + exitMin * M, px: 99, qty: 1 }], source: "x" });
  it("first touch / later touch / before any touch", () => {
    expect(fvgReviewAnswers(ctx, act(-22, 0)).touch.answer).toBe("FIRST_TOUCH");
    const later = fvgReviewAnswers(ctx, act(1, 3));
    expect(later.touch).toMatchObject({ answer: "LATER_TOUCH", episode: 2 });
    expect(later.touch.sentence).toBe(`Your entry at ${tc(T0 + (1) * M)} came on touch 2 of the territory 99–100 (bullish FVG, 5m), not the first.`);
    const early = fvgReviewAnswers(ctx, act(-40, -30));
    expect(early.touch.answer).toBe("BEFORE_ANY_TOUCH");
    expect(early.actedBeforeCondition.answer).toBe("YES");
    expect(later.actedBeforeCondition.answer).toBe("NO");
  });
  it("held after the territory was traded through — or exited with it — or unknown without times", () => {
    expect(fvgReviewAnswers(ctx, act(1, 40)).heldAfterTradedThrough.answer).toBe("HELD_AFTER_TRADED_THROUGH");
    expect(fvgReviewAnswers(ctx, act(1, 22)).heldAfterTradedThrough.answer).toBe("EXITED_AS_TRADED_THROUGH");
    expect(fvgReviewAnswers(ctx, act(1, 3)).heldAfterTradedThrough.answer).toBe("NOT_TRADED_THROUGH_WHILE_OPEN");
    expect(fvgReviewAnswers(ctx, act(1, null)).heldAfterTradedThrough.answer).toBe("UNKNOWN");
    expect(fvgReviewAnswers(ctx, { ...act(1, 3), entry: { atMs: null, px: 1, qty: 1 } }).touch.answer).toBe("UNKNOWN");
  });
  it("Review shows the three FVG answers", () => {
    const html = renderToStaticMarkup(React.createElement(StoryReviewRow, { storyKey: "k", plan: { plan, actuals, path }, fvg: fvgReviewAnswers(ctx, act(1, 40)), defaultOpen: true }));
    expect(html).toContain('data-group="FVG · later touch"');
    expect(html).toContain("Held after it was traded through?");
  });
  it("Personal Edge by FVG context: groups, MEASURED only at ≥20", () => {
    const r = (followed: boolean): PlanVsActualResult => ({ decisionId: "d", findings: [{ id: followed ? "PLAN_FOLLOWED" : "EXITED_BEFORE_PLANNED_CONDITION" }], exitDecidable: true } as unknown as PlanVsActualResult);
    const first = fvgReviewAnswers(ctx, act(-22, 0));
    const rows = planAdherenceByFvgContext([
      ...Array.from({ length: 20 }, (_, i) => ({ fvg: first, result: r(i % 2 === 0) })),
      { fvg: null, result: r(true) },
    ]);
    expect(rows.find(x => x.setup === "FVG · first touch")).toMatchObject({ state: "MEASURED", sample: 20, followed: 10 });
    expect(rows.find(x => x.setup === "no FVG reference")?.state).toBe("INSUFFICIENT EVIDENCE");
    expect(fvgContextGroup(null)).toBe("no FVG reference");
  });
});
