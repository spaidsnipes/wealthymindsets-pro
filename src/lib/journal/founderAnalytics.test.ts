import { describe, expect, it } from "vitest";

import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { buildTtRoundTrips } from "@/lib/broker/tastytradeLedger";
import type { Episode, EpisodeFill } from "@/lib/broker/webullLedger";
import type { BehaviourTag } from "./behaviorTags";
import {
  PATTERN_SAMPLE_MIN, mistakePatterns, proposeModel, provenanceCensus, symbolRoot, tripFromTastytrade, tripFromWebull,
  type AnalyticsTrip, type JournalFact,
} from "./founderAnalytics";

/* ── fixtures ── */
const tx = (id: number, action: string, price: string, value: string, effect: string, at: string) => ({
  id, "transaction-type": "Trade", "order-id": id, symbol: "/MNQZ6", "instrument-type": "Future", action, quantity: "1", price, value, "value-effect": effect, commission: "0.5", "executed-at": at,
});
const TT = buildTtRoundTrips(readTastytradeFills([
  tx(1, "Buy to Open", "21480", "0", "None", "2026-10-06T14:00:00Z"),
  tx(2, "Sell to Close", "21490", "20", "Credit", "2026-10-06T14:10:00Z"),
  tx(3, "Buy to Open", "21500", "0", "None", "2026-10-06T15:00:00Z"),
]));

const fill = (at: string, comboType: string | null): EpisodeFill => ({ orderId: at, side: "BUY", quantity: 1, price: 1, at, fees: 0, orderType: "LIMIT", comboType, atIsPlacement: false });
const ep = (id: string, openedAt: string, closedAt: string | null, net: number | null, combo: string | null = null): Episode => ({
  id, accountId: "acct9999", instrumentKey: "TSLA", symbol: "TSLA", instrumentType: "EQUITY", direction: "LONG", multiplier: 1,
  openedAt, closedAt, holdMs: null, maxQuantity: 1, entries: [fill(openedAt, combo)], exits: closedAt ? [fill(closedAt, null)] : [],
  avgEntry: 1, avgExit: closedAt ? 1 : null, gross: net, fees: 0, net, entryCost: 1, label: closedAt && net != null ? "RECONSTRUCTED" : "OPEN", note: null,
});

describe("per-record provenance from the two ledger owners", () => {
  it("a closed tastytrade trip is RECONSTRUCTED WITH EVIDENCE; an open one is UNKNOWN with no result", () => {
    const trips = TT.map(t => tripFromTastytrade(t, "5678")!);
    const closed = trips.find(t => t.closedAt)!;
    const open = trips.find(t => !t.closedAt)!;
    expect(closed).toMatchObject({ provenance: "RECONSTRUCTED WITH EVIDENCE", net: 19, broker: "tastytrade", account: "5678", bracketAtEntry: null });
    expect(open).toMatchObject({ provenance: "UNKNOWN", net: null });
  });
  it("a Webull episode keeps whether its entry carried a bracket", () => {
    expect(tripFromWebull(ep("w1", "2026-10-06T14:00:00Z", "2026-10-06T14:05:00Z", -10, "MASTER"))).toMatchObject({ provenance: "RECONSTRUCTED WITH EVIDENCE", bracketAtEntry: true, account: "9999" });
    expect(tripFromWebull(ep("w2", "2026-10-06T14:00:00Z", null, null))).toMatchObject({ provenance: "UNKNOWN", net: null });
  });
  it("census counts fills, journal rows, reconstructed and unknown records", () => {
    const trips = TT.map(t => tripFromTastytrade(t, "5678")!);
    expect(provenanceCensus(trips, 3, 4)).toEqual({ "PROVIDER-RETRIEVED": 3, "USER-IMPORTED": 4, "RECONSTRUCTED WITH EVIDENCE": 1, UNKNOWN: 1 });
  });
});

describe("Model 1 / Model 2 — PROPOSED, only from a recorded model, never from the result", () => {
  const trip = tripFromWebull(ep("w1", "2026-10-06T14:00:00Z", "2026-10-06T14:30:00Z", 300));
  it("no record → UNCLASSIFIED, even for a big winner", () => {
    const p = proposeModel(trip, undefined, []);
    expect(p).toMatchObject({ model: "UNCLASSIFIED", status: "PROPOSED" });
    expect(p.evidence.map(e => e.kind)).toEqual(["UNKNOWN"]);
  });
  it("a ledger mark M1 → MODEL_1, with the unverified runway rule and the result shown as a fact", () => {
    const p = proposeModel(trip, "M1", []);
    expect(p.model).toBe("MODEL_1");
    expect(p.evidence.map(e => e.kind)).toEqual(["HUMAN JOURNAL NOTE", "MODEL/RULE MATCH", "FACT FROM BROKER HISTORY"]);
    expect(p.evidence[1].text).toMatch(/3R\+ clean runway.*not verified/);
  });
  it("a journal day model for the same New York day and symbol root → MODEL_2", () => {
    const j: JournalFact[] = [{ id: "j", date: "2026-10-06", symbol: "tsla", dayModel: "M2" }];
    expect(proposeModel(trip, undefined, j).model).toBe("MODEL_2");
    expect(proposeModel(trip, undefined, [{ ...j[0], date: "2026-10-05" }]).model).toBe("UNCLASSIFIED");
  });
  it("records that disagree, or an M0 record, stay UNCLASSIFIED", () => {
    expect(proposeModel(trip, "M1", [{ id: "j", date: "2026-10-06", symbol: "TSLA", dayModel: "M2" }]).model).toBe("UNCLASSIFIED");
    const m0 = proposeModel(trip, "M0", []);
    expect(m0.model).toBe("UNCLASSIFIED");
    expect(m0.evidence.some(e => /NO TRADE/.test(e.text))).toBe(true);
  });
  it("roots futures, options and continuous symbols", () => {
    expect(symbolRoot("/MNQZ6")).toBe("MNQ");
    expect(symbolRoot("TSLA  261002C00305000")).toBe("TSLA");
    expect(symbolRoot("MNQ1!")).toBe("MNQ");
  });
});

describe("mistake patterns — facts only, sample size stated, insufficient under 20", () => {
  // Day 1: loss at 14:05, re-entry at 14:07 (soon after a loss), loss at 14:20, then a third trade at 15:00 (past the daily stop).
  const trips: AnalyticsTrip[] = [
    tripFromWebull(ep("a", "2026-10-06T14:00:00Z", "2026-10-06T14:05:00Z", -50, null)),
    tripFromWebull(ep("b", "2026-10-06T14:07:00Z", "2026-10-06T14:20:00Z", -40, "MASTER")),
    tripFromWebull(ep("c", "2026-10-06T15:00:00Z", "2026-10-06T15:30:00Z", 90, "MASTER")),
    tripFromWebull(ep("open", "2026-10-06T16:00:00Z", null, null)),
  ];
  const tags = new Map<string, BehaviourTag[]>([["a", []], ["b", [{ id: "ABOVE_USUAL_SIZE", label: "", evidence: "", truth: "INFERRED", rule: "" }]], ["c", []]]);
  const journal: JournalFact[] = [
    { id: "1", date: "2026-10-06", symbol: "TSLA", dayModel: "M1", plannedRDollars: 50, realizedR: -1.6, mfeR: 0.2 },
    { id: "2", date: "2026-10-06", symbol: "TSLA", dayModel: "M1", plannedRDollars: 50, realizedR: 1.2, mfeR: 3.4 },
    { id: "3", date: "2026-10-06", symbol: "TSLA", dayModel: "M2", plannedRDollars: 50, realizedR: 1.0, mfeR: 1.5 },
    { id: "4", date: "2026-10-06", symbol: "TSLA" },
  ];
  const ps = mistakePatterns({ trips, webullTags: tags, marks: { a: "M0", b: "M1" }, journal });
  const by = Object.fromEntries(ps.map(p => [p.id, p]));

  it("counts each pattern against the records where it could be checked", () => {
    expect(by.NO_PROTECTION_AT_ENTRY).toMatchObject({ occurrences: 1, sample: 3, evidenceKind: "FACT FROM BROKER HISTORY" });
    expect(by.SIZE_ABOVE_USUAL).toMatchObject({ occurrences: 1, sample: 3, evidenceKind: "INFERENCE" });
    expect(by.LOSS_BEYOND_PLANNED_1R).toMatchObject({ occurrences: 1, sample: 3, evidenceKind: "HUMAN JOURNAL NOTE" });
    expect(by.EXIT_BEFORE_MODEL_OBJECTIVE).toMatchObject({ occurrences: 1, sample: 3, evidenceKind: "MODEL/RULE MATCH" });
    expect(by.REENTRY_SOON_AFTER_LOSS).toMatchObject({ occurrences: 1, sample: 2 });
    expect(by.TRADING_PAST_DAILY_STOP).toMatchObject({ occurrences: 1, sample: 3 });
    expect(by.TRADE_ON_NO_TRADE_RECORD).toMatchObject({ occurrences: 1, sample: 2 });
  });

  it("every pattern under 20 records says INSUFFICIENT EVIDENCE; 20+ says MEASURED", () => {
    expect(ps.every(p => p.state === "INSUFFICIENT EVIDENCE")).toBe(true);
    const many = Array.from({ length: PATTERN_SAMPLE_MIN }, (_, i) => tripFromWebull(ep(`m${i}`, `2026-09-${String(i + 1).padStart(2, "0")}T14:00:00Z`, `2026-09-${String(i + 1).padStart(2, "0")}T14:30:00Z`, 10, "MASTER")));
    const m = mistakePatterns({ trips: many, webullTags: new Map(), marks: {}, journal: [] });
    expect(m.find(p => p.id === "NO_PROTECTION_AT_ENTRY")).toMatchObject({ occurrences: 0, sample: 20, share: 0, state: "MEASURED" });
  });

  it("tastytrade trips never count toward protection (its transactions cannot show a resting stop)", () => {
    const tt = TT.map(t => tripFromTastytrade(t, "5678")!);
    expect(mistakePatterns({ trips: tt, webullTags: new Map(), marks: {}, journal: [] }).find(p => p.id === "NO_PROTECTION_AT_ENTRY")?.sample).toBe(0);
  });

  it("no shame language in any label or basis", () => {
    const words = ps.map(p => `${p.label} ${p.basis}`).join(" ");
    expect(words).not.toMatch(/fail|stupid|bad trader|shame|fuck|idiot|revenge|reckless/i);
  });
});
