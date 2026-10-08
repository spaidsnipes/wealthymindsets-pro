import { describe, expect, it } from "vitest";
import { compileFeedStanding } from "./osChrome";
import { quoteSessionClosure } from "@/lib/marketData/canonicalIdentity";
import { CANONICAL_FIDELITY_LABELS as L } from "@/lib/marketData/canonicalFidelityLabels";

/**
 * Night shift 2026-10-07: /charts TSLA and /command-deck read "STALE PIPELINE ·
 * last print 22523s ago" at 22:15 ET on a Wednesday. Our tape does not carry the
 * overnight off-exchange venues; the quiet is expected, not a fault.
 */
const WED_2215_ET = Date.parse("2026-10-08T02:15:00Z");
const SIX_HOURS = 6 * 3_600_000;

function standing(symbol: string, source: string) {
  const q = quoteSessionClosure(symbol, new Date(WED_2215_ET));
  return compileFeedStanding({
    source,
    quotePresent: true,
    barsPresent: true,
    lastObservedAtMs: WED_2215_ET - SIX_HOURS,
    connected: true,
    sessionOpen: q.sessionOpen,
    sessionDetail: q.detail,
    replayEngaged: false,
  }, WED_2215_ET);
}

describe("an overnight US equity's quiet tape is not a pipeline failure", () => {
  it("TSLA overnight with a six-hour-quiet tape reads SESSION CLOSED — LAST VERIFIED with the overnight detail", () => {
    const s = standing("TSLA", "alpaca");
    expect(s.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(s.label).not.toBe(L.STALE_PIPELINE);
    expect(s.detail).toContain("overnight");
  });

  it("the owner says closed (sessionOpen === false) for the equity and leaves futures open-unknown", () => {
    expect(quoteSessionClosure("TSLA", new Date(WED_2215_ET)).sessionOpen).toBe(false);
    expect(quoteSessionClosure("NQ1!", new Date(WED_2215_ET)).sessionOpen).toBeNull();
  });

  it("control: NQ1! at the same instant (Globex open) with the same quiet tape still reads STALE PIPELINE", () => {
    const s = standing("NQ1!", "tastytrade");
    expect(s.label).toBe(L.STALE_PIPELINE);
  });
});

import { resolveChartSurfaceBadge } from "@/lib/priceSource";

describe("the symbol-row badge reads the same owner", () => {
  it("TSLA overnight, stale tape: SESSION CLOSED — LAST VERIFIED; NQ1! open: not closed", () => {
    const t = resolveChartSurfaceBadge("alpaca", true, true, quoteSessionClosure("TSLA", new Date(WED_2215_ET)).sessionOpen, { present: true, fresh: false, ageMs: SIX_HOURS }, true);
    expect(t.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    const n = resolveChartSurfaceBadge("tastytrade", true, true, quoteSessionClosure("NQ1!", new Date(WED_2215_ET)).sessionOpen, { present: true, fresh: false, ageMs: SIX_HOURS }, true);
    expect(n.label).not.toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  });
});
