/**
 * §30 — THE AUTHORIZED BROKER-HISTORY IMPORT, END TO END, OFFLINE (shift 2026-11-05).
 *
 * walk → normalize → dedupe → positions → summary → completeness, against a
 * recorded-shape Webull order-history fixture (Webull's own field names, as
 * measured 2026-10-02) served by a fake that reproduces every measured quirk:
 *   · multi-day windows answering ≥ SPLIT_AT rows SILENTLY TRUNCATE, and the
 *     cursor does not recover the rest;
 *   · rows come in client-order-id order, not time order;
 *   · end_date is EXCLUSIVE;
 *   · back-to-back reads draw HTTP 429 (backoff, never parallel walks);
 *   · older fills carry no fill time; fees itemised or unstated; ms or ISO times.
 * No network. No broker session. Nothing is written anywhere.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPLIT_AT, walkWebullHistory, type AccountWalk, type HistoryPage } from "./webullLedgerWalk";
import { ledgerCompletenessReport, EVIDENCE_KIND_LABEL } from "./ledgerCompleteness";

type Row = { client_order_id: string; combo_type: string; combo_order_id: string; orders: Record<string, unknown>[] };
let seq = 0;
/** One Webull order-history group. `at` is the placement instant (ISO); `filledAs` controls how the fill time is sent. */
function wb(o: {
  sym?: string; side: "BUY" | "SELL"; qty: number; px: number; at: string; status?: string;
  filledAs?: "iso" | "ms" | "none"; fees?: number[] | null; option?: { exp: string; strike: number; right: "CALL" | "PUT" }; id?: string;
}): Row {
  const id = o.id ?? `${(++seq).toString(16).padStart(24, "0")}`;
  const filled = (o.status ?? "FILLED") === "FILLED";
  const t = Date.parse(o.at);
  return {
    client_order_id: id, combo_type: "NORMAL", combo_order_id: `g${id}`,
    orders: [{
      order_id: `o${id}`, client_order_id: id, symbol: o.sym ?? "TSLA", side: o.side, status: o.status ?? "FILLED",
      instrument_type: o.option ? "OPTION" : "EQUITY", order_type: "LIMIT",
      total_quantity: String(o.qty), filled_quantity: filled ? String(o.qty) : "0", filled_price: filled ? String(o.px) : undefined,
      place_time_at: o.at,
      ...(filled && (o.filledAs ?? "iso") === "iso" ? { filled_time_at: o.at } : {}),
      ...(filled && o.filledAs === "ms" ? { filled_time: t } : {}),
      ...(o.fees === null ? {} : { fees: (o.fees ?? [0.01, 0.02]).map(v => ({ type: "REGULATORY_FEE", actual_value: String(v) })) }),
      legs: o.option ? [{ option_type: o.option.right, option_expire_date: o.option.exp, strike_price: String(o.option.strike), option_contract_multiplier: "100" }] : [],
    }],
  };
}

/** The fake Webull: measured truncation, id order, exclusive end, 429 on a schedule. */
function fakeWebull(rows: Row[], opts: { throttleEvery?: number } = {}) {
  const sorted = [...rows].sort((a, b) => b.client_order_id.localeCompare(a.client_order_id));
  let calls = 0, rawRowsServed = 0, throttled = 0;
  const page: HistoryPage = async (start, end, cursor) => {
    calls++;
    if (opts.throttleEvery && calls % opts.throttleEvery === 0) { throttled++; return { ok: false, payload: null, reason: "HTTP 429 TOO_MANY_REQUESTS" }; }
    const inWin = sorted.filter(g => { const d = String(g.orders[0].place_time_at).slice(0, 10); return d >= start && d < end; });
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
    if (cursor) return { ok: true, payload: [] };                       // the cursor recovers nothing (measured)
    const answer = days > 1 ? inWin.slice(0, SPLIT_AT) : inWin;         // multi-day windows truncate at the cap
    rawRowsServed += answer.length;
    return { ok: true, payload: answer };
  };
  return { page, stats: () => ({ calls, rawRowsServed, throttled }) };
}

const NOW = new Date("2026-11-05T23:30:00Z");
const NOOP = { sleep: async () => {} };

function ledgerFixture(): Row[] {
  seq = 0;
  const rows: Row[] = [];
  // A crowded October: 70 TSLA scalps (35 round trips) across 10 days — every month window truncates.
  for (let d = 0; d < 10; d++) for (let k = 0; k < 7; k++) {
    const day = String(6 + d).padStart(2, "0");
    rows.push(wb({ side: k % 2 === 0 ? "BUY" : "SELL", qty: 10, px: 440 + k, at: `2026-10-${day}T14:${String(10 + k * 5).padStart(2, "0")}:00Z` }));
  }
  // The 7th order on each day leaves +10 open → the day after's first BUY adds to it; balance at the end:
  // October: 40 BUY / 30 SELL of 10 → +100 shares held at the end of October.
  // A crossing fill: long 10, then SELL 30 → closes 10, opens SHORT 20; then BUY 20 closes it.
  rows.push(wb({ sym: "SPY", side: "BUY", qty: 10, px: 600, at: "2026-09-15T14:00:00Z" }));
  rows.push(wb({ sym: "SPY", side: "SELL", qty: 30, px: 602, at: "2026-09-15T15:00:00Z", filledAs: "ms" }));
  rows.push(wb({ sym: "SPY", side: "BUY", qty: 20, px: 601, at: "2026-09-16T15:00:00Z", fees: null }));
  // Old 2025 fills with NO fill time (placement stands in), and a cancelled order.
  rows.push(wb({ sym: "AAPL", side: "BUY", qty: 5, px: 200, at: "2025-03-03T15:00:00Z", filledAs: "none" }));
  rows.push(wb({ sym: "AAPL", side: "SELL", qty: 5, px: 210, at: "2025-03-04T15:00:00Z", filledAs: "none" }));
  rows.push(wb({ sym: "AAPL", side: "BUY", qty: 5, px: 199, at: "2025-03-05T15:00:00Z", status: "CANCELLED" }));
  // A long 0DTE call never closed in the history → UNSETTLED, excluded from realised P&L.
  rows.push(wb({ side: "BUY", qty: 2, px: 1.5, at: "2026-08-07T14:00:00Z", option: { exp: "2026-08-07", strike: 400, right: "CALL" } }));
  // A closed option round trip: multiplier 100.
  rows.push(wb({ side: "BUY", qty: 1, px: 2.0, at: "2026-08-10T14:00:00Z", option: { exp: "2026-08-21", strike: 410, right: "PUT" } }));
  rows.push(wb({ side: "SELL", qty: 1, px: 2.5, at: "2026-08-11T14:00:00Z", option: { exp: "2026-08-21", strike: 410, right: "PUT" } }));
  return rows;
}

async function importAccount(rows: Row[], id: string, throttleEvery?: number): Promise<{ walk: AccountWalk; raw: number; throttled: number }> {
  const { page, stats } = fakeWebull(rows, { throttleEvery });
  const walk = await walkWebullHistory(id, page, { today: NOW, ...NOOP });
  return { walk, raw: stats().rawRowsServed, throttled: stats().throttled };
}

describe("§30 broker-history import — end to end against the recorded-shape fixture", () => {
  it("pagination: every crowded window is halved until whole; every order is read despite truncation and 429s", async () => {
    const rows = ledgerFixture();
    const { walk, throttled } = await importAccount(rows, "ACCT0000RP2B", 7);
    expect(walk.orders).toHaveLength(rows.length);             // nothing lost to truncation
    expect(walk.splits).toBeGreaterThan(0);                   // October (70 rows) was halved
    expect(throttled).toBeGreaterThan(0);
    expect(walk.throttled).toBe(throttled);                   // every 429 absorbed by the backoff, counted
    expect(walk.dayWindowsAtCap ?? []).toEqual([]);            // no single day reached the cap
    expect(walk.stoppedBecause).toBe("QUIET_YEARS");
  });

  it("dedupe, fees, timezones, fills and positions — then the completeness report", async () => {
    const rows = ledgerFixture();
    const { walk, raw } = await importAccount(rows, "ACCT0000RP2B");
    const r = ledgerCompletenessReport({ walks: [walk], rowsRead: raw, nowMs: NOW.getTime(), savedModelMarks: null });

    // Evidence kind is stated and is executed history only.
    expect(r.kind).toBe("EXECUTED_HISTORY");
    expect(r.kindLabel).toBe(EVIDENCE_KIND_LABEL.EXECUTED_HISTORY);
    // Dedupe: overlapping windows re-served rows; the unique count is the fixture.
    expect(r.uniqueOrders).toBe(rows.length);
    expect(r.rowsRead).toBeGreaterThan(r.uniqueOrders);
    expect(r.duplicatesRemoved).toBe(r.rowsRead - r.uniqueOrders);
    expect(r.byStatus).toEqual({ FILLED: rows.length - 1, CANCELLED: 1 });
    // Fills: 2 without a fill time; 1 with fees UNREPORTED; stated fees summed to the cent.
    expect(r.filledOrders).toBe(rows.length - 1);
    expect(r.fillTimeMissing).toBe(2);
    expect(r.feesUnreported).toBe(1);
    expect(r.feesReportedTotal).toBeCloseTo((rows.length - 2) * 0.03, 2);
    // Timezones: ms and ISO fill times land on the same UTC instant format; months are New York months.
    expect(r.timezone).toBe("UTC instants · America/New_York months");
    expect(r.summary.firstFillAt).toBe("2025-03-03T15:00:00.000Z");
    // Positions.
    const spy = r.summary.bySymbol.find(b => b.key === "SPY")!;
    expect(spy.trades).toBe(2);                                // long 10 closed by the crossing sell, short 20 closed by the buy
    // long 10 × (602−600) = +20 ; short 20 × (602−601) = +20 → gross +40
    expect(r.summary.byMonth.find(b => b.key === "2026-09")!.trades).toBe(2);
    expect(r.positions.unsettled).toBe(1);                     // the 0DTE call — not in realised P&L
    expect(r.positions.heldAtEnd).toContainEqual(expect.objectContaining({ instrumentKey: "TSLA", direction: "LONG", quantity: 100, label: "OPEN" }));
    expect(r.positions.heldAtEnd).toContainEqual(expect.objectContaining({ instrumentKey: "TSLA 2026-08-07 400C", label: "UNSETTLED", quantity: 2 }));
    // The closed put round trip: (2.50 − 2.00) × 1 × multiplier 100 = +$50 gross.
    expect(r.summary.gross).toBeGreaterThan(0);
    // Completeness.
    expect(r.verdict).toBe("COMPLETE_FOR_WINDOW_READ");
    expect(r.accounts[0].accountTail).toBe("·RP2B");
    expect(r.accounts[0].coverage).toMatch(/^read \d+ days of history, back to 2023-01-01 \(today included\) · stopped: two quiet years/);
    // Models: none saved → UNAVAILABLE, never inferred.
    expect(r.models.state).toBe("UNAVAILABLE");
    expect(r.lines.join("\n")).toMatch(/models: UNAVAILABLE — No Model 1 \/ Model 2 marks are saved/);
    expect(r.lines[0]).toMatch(/never 'since the account opened'/);
  });

  it("a single day that still answers SPLIT_AT+ rows is flagged INCOMPLETE (rests on a cursor measured not to recover)", async () => {
    seq = 0;
    const crowded = Array.from({ length: SPLIT_AT + 5 }, (_, i) => wb({ side: i % 2 ? "SELL" : "BUY", qty: 1, px: 100, at: `2026-10-20T14:${String(i % 60).padStart(2, "0")}:00Z` }));
    const { page } = fakeWebull(crowded);
    // A fake that truncates even ONE-day windows at the cap: the true worst case.
    const capped: HistoryPage = async (s, e, c) => { const r = await page(s, e, c); return { ...r, payload: Array.isArray(r.payload) ? r.payload.slice(0, SPLIT_AT) : r.payload }; };
    const walk = await walkWebullHistory("ACCT0000OS5B", capped, { today: NOW, ...NOOP });
    const r = ledgerCompletenessReport({ walks: [walk], nowMs: NOW.getTime(), savedModelMarks: null });
    expect(walk.dayWindowsAtCap).toContain("2026-10-20");
    expect(r.verdict).toBe("INCOMPLETE");
    expect(r.accounts[0].gaps.join(" ")).toMatch(/2026-10-20: a one-day window still answered 30\+ rows/);
  });

  it("a refusal mid-walk is INCOMPLETE with Webull's reason, and older history is said NOT read", async () => {
    const page: HistoryPage = async () => ({ ok: false, payload: null, reason: "HTTP 401 TOKEN_EXPIRED" });
    const walk = await walkWebullHistory("ACCT0000D6PA", page, { today: NOW, ...NOOP });
    const r = ledgerCompletenessReport({ walks: [walk], nowMs: NOW.getTime(), savedModelMarks: null });
    expect(r.verdict).toBe("INCOMPLETE");
    expect(r.accounts[0].coverage).toMatch(/older history NOT read/);
  });

  it("Model 1 / 2 come only from SAVED marks", async () => {
    const rows = ledgerFixture();
    const { walk } = await importAccount(rows, "ACCT0000RP2B");
    const base = ledgerCompletenessReport({ walks: [walk], nowMs: NOW.getTime(), savedModelMarks: null });
    // Saved marks that touch no closed round trip → still UNAVAILABLE.
    const stray = ledgerCompletenessReport({ walks: [walk], nowMs: NOW.getTime(), savedModelMarks: { "not-an-episode": "M1" } });
    expect(stray.models.state).toBe("UNAVAILABLE");
    // A real saved mark on a closed SPY round trip → results from that mark only.
    expect(base.models.state).toBe("UNAVAILABLE");
    const { reconstructEpisodes, dedupeOrders } = await import("./webullLedger");
    const closedSpy = reconstructEpisodes(dedupeOrders(walk.orders), NOW.getTime()).find(e => e.symbol === "SPY" && e.closedAt)!;
    const marked = ledgerCompletenessReport({ walks: [walk], nowMs: NOW.getTime(), savedModelMarks: { [closedSpy.id]: "M1" } });
    expect(marked.models).toMatchObject({ state: "FROM_SAVED_MARKS", marked: 1 });
    if (marked.models.state === "FROM_SAVED_MARKS") expect(marked.models.rows.map(x => x.model)).toEqual(["M1"]);
  });

  it("replay, simulation and backtest input is refused — the kinds are never mixed", () => {
    for (const kind of ["REPLAY", "SIMULATION", "BACKTEST"] as const) {
      expect(() => ledgerCompletenessReport({ walks: [], nowMs: NOW.getTime(), savedModelMarks: null, kind })).toThrow(/EXECUTED_HISTORY only/);
    }
  });
});

describe("§30 on the screen — the Broker Ledger reads the one report owner", () => {
  it("the route returns the walk's completeness evidence", () => {
    const route = readFileSync("src/app/api/broker/webull/ledger/route.ts", "utf8");
    for (const f of ["splits: w.splits", "throttled: w.throttled", "dayWindowsAtCap: w.dayWindowsAtCap", "windows: w.windows"]) expect(route).toContain(f);
  });
  it("WebullLifetimeLedger renders verdict, gaps, duplicates, unreported fees and the Model 1/2 state from ledgerCompletenessReport", () => {
    const ui = readFileSync("src/components/journal/WebullLifetimeLedger.tsx", "utf8");
    expect(ui).toContain("ledgerCompletenessReport({");
    for (const id of ["ledger-completeness", "ledger-completeness-gaps", "ledger-completeness-orders", "ledger-completeness-fills", "ledger-completeness-models"]) expect(ui).toContain(`data-testid="${id}"`);
    expect(ui).toMatch(/duplicates removed/);
    expect(ui).toMatch(/fees UNREPORTED \(not \$0\)/);
    expect(ui).toMatch(/UNAVAILABLE<\/b> — \{r\.models\.why\}/);
    // Saved marks only — the page reads the trader's own key, nothing else.
    expect(ui).toContain("parseModels(window.localStorage.getItem(EPISODE_MODELS_KEY))");
  });
});
