/**
 * Garden 18 §4 (2026-10-06) — /paper: "ACTIVE DEGRADED with an old
 * observation; visible simulation balance and ticket controls are not proof
 * that simulated orders work."
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAPER_DELAYED_QUOTE_MAX_AGE_MS, type PaperQuoteReadiness } from "../marketData/viewModels/selectPaperQuoteReadiness";
import { PAPER_TICKET_PROTECTION_NOTE, paperQuoteAgeVerdict, selectPaperTicketPreflight } from "./paperTicketPreflight";
import { selectProfileTileTrades } from "../profile/traderPerformanceStats";
import { hasResolvedTradeOutcome } from "../tradeEvidence";
import { selectPaperWinRate } from "../paperTradeOutcome";

const T0 = 1_800_000_000_000;
// Accepted at fetch time 14m50s after observation — ACTIVE DEGRADED, actionable.
const ready: PaperQuoteReadiness = {
  status: "DELAYED", actionable: true, price: 100, observedAt: T0, availableAt: T0, receivedAt: T0,
  ageMs: 14 * 60_000 + 50_000, label: "ACTIVE DEGRADED", reason: "",
};
const base = { readiness: ready, type: "market" as const, side: "buy" as const, qty: 1, wholeContracts: false, limitRaw: "", stopRaw: "", multiplier: 1, cash: 100_000 };
const PAGE = readFileSync(path.resolve(__dirname, "../../app/paper/page.tsx"), "utf8");

describe("quote-age policy re-measured at the press and the fill", () => {
  it("THE DEFECT: a quote accepted at 14m50s is refused at 15m10s, naming age and limit", () => {
    expect(paperQuoteAgeVerdict(ready, T0 + 14 * 60_000 + 50_000).fresh).toBe(true);
    const v = paperQuoteAgeVerdict(ready, T0 + 15 * 60_000 + 10_000);
    expect(v.fresh).toBe(false);
    if (!v.fresh) expect(v.reason).toBe("Quote is 15m 10s old — over the 15m simulation limit, so no simulated fill until a newer quote arrives.");
    expect(PAPER_DELAYED_QUOTE_MAX_AGE_MS).toBe(15 * 60_000);
  });
  it("unknown age is never fresh", () => {
    expect(paperQuoteAgeVerdict({ ...ready, observedAt: null }, T0).fresh).toBe(false);
    expect(paperQuoteAgeVerdict(undefined, T0).fresh).toBe(false);
  });
  it("the fill loop, the order handler and option opens all ask the age verdict at Date.now()", () => {
    expect(PAGE).toContain("if (!paperQuoteAgeVerdict(readiness, Date.now()).fresh) continue;");
    expect(PAGE).toContain("if (!paperQuoteAgeVerdict(quoteReadiness[ord.symbol], Date.now()).fresh) return;");
    expect(PAGE).toContain("const optAge = paperQuoteAgeVerdict(quoteReadiness[p.underlying], Date.now());");
  });
});

describe("the simulated send button enables only after every pre-send check", () => {
  it("ready on a fresh quote with a valid, fundable market order", () => {
    expect(selectPaperTicketPreflight({ ...base, nowMs: T0 + 60_000 }).ready).toBe(true);
  });
  it("blocks — in words — a missing limit, a fractional contract and an unfundable buy", () => {
    const p = selectPaperTicketPreflight({ ...base, nowMs: T0 + 60_000, type: "limit", qty: 1.5, wholeContracts: true, multiplier: 20 });
    expect(p.ready).toBe(false);
    expect(p.blockers.join(" ")).toMatch(/whole contracts/);
    expect(p.blockers.join(" ")).toMatch(/Enter a limit price/);
    const f = selectPaperTicketPreflight({ ...base, nowMs: T0 + 60_000, qty: 5_000, multiplier: 1, cash: 100_000 });
    expect(f.blockers.join(" ")).toMatch(/Insufficient cash/);
    const u = selectPaperTicketPreflight({ ...base, nowMs: T0 + 60_000, cash: null });
    expect(u.blockers.join(" ")).toMatch(/cash is unreadable/);
  });
  it("blocks an unsupported order type and a stale quote", () => {
    expect(selectPaperTicketPreflight({ ...base, nowMs: T0, type: "trailing" as never }).blockers.join(" ")).toMatch(/not supported/);
    expect(selectPaperTicketPreflight({ ...base, nowMs: T0 + 20 * 60_000 }).blockers.join(" ")).toMatch(/over the 15m simulation limit/);
  });
  it("the page wires the button to the preflight, re-checks at the press, and passes cash", () => {
    expect(PAGE).toContain("disabled={!readiness.actionable || !preflight.ready}");
    expect(PAGE).toContain("if (!pressPreflight.ready) return;");
    expect(PAGE).toContain("cash={bookRecoveryRequired ? null : cash}");
  });
});

describe("protection is disclosed, a bracket/OCO is never implied", () => {
  it("the ticket says it sends one order with no bracket and no OCO", () => {
    expect(PAPER_TICKET_PROTECTION_NOTE).toMatch(/No bracket is attached and there is no OCO/);
    expect(PAGE).toContain("{preflight.protectionNote}");
  });
  it("no paper surface claims a bracket or OCO exists", () => {
    const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(code).not.toMatch(/\b(bracket attached|OCO (active|linked|armed))\b/i);
  });
});

describe("simulation never mixed with the trader's own record", () => {
  it("profile tiles count the journal only and name the paper trades held out", () => {
    const j = { entryPrice: 10, exitPrice: 11, pnl: 100 };
    const split = selectProfileTileTrades([j], [{ entryPrice: 1, exitPrice: 2, pnl: 50 }, { entryPrice: 2, exitPrice: 1, pnl: -20 }] as never, hasResolvedTradeOutcome);
    expect(split.counted).toEqual([j]);
    expect(split.paperHeldOut).toBe(2);
    expect(split.note).toMatch(/never mixed with your journal/);
    const prof = readFileSync(path.resolve(__dirname, "../../app/profile/page.tsx"), "utf8");
    expect(prof).not.toContain("[...journalEntries, ...paperTrades]");
    expect(prof).toContain('source: "PAPER" as const');
  });
  it("the paper masthead says PAPER · NO REAL MONEY · NO BROKER", () => {
    expect(PAGE).toContain("PAPER · NO REAL MONEY · NO BROKER");
  });
  it("zero closed paper trades → win rate undefined, not 0%", () => {
    expect(selectPaperWinRate([]).pct).toBeNull();
  });
});

import { compileOrderPurpose, purposeSentence, TICKET_PURPOSES } from "../orderPurpose";

describe("Flatten says what it does", () => {
  it("FLATTEN_EVERYTHING compiles one closing order for one position, and is named for exactly that", () => {
    expect(purposeSentence("FLATTEN_EVERYTHING")).toBe("Flatten this position.");
    const r = compileOrderPurpose({
      purpose: "FLATTEN_EVERYTHING", positionSide: "long", qty: 2,
      capabilities: { orderTypes: ["market", "limit", "stop", "stop-limit"] },
    } as never);
    expect(r.status).toBe("COMPILED");
    expect((r as { sentence: string }).sentence).toBe("Flatten this position.");
  });
  it("the /paper ticket does not offer it (the ticket cannot see the book)", () => {
    expect(TICKET_PURPOSES).not.toContain("FLATTEN_EVERYTHING");
  });
});

describe("ticket send bar is never parked below the fold (geometry proved 2026-10-06 at 1920×784, 1440×900, 390×844)", () => {
  const CSS = readFileSync(path.resolve(__dirname, "../../app/paper/paper.module.css"), "utf8");
  it("verdict list, protection note and button live in one sticky send bar", () => {
    expect(PAGE).toContain('<div className={clsx(styles.sendBar, "bg-wm-dark")} data-testid="paper-ticket-send-bar">');
    expect(CSS).toMatch(/\.sendBar \{\s*position: sticky;\s*bottom: 0;/);
  });
  it("short desktop: body and ticket stop being dead scroll containers so the bar binds to the page scroller", () => {
    expect(CSS).toMatch(/\(min-width: 768px\) and \(max-height: 900px\) \{\s*\.body \{\s*overflow: visible !important;\s*\}\s*\.ticket \{\s*overflow: visible !important;/);
  });
  it("phone: the page is out of flow and scrolls itself (the shell holds <body> at overflow:hidden)", () => {
    expect(CSS).toMatch(/\.page \{\s*position: absolute !important;\s*inset: 0;\s*height: auto !important;\s*min-height: 0 !important;\s*overflow-y: auto !important;/);
    expect(CSS).not.toMatch(/\.page \{\s*height: auto !important;\s*min-height: 100%;/);
  });
});
