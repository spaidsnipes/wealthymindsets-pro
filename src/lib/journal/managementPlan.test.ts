import { describe, expect, it } from "vitest";

import {
  amendPlan, directionFromAction, effectivePlanAt, freezePlanSnapshot, parseManagementCondition,
  planSnapshotFromCapture, planSnapshotFromTicket, readPlanSnapshot,
} from "./managementPlan";
import type { FillCaptureIntent, JournalCaptureDraft } from "./journalCaptureFromFill";
import { appendPlanAmendment, freezePlanOnce, MANAGEMENT_PLAN_KEY, readPlanForDecision } from "./managementPlanStore";
import { rememberTicketAtSend } from "./ticketAtSendStore";

const T0 = Date.parse("2026-10-07T14:30:00Z");

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

const ticket: FillCaptureIntent = {
  decisionId: "wmd_abc123", view: "ORB long above VWAP", broker: "tastytrade", instrumentType: "Future", chartSymbol: "MNQ1!",
  action: "Buy to Open", qty: 1, orderType: "Limit", limitPx: 21400, protectiveStopPx: 21380, targetPx: 21450, sentAtMs: T0,
};

describe("§27 freeze — what the trader entered, nothing defaulted", () => {
  it("the ticket's own fields are RECORDED; everything else is UNRECORDED with a null value", () => {
    const s = planSnapshotFromTicket(ticket)!;
    expect(s.frozenAt).toBe("TICKET_SEND");
    expect(s.frozenAtMs).toBe(T0);
    expect(s.hindsightRisk).toBe(false);
    expect(s.base.direction.value).toBe("LONG");
    expect(s.base.entryPx.value).toBe(21400);
    expect(s.base.stopPx).toMatchObject({ value: 21380, state: "RECORDED" });
    expect(s.base.targetPx.value).toBe(21450);
    expect(s.base.thesis.value).toBe("ORB long above VWAP");
    for (const k of ["invalidation", "invalidationPx", "expectedHoldMin", "context", "riskUsd", "session"] as const) {
      expect(s.base[k]).toEqual({ value: null, state: "UNRECORDED", source: "not recorded" });
    }
    expect(s.base.conditions).toEqual([]);
  });

  it("no Decision_ID or no send time → nothing frozen (never a made-up identity or clock)", () => {
    expect(planSnapshotFromTicket({ ...ticket, decisionId: null })).toBeNull();
    expect(planSnapshotFromTicket({ ...ticket, sentAtMs: null })).toBeNull();
  });

  it("zero, negative and non-finite prices are not prices", () => {
    const s = freezePlanSnapshot({ decisionId: "d1", frozenAt: "PAPER_FILL", atMs: T0, source: "paper", plan: { stopPx: 0, targetPx: -3, entryPx: NaN, expectedHoldMin: 0 } })!;
    expect([s.base.stopPx.state, s.base.targetPx.state, s.base.entryPx.state, s.base.expectedHoldMin.state]).toEqual(["UNRECORDED", "UNRECORDED", "UNRECORDED", "UNRECORDED"]);
  });

  it("a plan written at the journal entry says it is hindsight", () => {
    const s = freezePlanSnapshot({ decisionId: "d1", frozenAt: "JOURNAL_ENTRY", atMs: T0, source: "journal", plan: { stopPx: 1 } })!;
    expect(s.hindsightRisk).toBe(true);
  });

  it("a capture freezes only its TICKET-INTENT fields, as JOURNAL_ENTRY", () => {
    const f = (value: unknown, provenance: string) => ({ value, provenance, source: "x" });
    const draft = {
      decisionId: f("wmd_x", "TICKET-INTENT"), chartSymbol: f("MNQ1!", "TICKET-INTENT"), action: f("Buy to Open", "BROKER-REPORTED"),
      view: f(null, "UNREPORTED"), stopPx: f(21380, "TICKET-INTENT"), targetPx: f(21450, "DERIVED"),
    } as unknown as JournalCaptureDraft;
    const s = planSnapshotFromCapture(draft, {}, T0)!;
    expect(s.frozenAt).toBe("JOURNAL_ENTRY");
    expect(s.base.stopPx.value).toBe(21380);
    expect(s.base.targetPx.state).toBe("UNRECORDED");
  });

  it("direction from the ticket action", () => {
    expect(directionFromAction("Buy to Open")).toBe("LONG");
    expect(directionFromAction("Sell to Open")).toBe("SHORT");
    expect(directionFromAction("Sell to Close")).toBe("LONG");
    expect(directionFromAction("Buy to Close")).toBe("SHORT");
    expect(directionFromAction(null)).toBeNull();
  });
});

describe("§27 management conditions — words kept, checkable part parsed", () => {
  it.each([
    ["move to breakeven after +1R", "BREAKEVEN_AFTER_R", { triggerR: 1 }],
    ["BE at 1.5R", "BREAKEVEN_AFTER_R", { triggerR: 1.5 }],
    ["reduce at target 1", "REDUCE_AT_TARGET", { targetIndex: 1 }],
    ["time stop 30 min", "TIME_STOP", { minutes: 30 }],
    ["trail under 5m swing lows", "TRAIL_STOP", {}],
    ["add on the first pullback that holds VWAP", "ADD_ALLOWED", {}],
    ["respect the news at 10:00", "OTHER", {}],
  ])("%s → %s", (text, kind, extra) => {
    expect(parseManagementCondition(text)).toMatchObject({ kind, text, ...extra });
  });
  it("blank is not a condition", () => expect(parseManagementCondition("   ")).toBeNull());
});

describe("§27 immutability — hindsight cannot rewrite the plan", () => {
  const s = planSnapshotFromTicket(ticket, { conditions: ["move to breakeven after +1R"] })!;
  it("the snapshot is frozen deep", () => {
    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.base.stopPx)).toBe(true);
    expect(() => { (s.base.stopPx as { value: number }).value = 1; }).toThrow();
  });
  it("an amendment is appended, dated; the base is the same object", () => {
    const r = amendPlan(s, { atMs: T0 + 60_000, stopPx: 21400, newEvidence: "ES reclaimed the overnight high", note: null });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.base).toBe(s.base);
    expect(r.snapshot.amendments).toHaveLength(1);
    expect(s.amendments).toHaveLength(0);
    expect(effectivePlanAt(r.snapshot, T0).stopPx).toBe(21380);
    expect(effectivePlanAt(r.snapshot, T0 + 120_000).stopPx).toBe(21400);
  });
  it("an amendment dated before the freeze, before the last amendment, or changing nothing is refused", () => {
    expect(amendPlan(s, { atMs: T0 - 1, stopPx: 1, newEvidence: null, note: null }).ok).toBe(false);
    const r = amendPlan(s, { atMs: T0 + 10, targetPx: 21460, newEvidence: null, note: null });
    expect(r.ok && amendPlan(r.snapshot, { atMs: T0 + 5, targetPx: 1, newEvidence: null, note: null }).ok).toBe(false);
    expect(amendPlan(s, { atMs: T0 + 10, newEvidence: null, note: null }).ok).toBe(false);
  });
  it("with no invalidation price, the planned stop stands in — and says so", () => {
    expect(effectivePlanAt(s, T0)).toMatchObject({ invalidationPx: 21380, invalidationFrom: "PLANNED STOP" });
  });
  it("round-trips through JSON and refuses garbage", () => {
    const back = readPlanSnapshot(JSON.parse(JSON.stringify(s)));
    expect(back).toEqual(s);
    expect(readPlanSnapshot({ kind: "WM_PLAN_SNAPSHOT" })).toBeNull();
    expect(readPlanSnapshot(null)).toBeNull();
    expect(readPlanSnapshot({ ...JSON.parse(JSON.stringify(s)), base: { ...s.base, stopPx: { value: "21380", state: "RECORDED" } } })?.base.stopPx.state).toBe("UNRECORDED");
  });
});

describe("§27 store — first freeze wins; amendments only append", () => {
  it("freezes once per Decision_ID", () => {
    const st = mem();
    const a = planSnapshotFromTicket(ticket)!;
    const b = planSnapshotFromTicket({ ...ticket, protectiveStopPx: 1, sentAtMs: T0 + 5 })!;
    expect(freezePlanOnce(st, a)).toBe("FROZEN");
    expect(freezePlanOnce(st, b)).toBe("ALREADY_FROZEN");
    expect(readPlanForDecision(st, "wmd_abc123")?.base.stopPx.value).toBe(21380);
    expect(freezePlanOnce(null, a)).toBe("NOT_STORED");
  });
  it("appends a dated amendment without touching the base", () => {
    const st = mem();
    freezePlanOnce(st, planSnapshotFromTicket(ticket));
    const r = appendPlanAmendment(st, "wmd_abc123", { atMs: T0 + 1000, targetPx: 21470, newEvidence: "breadth expanded", note: null });
    expect(r.ok).toBe(true);
    const back = readPlanForDecision(st, "wmd_abc123")!;
    expect(back.base.targetPx.value).toBe(21450);
    expect(back.amendments[0]).toMatchObject({ targetPx: 21470, newEvidence: "breadth expanded" });
    expect(appendPlanAmendment(st, "nope", { atMs: T0, stopPx: 1, newEvidence: null, note: null }).ok).toBe(false);
  });
  it("the ticket's send freezes the plan (rememberTicketAtSend) and never throws into the send", () => {
    const session = mem(), device = mem();
    rememberTicketAtSend(session, "coid-1", ticket, T0, device);
    expect(readPlanForDecision(device, "wmd_abc123")?.frozenAt).toBe("TICKET_SEND");
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    expect(() => rememberTicketAtSend(session, "coid-2", ticket, T0, broken)).not.toThrow();
    expect(device.m.has(MANAGEMENT_PLAN_KEY)).toBe(true);
  });
});
