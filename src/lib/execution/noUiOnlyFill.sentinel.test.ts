/**
 * §23 SENTINEL — NO UI-ONLY FILL ANYWHERE ON THE TICKET PATH (Garden 19, 2026-10-08).
 *
 * A fill, a working order, a cancel or a position is a fact only when the BROKER reads it back.
 * The ticket may never say FILLED / WORKING / CANCELED / a position because it sent something,
 * pressed something, or timed out. This sentinel reads the ticket path's source and fails if:
 *   · any file writes a settled broker state as a literal into ticket state;
 *   · a state word reaches the trader other than through the lifecycle's words;
 *   · the cancel handler invents its ack instead of reading the broker's answer;
 *   · the book rows read anything but the broker readback;
 *   · the ticket path opens a second road to order-submit.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { stepLiveOrder } from "./liveOrderLifecycle";

const SRC = path.resolve(__dirname, "../..");
const read = (f: string) => readFileSync(path.join(SRC, f), "utf8");
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const TICKET_PATH = [
  "components/chart/TradePanel.tsx",
  "components/chart/TicketBookRows.tsx",
  "components/chart/TastytradeLiveOrder.tsx",
  "lib/execution/ticketBook.ts",
  "lib/execution/ticketTruth.ts",
  "lib/execution/brokerOrderLines.ts",
  "lib/execution/useBrokerChartLines.ts",
];
const SETTLED = ["FILLED", "PARTIALLY FILLED", "PARTIALLY_FILLED", "WORKING", "CANCELED", "ACKNOWLEDGED"];

describe("no UI-only fill on the ticket path", () => {
  it("the path is read (vacuity guard)", () => {
    for (const f of TICKET_PATH) expect(code(f).length, f).toBeGreaterThan(1_000);
  });

  it("no file sets a settled broker state as a literal into state (setOrder / setPhase / setCancelAcks / step)", () => {
    for (const f of TICKET_PATH) {
      const c = code(f);
      for (const s of SETTLED) {
        expect(c, `${f}: state literal "${s}" written into ticket state`).not.toMatch(new RegExp(`set(?:Order|Phase|EntryPhase|CancelAcks|Answer)\\([^;]*state:\\s*"${s}"`));
        expect(c, `${f}: step({ type: "${s}" })`).not.toMatch(new RegExp(`step\\(\\{\\s*type:\\s*"${s}"`));
      }
    }
  });

  it("the lifecycle reaches FILLED / WORKING / CANCELED only through a broker READBACK event", () => {
    // Every non-readback event, from every pre-send and in-flight phase, must not land on a settled phase.
    const phases = ["DISARMED", "STAGED", "PREVIEWING", "PREVIEWED", "REFUSED", "CONFIRMING", "SUBMITTING", "UNKNOWN", "RECONCILING"] as const;
    const events = [{ type: "PREVIEW" }, { type: "PREVIEW_OK" }, { type: "CONFIRM" }, { type: "BACK" }, { type: "SEND" }, { type: "TIMEOUT" }, { type: "RECONCILE" }, { type: "CANCEL" }, { type: "REFUSE", reasons: ["x"] }] as const;
    let checked = 0;
    for (const p of phases) for (const e of events) {
      const next = stepLiveOrder(p, e as never).phase;
      checked++;
      expect(["FILLED", "PARTIALLY_FILLED", "WORKING", "CANCELED"], `${p} + ${e.type} → ${next}`).not.toContain(next);
    }
    expect(checked).toBeGreaterThan(60);
    // …and a READBACK with no order found is never a fill either.
    expect(["FILLED", "WORKING", "CANCELED"]).not.toContain(stepLiveOrder("RECONCILING", { type: "READBACK", order: null } as never).phase);
  });

  it("the ticket's cancel takes its words from the broker's answer (phaseOfBrokerState), and says 'may still be working' otherwise", () => {
    const t = code("components/chart/TradePanel.tsx");
    expect(t).toContain("const back = j?.order && typeof j.order.state === \"string\" ? (j.order as { state: WmOrderState }) : null;");
    expect(t).toContain("? { state: back.state, words: brokerStateWords(back) }");
    expect(t).toMatch(/the order may still be working/);
    expect(t).not.toMatch(/words:\s*"(?:CANCELED|Cancelled|Canceled)/);
    const b = code("lib/execution/ticketBook.ts");
    expect(b).toContain("PHASE_WORDS[phaseOfBrokerState(o.state)]");
  });

  it("the book rows are built from the broker readback and nothing else", () => {
    const b = code("lib/execution/ticketBook.ts");
    expect(b).toContain("export function ticketBook(broker: BrokerLinesResult | null");
    expect(b).not.toMatch(/fetch\(|useState|localStorage|sessionStorage|intent\b|entryPhase|sentTicket/);
    const t = code("components/chart/TradePanel.tsx");
    expect(t).toContain("const book = ticketBook(broker, contract?.symbol ?? null,");
    // The broker read is the book — except in the labelled proof scene, where a SAMPLE readback goes through the same selector.
    expect(t).toContain("const brokerRead = useBrokerChartLines({");
    expect(t).toContain("const broker = scene && contract ? ticketFixtureLines(scene, contract.symbol, mark ?? price, kind === \"FUTURE\" ? pointValue : 1, nowMs) : brokerRead;");
    // The position the ticket shows is never derived from the staged side or quantity.
    expect(t).not.toMatch(/position:\s*\{[^}]*side/);
    // The read itself now lives in ONE shared store (brokerReadbackStore) the hook selects from — read routes only.
    const hook = code("lib/execution/useBrokerChartLines.ts");
    expect(hook).toContain("useBrokerReadback(");
    expect(hook).not.toMatch(/fetch\(|method:\s*"(POST|DELETE|PUT|PATCH)"/);
    const store = code("lib/execution/brokerReadbackStore.ts");
    expect(store.match(/fetch\("\/api\/broker\/tastytrade\/(orders|positions)"/g) ?? []).toHaveLength(2);
    expect(store).not.toMatch(/method:\s*"(POST|DELETE|PUT|PATCH)"/);
  });

  it("FLATTEN and MODIFY never send: FLATTEN only loads the ticket; one road to order-submit", () => {
    const t = code("components/chart/TradePanel.tsx");
    // 2026-10-10 (one-trade lane): FLATTEN is one function, loadFlatten, shared by the book's Load FLATTEN and
    // the position strip's CLOSE request. It only loads the ticket (closing MARKET, held qty) and only when the
    // book says LOADABLE; the send stays behind preview, the server order gate and the trader's confirmation.
    expect(t).toContain("onFlatten={loadFlatten}");
    expect(t).toMatch(/function loadFlatten\(\) \{[\s\S]{0,400}setEntryType\("Market"\)/);
    expect(t).not.toContain("order-submit");
    expect(code("components/chart/TicketBookRows.tsx")).not.toMatch(/fetch\(|order-submit/);
    const submitters = TICKET_PATH.filter(f => code(f).includes("/api/broker/tastytrade/order-submit"));
    expect(submitters).toEqual(["components/chart/TastytradeLiveOrder.tsx"]);
    // The only DELETE on the ticket path is a cancel of an order id read back from the broker.
    const deletes = TICKET_PATH.filter(f => /method:\s*"DELETE"/.test(code(f)));
    expect(deletes.sort()).toEqual(["components/chart/TastytradeLiveOrder.tsx", "components/chart/TradePanel.tsx"]);
  });
});
