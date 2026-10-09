/** Rows that needed a Founder action, proved on a labelled SAMPLE through the real owners (zero writes to real storage). */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { brokerStoryFixtures, captureFixture, LIFECYCLE_DECISION, planLifecycleRoundTrip } from "./journalLifecycleFixture";
import { resetManagementOwnerForTests, setManagementOwner } from "./managementOwner";
import { BROKER_READBACK_UNKNOWNS } from "./planActualsFromBroker";
import { WEBULL_READBACK_UNKNOWNS } from "./planActualsFromWebull";
import { composePlanReview } from "./planReview";

afterEach(() => { vi.unstubAllGlobals(); resetManagementOwnerForTests(); });

describe("1 · plan lifecycle in a throwaway store", () => {
  it("freeze → second freeze refused → early amendment refused → amendment appended → reload → erase: every step holds", () => {
    const p = planLifecycleRoundTrip();
    expect(p.steps.map(s => s.step)).toEqual([
      "Freeze at the sample send", "A second freeze for the same decision", "An amendment dated BEFORE the freeze",
      "A dated amendment with new evidence", "Reload", "Erase the plan",
    ]);
    expect(p.steps.every(s => s.ok)).toBe(true);
    expect(p.allOk).toBe(true);
    expect(p.steps[0].outcome).toBe("FROZEN on the Decision_ID");
    expect(p.steps[1].outcome).toBe("REFUSED — the first freeze stands (same freeze time)");
    expect(p.steps[2].outcome).toMatch(/^REFUSED — An amendment cannot be dated before the plan was frozen\./);
    expect(p.steps[4].outcome).toBe("The frozen base is unchanged (stop 98); 1 amendment, with its evidence");
    expect(p.steps[5].outcome).toMatch(/^Plan and its amendment removed; the “why did the plan change\?” answer cleared; the lesson and marks kept$/);
  });
  it("in a browser it uses the member's own keys IN MEMORY and never touches the real localStorage", () => {
    const real = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), key: () => null, length: 0, clear: vi.fn() };
    vi.stubGlobal("window", { localStorage: real, sessionStorage: real, dispatchEvent: () => true });
    vi.stubGlobal("localStorage", real);
    setManagementOwner("member-1", { getItem: () => null, setItem: () => {}, removeItem: () => {} }, null);
    const p = planLifecycleRoundTrip();
    expect(p.allOk).toBe(true);
    expect(p.keysAtEnd.every(k => k.endsWith(":member-1"))).toBe(true);
    expect(p.keysAtEnd.length).toBeGreaterThan(0);
    expect(real.setItem).not.toHaveBeenCalled();
    expect(real.getItem).not.toHaveBeenCalled();
    expect(real.removeItem).not.toHaveBeenCalled();
  });
  it("a guest keeps no plan — the first step says so and nothing further is claimed", () => {
    vi.stubGlobal("window", { dispatchEvent: () => true });
    setManagementOwner(null, { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    const p = planLifecycleRoundTrip();
    expect(p.allOk).toBe(false);
    expect(p.steps).toHaveLength(1);
    expect(p.steps[0].outcome).toMatch(/^NOT STORED — no member key/);
  });
});

describe("2 · plan vs actual from a broker readback", () => {
  const [tt, wb] = brokerStoryFixtures();
  it("tastytrade shapes: entry, a stop moved once, exit — with the two readback UNKNOWNs carried", () => {
    expect(tt.broker).toBe("tastytrade");
    const a = tt.input.actuals!;
    expect(a.entry).toMatchObject({ px: 100, qty: 1 });
    expect(a.exits).toHaveLength(1);
    expect(a.stopMoves).toEqual([{ atMs: expect.any(Number), fromPx: 98, toPx: 99 }]);
    expect(a.unknowns).toEqual(BROKER_READBACK_UNKNOWNS);
    const r = composePlanReview(tt.input);
    expect(r.result.decisionId).toBe("SAMPLE-BROKER-TT");
    expect(r.result.findings.map(f => f.id)).toContain("MOVED_STOP_WITHOUT_PLAN_BASIS");
    expect(r.sheriff.actual.join(" ")).toContain("UNKNOWN: whether tastytrade's same-day order list keeps cancelled or replaced Stop orders");
    expect(r.sheriff.actual[0]).toBe("Reported by: tastytrade order readback and trade transactions.");
  });
  it("Webull shapes: fills only — the comparison runs and its UNKNOWNs are carried (no stop / target orders claimed)", () => {
    expect(wb.broker).toBe("webull");
    expect(wb.input.actuals).not.toBeNull();
    expect(wb.input.actuals!.stopMoves).toEqual([]);
    expect(wb.input.actuals!.unknowns).toEqual(WEBULL_READBACK_UNKNOWNS);
    const r = composePlanReview(wb.input);
    expect(r.sheriff.actual.join(" ")).toContain("UNKNOWN: WM reads Webull fills only");
    expect(r.result.findings.map(f => f.id)).not.toContain("MOVED_STOP_WITHOUT_PLAN_BASIS");
  });
});

describe("3 · journal auto-capture from a broker fill", () => {
  it("a FILLED order + its transaction → a draft whose fields carry their provenance", () => {
    const c = captureFixture();
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const d = c.draft;
    expect(d.decisionId.value).toBe("SAMPLE-CAPTURE-1");
    expect(d.fillPx).toMatchObject({ value: 21400.25, provenance: "BROKER-REPORTED" });
    expect(d.filledAt.provenance).toBe("BROKER-REPORTED");
    expect(d.plannedRiskUsd).toMatchObject({ provenance: "DERIVED" });
    expect(d.pnlUsd.provenance).toBe("UNREPORTED");          // an opening fill has no result yet — never a 0
    const provs = new Set(Object.values(d).filter((v): v is { provenance: string } => !!v && typeof v === "object" && "provenance" in (v as object)).map(v => v.provenance));
    expect(provs.size).toBeGreaterThanOrEqual(3);
  });
});

describe("the fixture never names the browser's storage or the network", () => {
  it("source scan", () => {
    const src = readFileSync(path.resolve(__dirname, "journalLifecycleFixture.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src.length).toBeGreaterThan(4_000);
    expect(src).not.toMatch(/localStorage|sessionStorage|window\.|indexedDB|fetch\(|\/api\//);
    expect(LIFECYCLE_DECISION.startsWith("SAMPLE-")).toBe(true);
  });
});
