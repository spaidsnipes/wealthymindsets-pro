/**
 * /api/yahoo?type=quote — a price is an OBSERVATION or an ABSENCE, never a zero.
 *
 * The defect: Yahoo answers for listings it holds but has no quote for with
 * `meta` present and every price field zero or absent. The route's guard asked
 * `!meta && !livePrice` — "did Yahoo answer" — which such a payload passes, and
 * the price chain terminated in `|| 0`. So the route shipped a price of 0 and,
 * against the real `chartPreviousClose` that arrived in the same payload,
 * `change: -0.0024, changePct: -100`. A total wipeout the market never had.
 *
 * These assert the ROUTE'S OUTPUT, not its source text. A test that greps the
 * handler for `!== 0` would pass on a file that no longer computes anything.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

/**
 * The real BRETT-USD daily `meta`, recorded 2026-09-05. `previousClose` is
 * genuinely absent, `regularMarketPrice` is Yahoo's zero, and
 * `chartPreviousClose` is a real number — that combination is what turned an
 * absence into a −100%.
 */
const BRETT_META = {
  regularMarketPrice: 0,
  chartPreviousClose: 0.0023591456,
} as const;

type Chart = Record<string, unknown>;

function chart(meta: Record<string, unknown>, closes: (number | null)[] = [], timestamps: number[] = []): Chart {
  return {
    chart: {
      result: [{
        meta,
        timestamp: timestamps,
        indicators: { quote: [{ close: closes, open: [], high: [], low: [], volume: [] }] },
      }],
    },
  };
}

/** Serves the route's two chart calls; `null` makes that call fail the way a real outage does. */
function stubYahoo(daily: Chart | null, intraday: Chart | null): void {
  vi.stubGlobal("fetch", async (url: string) => {
    const body = String(url).includes("interval=1m") ? intraday : daily;
    if (body == null) return { ok: false, status: 502, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  });
}

/**
 * A distinct symbol per test on purpose: the route memoizes by request URL in a
 * module-level cache that outlives a single `it`.
 */
async function quote(sym: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await GET(new Request(`http://wm.test/api/yahoo?sym=${encodeURIComponent(sym)}&type=quote`));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

afterEach(() => vi.unstubAllGlobals());

describe("/api/yahoo quote — an answer is not a price", () => {
  it("PROOF the fixture really reproduces the defect, so nothing below passes vacuously", () => {
    // The pre-fix arithmetic, run on the same numbers. Without this the suite is
    // inert — a payload that never produced a fabricated change would satisfy
    // every assertion here while guarding nothing at all.
    const meta: { regularMarketPrice: number; previousClose?: number; chartPreviousClose: number } = { ...BRETT_META };
    const oldPrice = 0 || meta.regularMarketPrice || meta.previousClose || 0;
    const oldPrevClose = meta.chartPreviousClose ?? meta.previousClose ?? oldPrice;

    expect(oldPrice).toBe(0);
    expect(oldPrevClose).toBeGreaterThan(0);
    expect(+(((oldPrice - oldPrevClose) / oldPrevClose) * 100).toFixed(4)).toBe(-100);
  });

  it("THE CORE REGRESSION: meta present with no price is an absence, not a price of zero", async () => {
    stubYahoo(chart(BRETT_META), null);
    const { status, body } = await quote("BRETTA");

    expect(status).toBe(404);
    expect(body.price).toBeUndefined();
  });

  it("THE FABRICATED WIPEOUT: an unpriced symbol ships no change fields at all", async () => {
    // Separate from the status check because 404-with-a-body would still put a
    // −100% on the wire for any consumer that reads the payload before the code.
    stubYahoo(chart(BRETT_META), null);
    const { body } = await quote("BRETTB");

    expect(body.change).toBeUndefined();
    expect(body.changePct).toBeUndefined();
    expect(body.prevClose).toBeUndefined();
  });

  it("no answer at all is still an absence", async () => {
    // What the removed `!meta && !livePrice` guard used to catch on its own. It
    // is subsumed now, not abandoned.
    stubYahoo(null, null);
    const { status, body } = await quote("OUTAGEA");

    expect(status).toBe(404);
    expect(body.price).toBeUndefined();
  });

  it("a negative settlement is an observation and still resolves", async () => {
    // The reason the guard reads `!== 0` and not `> 0`. CL settled at -$37.63 on
    // 2020-04-20; the chain it replaced passed that through, and a fix that
    // started rejecting it would be a new defect wearing the fix's clothes.
    stubYahoo(chart({ regularMarketPrice: -37.63 }, [20.5, 18.2]), null);
    const { status, body } = await quote("CRUDEA");

    expect(status).toBe(200);
    expect(body.price).toBe(-37.63);
  });

  it("the chain walks PAST Yahoo's zero rather than stopping at it", async () => {
    // `regularMarketPrice: 0` is an absence marker, not a verdict. A guard that
    // rejected the whole payload on seeing it would discard a real previousClose
    // sitting one field over.
    stubYahoo(chart({ regularMarketPrice: 0, previousClose: 4.2 }), null);
    const { status, body } = await quote("STALEA");

    expect(status).toBe(200);
    expect(body.price).toBe(4.2);
  });

  it("meta still answers when there is no intraday series", async () => {
    stubYahoo(chart({ regularMarketPrice: 10.25 }, [9.5, 10.1]), null);
    const { status, body } = await quote("METAONLYA");

    expect(status).toBe(200);
    expect(body.price).toBe(10.25);
    expect(body.prevClose).toBe(9.5);
  });

  it("a live intraday print still outranks stale regular-market meta", async () => {
    // Negative control on the rewrite: the preference order is the point of the
    // whole quote path and must not have been reshuffled while adding a guard.
    stubYahoo(
      chart({ regularMarketPrice: 10 }, [9.5, 10.1]),
      chart({}, [null, 12.5], [1_757_000_000, 1_757_000_060]),
    );
    const { status, body } = await quote("LIVEA");

    expect(status).toBe(200);
    expect(body.price).toBe(12.5);
  });
});
