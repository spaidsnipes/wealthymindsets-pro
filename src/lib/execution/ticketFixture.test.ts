/** scene=ticket-fixture — the SAMPLE book the trade ticket is fed on a proof scene. Pure; through the real selector. */
import { describe, expect, it } from "vitest";

import { PROOF_SCENE_REFUSAL, railSendGate } from "@/lib/broker/railSendGate";
import { NO_PROOF_SCENE, parseProofScene, proofFixtureScene } from "@/lib/chart/proofScene";
import { ticketBook } from "./ticketBook";
import { parseTicketFixture, TICKET_FIXTURE_BANNER, TICKET_FIXTURE_TAIL, ticketFixtureChartLines, ticketFixtureLines, ticketFixtureReadback } from "./ticketFixture";
import { readFileSync } from "node:fs";
import path from "node:path";

const NOW = Date.parse("2026-10-09T05:00:00Z");
const C = "/NQZ6";
const gate = { killSwitch: false, limitsSet: true, proofRefusal: railSendGate("PROOF_SCENE", "tastytrade").reason };
const bookOf = (state: "flat" | "holding" | "working" | "inflight" | "noquote", side: "BUY" | "SELL" = "BUY") => ticketBook(ticketFixtureLines({ side, state }, C, 31_000, 20, NOW), C, gate);

describe("parseTicketFixture", () => {
  it("needs the token AND a side; the state defaults to flat; unknown values are no scene", () => {
    expect(parseTicketFixture("?scene=ticket-fixture&side=buy")).toEqual({ side: "BUY", state: "flat" });
    expect(parseTicketFixture("?scene=ticket-fixture&side=SELL&state=Working")).toEqual({ side: "SELL", state: "working" });
    expect(parseTicketFixture("?scene=ticket-fixture&side=buy&state=inflight")).toEqual({ side: "BUY", state: "inflight" });
    expect(parseTicketFixture("?scene=ticket-fixture")).toBeNull();
    expect(parseTicketFixture("?scene=ticket-fixture&side=hold")).toBeNull();
    expect(parseTicketFixture("?scene=ticket-fixture&side=buy&state=filled")).toBeNull();
    expect(parseTicketFixture("?scene=clean&side=buy")).toBeNull();
    expect(parseTicketFixture("?side=buy&state=holding")).toBeNull();
    expect(parseTicketFixture("")).toBeNull();
  });
  it("the token is a page fixture scene in the one owner, and not a chart clean scene", () => {
    expect(proofFixtureScene("?scene=ticket-fixture&side=buy")).toBe("ticket-fixture");
    expect(parseProofScene("?scene=ticket-fixture&side=buy")).toEqual(NO_PROOF_SCENE);
  });
  it("the banner says sample, not the account, nothing sent", () => {
    expect(TICKET_FIXTURE_BANNER).toBe("PROOF SCENE — sample book, not your account · nothing can be sent");
  });
});

describe("the sample readback, per state", () => {
  it("flat: read, nothing held, nothing working; the tail cannot be mistaken for an account", () => {
    const rb = ticketFixtureReadback({ side: "BUY", state: "flat" }, C, 31_000, NOW);
    expect(rb).toMatchObject({ ok: true, asOfMs: NOW, positions: [], orders: [], tails: [TICKET_FIXTURE_TAIL] });
    expect(TICKET_FIXTURE_TAIL).not.toMatch(/^\d{4}$/);
    expect(bookOf("flat").position.state).toBe("FLAT");
    expect(bookOf("flat").position.words).toMatch(/^FLAT · 0 working · read .+ from …SMPL$/);
  });
  it("holding: a position in the picked side's direction, UNPROTECTED, no working order", () => {
    const b = bookOf("holding");
    expect(b.position).toMatchObject({ state: "HOLDING", protection: "UNPROTECTED" });
    expect(b.position.words).toMatch(/^LONG 1 \/NQZ6 @ 31000 · UNPROTECTED/);
    expect(b.working).toEqual([]);
    expect(bookOf("holding", "SELL").position.words).toMatch(/^SHORT 1 \/NQZ6 @ 31000/);
  });
  it("working / inflight: the same position WITH a working protective stop → PROTECTED and one working-order row", () => {
    for (const st of ["working", "inflight"] as const) {
      const b = bookOf(st);
      expect(b.position, st).toMatchObject({ state: "HOLDING", protection: "PROTECTED" });
      expect(b.working, st).toHaveLength(1);
      expect(b.working[0].words, st).toBe("WORKING at tastytrade · #9000001 · Sell to Close 1 /NQZ6 · trigger 30845");
      expect(b.working[0].tail, st).toBe("SMPL");
    }
    expect(bookOf("working", "SELL").working[0].words).toContain("Buy to Close 1 /NQZ6 · trigger 31155");
  });
  it("noquote: the book is flat (the missing quote is the ticket's part, not the book's)", () => {
    expect(parseTicketFixture("?scene=ticket-fixture&side=buy&state=noquote")).toEqual({ side: "BUY", state: "noquote" });
    const rb = ticketFixtureReadback({ side: "BUY", state: "noquote" }, C, 31_000, NOW);
    expect(rb).toMatchObject({ positions: [], orders: [] });
    expect(bookOf("noquote").position.state).toBe("FLAT");
  });
  it("no reference price → 100, never NaN", () => {
    expect(ticketFixtureReadback({ side: "BUY", state: "holding" }, C, null, NOW).positions[0].averageOpenPrice).toBe(100);
    expect(ticketFixtureReadback({ side: "BUY", state: "holding" }, C, Number.NaN, NOW).positions[0].averageOpenPrice).toBe(100);
  });
});

describe("every cancel / modify / flatten in the scene is refused AT the control with the one reason", () => {
  it("the reason has one owner (railSendGate)", () => {
    expect(railSendGate("PROOF_SCENE", "tastytrade")).toEqual({ canSend: false, reason: PROOF_SCENE_REFUSAL });
    expect(PROOF_SCENE_REFUSAL).toBe("PROOF SCENE · nothing can be sent");
  });
  it("working order: Cancel not allowed, reason = the scene's; MODIFY refusal = the scene's", () => {
    const b = bookOf("working");
    expect(b.working[0].cancel).toEqual({ allowed: false, reason: PROOF_SCENE_REFUSAL });
    expect(b.modify.refusal).toBe(PROOF_SCENE_REFUSAL);
  });
  it("FLATTEN: REFUSED with the scene's reason while holding; nothing to flatten when flat", () => {
    expect(bookOf("holding").flatten).toMatchObject({ state: "REFUSED", refusal: PROOF_SCENE_REFUSAL });
    expect(bookOf("holding").flatten.plan).toEqual({ action: "Sell to Close", qty: 1, type: "Market", symbol: C });
    expect(bookOf("flat").flatten.state).toBe("NOTHING TO FLATTEN");
  });
  it("the scene's refusal outranks an open gate, a kill switch and unset limits alike", () => {
    for (const g of [{ killSwitch: true, limitsSet: true }, { killSwitch: false, limitsSet: false }, { killSwitch: false, limitsSet: true }]) {
      const b = ticketBook(ticketFixtureLines({ side: "BUY", state: "working" }, C, 31_000, 20, NOW), C, { ...g, proofRefusal: PROOF_SCENE_REFUSAL });
      expect([b.working[0].cancel.reason, b.modify.refusal, b.flatten.refusal]).toEqual([PROOF_SCENE_REFUSAL, PROOF_SCENE_REFUSAL, PROOF_SCENE_REFUSAL]);
    }
  });
});

describe("the sample book on the CHART (Sheriff: fixture state=working showed one line for two things)", () => {
  const R = (state: "flat" | "holding" | "working") => ticketFixtureLines({ side: "BUY", state }, "/NQZ6", 21000, 20, 1_000);
  it("working → the position AND its resting stop, each labelled SAMPLE; holding → the position; flat → nothing", () => {
    const w = ticketFixtureChartLines(R("working"));
    expect(w.map(l => l.role).sort()).toEqual(["POSITION", "WORKING"]);
    expect(w.every(l => l.id.startsWith("sample-") && l.detail.startsWith("SAMPLE · "))).toBe(true);
    expect(w.find(l => l.role === "WORKING")!.detail).toMatch(/STOP/);
    expect(ticketFixtureChartLines(R("holding")).map(l => l.role)).toEqual(["POSITION"]);
    expect(ticketFixtureChartLines(R("flat"))).toEqual([]);
    expect(ticketFixtureChartLines(null)).toEqual([]);
  });
  it("the ticket publishes them under their own 'sample' publisher only in the scene", () => {
    const T = readFileSync(path.resolve(process.cwd(), "src/components/chart/TradePanel.tsx"), "utf8");
    expect(T.length).toBeGreaterThan(10000);
    expect(T).toContain('const sampleLinesKey = scene && contract ? JSON.stringify(ticketFixtureChartLines(broker)) : "[]";');
    expect(T).toContain('publishChartOrderLines("sample", symbol, JSON.parse(sampleLinesKey));');
  });
});
