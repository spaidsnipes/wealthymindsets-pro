import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  BREAK_BURST_MS, EMPTY_LIFE_LEDGER, EMPTY_SEEN_LEDGER, LANDING_MS,
  burstProgress, landingScale, rubbleChunks, stepFirstSeen, stepLifeTransitions,
} from "./eventMotion";

/*
 * MOTION ONLY ON REAL EVENTS (Founder, Codex A-3, 2026-11-02: "When brick walls start to break … a mixture of the real
 * data and then the flow maybe to somehow activate the animations … when shit happens, like big trade bubbles … or the
 * walls"). Every animation here is fired by a fact WM OBSERVED change while the chart was open — a wall's lifecycle
 * moving into BREAKING / BROKEN, a big trade first heard. Nothing animates on load, on a timeframe switch, or on
 * history: the first look at a scene primes the ledger silently.
 */
describe("wall lifecycle transitions — the break animates only when it happens", () => {
  it("the first look primes silently; a wall seen BREAKING on load does not burst", () => {
    const l = stepLifeTransitions(EMPTY_LIFE_LEDGER, "NQ|tasty", [{ id: 21000, life: "BREAKING" }], 1_000);
    expect(l.events).toEqual([]);
  });
  it("DEFENDED → BREAKING observed live fires one burst, which ends after BREAK_BURST_MS", () => {
    let l = stepLifeTransitions(EMPTY_LIFE_LEDGER, "NQ|tasty", [{ id: 21000, life: "DEFENDED" }], 1_000);
    l = stepLifeTransitions(l, "NQ|tasty", [{ id: 21000, life: "BREAKING" }], 2_000);
    expect(l.events).toEqual([{ id: 21000, from: "DEFENDED", to: "BREAKING", atMs: 2_000 }]);
    l = stepLifeTransitions(l, "NQ|tasty", [{ id: 21000, life: "BREAKING" }], 2_500);
    expect(l.events.length).toBe(1);
    l = stepLifeTransitions(l, "NQ|tasty", [{ id: 21000, life: "BREAKING" }], 2_000 + BREAK_BURST_MS + 1);
    expect(l.events).toEqual([]);
  });
  it("a calm change (BORN → TESTED) and a new wall are not breaks; a new instrument forgets", () => {
    let l = stepLifeTransitions(EMPTY_LIFE_LEDGER, "k", [{ id: 1, life: "BORN" }], 0);
    l = stepLifeTransitions(l, "k", [{ id: 1, life: "TESTED" }, { id: 2, life: "BROKEN" }], 10);
    expect(l.events).toEqual([]);
    l = stepLifeTransitions(l, "k", [{ id: 1, life: "BROKEN" }, { id: 2, life: "BROKEN" }], 20);
    expect(l.events.map(e => e.id)).toEqual([1]);
    expect(stepLifeTransitions(l, "other", [{ id: 1, life: "BROKEN" }], 30).events).toEqual([]);
  });
  it("burstProgress runs 0 → 1 and is null outside its window or with motion off", () => {
    expect(burstProgress(1_000, 1_000, true)).toBe(0);
    expect(burstProgress(1_000, 1_000 + BREAK_BURST_MS / 2, true)).toBeCloseTo(0.5);
    expect(burstProgress(1_000, 1_000 + BREAK_BURST_MS, true)).toBeNull();
    expect(burstProgress(1_000, 1_100, false)).toBeNull();
  });
  it("rubble falls under gravity, deterministically, and fades out", () => {
    const a = rubbleChunks(21000, 0.2, 8), b = rubbleChunks(21000, 0.2, 8), c = rubbleChunks(21000, 0.8, 8);
    expect(a).toEqual(b);
    expect(a.length).toBe(8);
    for (let i = 0; i < 8; i++) {
      expect(c[i]!.dy).toBeGreaterThan(a[i]!.dy);
      expect(c[i]!.alpha).toBeLessThan(a[i]!.alpha);
    }
  });
});

describe("big trades land when they are first heard — never on load", () => {
  it("the first look primes every bubble already there", () => {
    const s = stepFirstSeen(EMPTY_SEEN_LEDGER, "BTC|1m", ["a", "b"], 5_000);
    expect(s.ageOf("a", 5_100)).toBeNull();
  });
  it("a bubble that appears later lands: scale grows from below 1 to exactly 1 by LANDING_MS", () => {
    let s = stepFirstSeen(EMPTY_SEEN_LEDGER, "BTC|1m", ["a"], 5_000);
    s = stepFirstSeen(s, "BTC|1m", ["a", "new"], 6_000);
    const age0 = s.ageOf("new", 6_000)!;
    expect(age0).toBe(0);
    expect(landingScale(age0, true)).toBeLessThan(0.5);
    expect(landingScale(LANDING_MS, true)).toBe(1);
    expect(landingScale(null, true)).toBe(1);
    expect(landingScale(10, false)).toBe(1);
    // A switch of symbol / timeframe primes again.
    expect(stepFirstSeen(s, "ETH|1m", ["x"], 7_000).ageOf("x", 7_000)).toBeNull();
  });
});

describe("the chart wires both events", () => {
  const chart = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
  it("brick walls step the lifecycle ledger and paint the burst from it", () => {
    expect(chart).toContain("wallLifeLedgerRef.current = stepLifeTransitions(");
    expect(chart).toContain("rubbleChunks(w.strike + si * 7, bp,");
  });
  it("big trades step the first-seen ledger and scale the disc by landingScale", () => {
    expect(chart).toContain("bigTradeSeenRef.current = stepFirstSeen(");
    expect(chart).toContain("landingScale(");
  });
});
