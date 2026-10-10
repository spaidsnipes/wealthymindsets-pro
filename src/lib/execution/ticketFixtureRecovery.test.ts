/**
 * RECOVERY SCENES (order §G, 2026-10-10) — proof-scene only, nothing sent. The ticket's book must be honest when:
 *   rejected — the broker REJECTED the order: its reason is quoted verbatim; nothing is claimed filled;
 *   stale    — the readback is old and the last read failed: RECONCILING everywhere, no fill or P&L claimed;
 *   partial  — PARTIALLY FILLED: filled qty and still-working qty are both said; the position is only what is held.
 */
import { describe, expect, it } from "vitest";

import { ticketBook } from "./ticketBook";
import { parseTicketFixture, TICKET_FIXTURE_REJECT_REASON, ticketFixtureLines } from "./ticketFixture";

const NOW = 1_800_000_000_000;
const gate = { killSwitch: false, limitsSet: true, proofRefusal: "PROOF SCENE · nothing can be sent" };
const book = (state: string) => {
  const fx = parseTicketFixture(`?scene=ticket-fixture&side=buy&state=${state}`)!;
  expect(fx).not.toBeNull();
  const lines = ticketFixtureLines(fx, "/MNQZ6", 21000, 2, NOW);
  return { lines, book: ticketBook(lines, "/MNQZ6", gate) };
};

describe("state=rejected", () => {
  it("quotes the broker's reason verbatim and claims no fill or position", () => {
    const { lines, book: b } = book("rejected");
    expect(b.rejected?.brokerReason).toBe(TICKET_FIXTURE_REJECT_REASON);
    expect(b.rejected?.words).toMatch(/^REJECTED by tastytrade · #9000002 · Buy to Open 1 \/MNQZ6 @ 21000 · nothing was filled$/);
    expect(b.position.state).toBe("FLAT");
    expect(b.working).toHaveLength(0);
    expect(lines.lines).toHaveLength(0);
  });
});

describe("state=stale", () => {
  it("reads RECONCILING: the last-read position is named as old, no P&L, working rows marked", () => {
    const { lines, book: b } = book("stale");
    expect(lines.readback).toBe("STALE");
    expect(b.position.state).toBe("RECONCILING");
    expect(b.position.words).toMatch(/RECONCILING · tastytrade has not answered recently \(last read LONG 1 @ 21000/);
    expect(lines.position?.pnlUsd).toBeNull();
    expect(lines.lines.every(l => l.status === "RECONCILING")).toBe(true);
    expect(b.working.every(w => /RECONCILING$/.test(w.words))).toBe(true);
    expect(b.flatten.state).toBe("REFUSED");
  });
});

describe("state=partial", () => {
  it("says filled and still-working quantities; holds only what was filled", () => {
    const { lines, book: b } = book("partial");
    expect(b.working).toHaveLength(1);
    expect(b.working[0]!.words).toContain("filled 1 of 3 · 2 still working");
    expect(b.position.state).toBe("HOLDING");
    expect(b.position.words).toMatch(/^LONG 1 \/MNQZ6 @ 21000/);
    expect(lines.lines.find(l => l.role === "WORKING")?.status).toBe("PARTIALLY_FILLED");
  });
});

describe("every recovery scene still sends nothing", () => {
  it("cancel and flatten are refused at the control in all three", () => {
    for (const s of ["rejected", "stale", "partial"]) {
      const { book: b } = book(s);
      for (const w of b.working) expect(w.cancel.allowed).toBe(false);
      expect(b.flatten.state === "LOADABLE").toBe(false);
    }
  });
});
