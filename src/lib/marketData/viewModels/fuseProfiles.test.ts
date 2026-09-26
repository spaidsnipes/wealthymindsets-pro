import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fuseProfiles, {
  FUSION_METHOD, FUSION_OVERLAP_POLICY, FUSION_REFUSAL_WORDS, fusionRefusalWords, fusedCaption, fusionRefusalCaption,
  type FusionSourceProfile, type FusionRefusal,
} from "./fuseProfiles";
import selectCompositeProfile from "./selectCompositeProfile";
import { selectVisibleRangeProfile } from "./selectVisibleRangeProfile";

const prof = (
  id: string, rows: [number, number][], poc: number, asOf = 100,
  fidelity: FusionSourceProfile["fidelity"] = "INDICATIVE",
  extra: Partial<FusionSourceProfile> = {},
): FusionSourceProfile => ({
  id, species: id.toUpperCase(), rows: rows.map(([price, volume]) => ({ price, volume })), poc, asOf, fidelity,
  instrument: "TSLA", volumeUnit: "BAR_VOLUME", evidence: "CANDLE_ESTIMATED",
  window: id === "cmp" ? { from: 0, to: 99 } : { from: 100, to: 200 },
  ...extra,
});

describe("H-601 #3 · Profile Fusion — the object", () => {
  const A = prof("vrp", [[10, 100], [10.5, 900], [11, 100]], 10.5, 200);
  const B = prof("cmp", [[11, 1000], [11.5, 50], [12, 50]], 11, 150, "DEGRADED");

  it("sums source VOLUME by row on the coarser shared grid and recomputes POC — never an average", () => {
    const r = fuseProfiles(A, B);
    if (!r.ok) throw new Error(r.reason);
    expect(r.fused.step).toBe(0.5);
    expect(r.fused.rows.find(x => x.price === 11)!.volume).toBe(1100);
    expect(r.fused.poc).toBe(11);
    expect(r.fused.poc).not.toBe((A.poc! + B.poc!) / 2);
    expect(r.fused.totalVolume).toBe(2200);
    expect(r.fused.sharedRows).toBe(1);
  });

  it("recomputes the value area from the fused rows (70 %)", () => {
    const r = fuseProfiles(A, B);
    if (!r.ok) throw new Error(r.reason);
    expect(r.fused.val).toBe(10.5);
    expect(r.fused.vah).toBe(11.5);
  });

  it("keeps provenance: DERIVED, sources[] with windows, method, policy, older asOf, weaker fidelity and evidence", () => {
    const r = fuseProfiles(A, { ...B, evidence: "TRADE_BASED" });
    if (!r.ok) throw new Error(r.reason);
    expect(r.fused.label).toBe("DERIVED");
    expect(r.fused.sources.map(s => [s.id, s.poc, s.volume])).toEqual([["vrp", 10.5, 1100], ["cmp", 11, 1100]]);
    expect(r.fused.sources.map(s => s.window)).toEqual([{ from: 100, to: 200 }, { from: 0, to: 99 }]);
    expect(r.fused.method).toBe(FUSION_METHOD);
    expect(r.fused.overlapPolicy).toBe(FUSION_OVERLAP_POLICY);
    expect(r.fused.asOf).toBe(150);
    expect(r.fused.fidelity).toBe("DEGRADED");
    expect(r.fused.evidence).toBe("CANDLE_ESTIMATED");
    expect(r.fused.instrument).toBe("TSLA");
    expect(r.fused.id).toBe("fusion:vrp+cmp");
  });

  it("refuses without overlap, without two sources, or without volume", () => {
    expect(fuseProfiles(A, prof("far", [[50, 10], [51, 10]], 50, 100, "INDICATIVE", { window: { from: 0, to: 50 } }))).toEqual({ ok: false, reason: "NO_OVERLAP" });
    expect(fuseProfiles(A, null)).toEqual({ ok: false, reason: "NEEDS_TWO_SOURCES" });
    expect(fuseProfiles(A, A)).toEqual({ ok: false, reason: "NEEDS_TWO_SOURCES" });
    expect(fuseProfiles(A, prof("z", [[10, 0]], 10, 100, "INDICATIVE", { window: { from: 0, to: 50 } }))).toEqual({ ok: false, reason: "NO_VOLUME" });
  });

  it("does not touch its sources (unfuse = drop the object)", () => {
    const before = JSON.stringify([A, B]);
    fuseProfiles(A, B);
    expect(JSON.stringify([A, B])).toBe(before);
  });
});

describe("§23 · only a LAWFUL pair fuses — every refusal is named", () => {
  const A = prof("vrp", [[10, 100], [10.5, 900], [11, 100]], 10.5);
  const B = prof("cmp", [[11, 1000], [11.5, 50], [12, 50]], 11);

  it("different instruments are refused", () => {
    expect(fuseProfiles(A, { ...B, instrument: "NVDA" })).toEqual({ ok: false, reason: "INSTRUMENT_MISMATCH" });
  });

  it("volume counted in different units is refused (tape print size is not vendor bar volume)", () => {
    expect(fuseProfiles(A, { ...B, volumeUnit: "PRINT_SIZE" })).toEqual({ ok: false, reason: "UNIT_MISMATCH" });
  });

  it("a parent whose time window is unknown cannot be proven disjoint — refused", () => {
    expect(fuseProfiles(A, { ...B, window: null })).toEqual({ ok: false, reason: "WINDOW_UNKNOWN" });
  });

  it("parents that share bars are refused: containment, partial overlap, and a shared edge bar", () => {
    // Living-over-every-loaded-bar CONTAINS the composite's sessions.
    expect(fuseProfiles({ ...A, window: { from: 0, to: 500 } }, B)).toEqual({ ok: false, reason: "TIME_OVERLAP" });
    expect(fuseProfiles({ ...A, window: { from: 50, to: 150 } }, B)).toEqual({ ok: false, reason: "TIME_OVERLAP" });
    expect(fuseProfiles({ ...A, window: { from: 99, to: 150 } }, B)).toEqual({ ok: false, reason: "TIME_OVERLAP" });
    expect(fuseProfiles({ ...A, window: { from: 100, to: 150 } }, B).ok).toBe(true);
  });

  it("every refusal has the trader's sentence, from one owner", () => {
    const all: FusionRefusal[] = ["NEEDS_TWO_SOURCES", "INSTRUMENT_MISMATCH", "UNIT_MISMATCH", "WINDOW_UNKNOWN", "TIME_OVERLAP", "NO_VOLUME", "NO_OVERLAP"];
    for (const r of all) expect(FUSION_REFUSAL_WORDS[r].length).toBeGreaterThan(8);
    expect(fusionRefusalWords("TIME_OVERLAP")).toContain("counted twice");
    expect(fusionRefusalWords(null)).toBeNull();
    expect(fusionRefusalCaption(["COMPOSITE", "LIVING"], "TIME_OVERLAP"))
      .toBe("FUSION REFUSED · COMPOSITE + LIVING · parents share bars — their volume would be counted twice");
  });

  it("the fused object's caption says DERIVED, names both parents, and carries CANDLE-EST when either parent is estimated", () => {
    const r = fuseProfiles(A, { ...B, species: "VISIBLE_RANGE" });
    if (!r.ok) throw new Error(r.reason);
    expect(fusedCaption(r.fused)).toBe("FUSED · DERIVED · VRP + VISIBLE RANGE · CANDLE-EST");
    const t = fuseProfiles({ ...A, evidence: "TRADE_BASED" }, { ...B, evidence: "TRADE_BASED" });
    if (!t.ok) throw new Error(t.reason);
    expect(fusedCaption(t.fused)).toBe("FUSED · DERIVED · VRP + CMP");
  });
});

describe("§23 · the SHARED GRID re-buckets by overlap, anchored on the coarser parent", () => {
  it("a finer parent's row straddling two grid rows is split in proportion to what it covers", () => {
    const coarse = prof("cmp", [[10, 100], [10.25, 100], [10.5, 100]], 10);
    // 0.1 rows; the 10.2 row covers 10.2–10.3: half in [10, 10.25), half in [10.25, 10.5).
    const fine = prof("vrp", [[10.1, 10], [10.2, 10], [10.3, 10]], 10.2);
    const r = fuseProfiles(fine, coarse);
    if (!r.ok) throw new Error(r.reason);
    expect(r.fused.step).toBe(0.25);
    const at = (p: number) => r.fused.rows.find(x => x.price === p)!.bySource[0];
    expect(at(10)).toBeCloseTo(15, 9);   // 10.1 whole + half of 10.2
    expect(at(10.25)).toBeCloseTo(15, 9); // half of 10.2 + 10.3 whole
    expect(r.fused.sources[0].volume).toBeCloseTo(30, 9);
  });

  it("the coarser parent's own rows map one-to-one (no silent shift to a zero-anchored grid)", () => {
    const coarse = prof("cmp", [[10.03, 100], [10.08, 300], [10.13, 100]], 10.08);
    const fine = prof("vrp", [[10.05, 50], [10.06, 50]], 10.05);
    const r = fuseProfiles(fine, coarse);
    if (!r.ok) throw new Error(r.reason);
    expect(r.fused.rows.map(x => x.price)).toEqual([10.03, 10.08, 10.13]);
    expect(r.fused.rows.map(x => x.bySource[1])).toEqual([100, 300, 100]);
  });
});

describe("§23 · property: the fused distribution is the sum of its parents, and its levels are its own", () => {
  // Deterministic PRNG so a failure is reproducible.
  const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const steps = [0.01, 0.05, 0.1, 0.25, 0.5, 1];

  for (let trial = 0; trial < 60; trial++) {
    it(`trial ${trial}: Σ fused = Σ A + Σ B, each parent conserved, POC = argmax, VA ≥ 70 %`, () => {
      const r = rng(trial + 7);
      const mk = (id: string, win: { from: number; to: number }) => {
        const step = steps[Math.floor(r() * steps.length)];
        const base = 100 + Math.floor(r() * 20) * step;
        const n = 3 + Math.floor(r() * 25);
        const rows: [number, number][] = [];
        for (let i = 0; i < n; i++) if (r() > 0.15) rows.push([Math.round((base + i * step) * 1e8) / 1e8, 1 + Math.floor(r() * 1000)]);
        if (rows.length < 2) rows.push([base, 5], [Math.round((base + step) * 1e8) / 1e8, 7]);
        return prof(id, rows, rows[0][0], 100, "INDICATIVE", { window: win, step });
      };
      const a = mk("vrp", { from: 100, to: 200 });
      const b = mk("cmp", { from: 0, to: 99 });
      const res = fuseProfiles(a, b);
      if (!res.ok) { expect(res.reason).toBe("NO_OVERLAP"); return; }
      const f = res.fused;
      const sa = a.rows.reduce((s, x) => s + x.volume, 0);
      const sb = b.rows.reduce((s, x) => s + x.volume, 0);
      expect(f.totalVolume).toBeCloseTo(sa + sb, 6);
      expect(f.sources[0].volume).toBeCloseTo(sa, 6);
      expect(f.sources[1].volume).toBeCloseTo(sb, 6);
      const maxV = Math.max(...f.rows.map(x => x.volume));
      const pocRow = f.rows.find(x => x.price === f.poc)!;
      expect(pocRow.volume).toBe(maxV);
      const inVA = f.rows.filter(x => x.price >= f.val && x.price < f.vah).reduce((s, x) => s + x.volume, 0);
      expect(inVA).toBeGreaterThanOrEqual(0.7 * f.totalVolume - 1e-6);
      expect(f.val).toBeLessThanOrEqual(f.poc);
      expect(f.vah).toBeGreaterThan(f.poc);
    });
  }

  it("asymmetric fixture: averaging the parents' POCs does NOT land on the fused POC", () => {
    // A: a fat shelf at 100 + a long thin upper tail. B: a thinner POC at 104
    // that sits ON A's tail — the fused mass is at 104, not at the 102 midpoint.
    const a = prof("vrp", [[100, 500], [101, 20], [102, 20], [103, 20], [104, 300], [105, 20]], 100, 100, "INDICATIVE", { window: { from: 100, to: 200 } });
    const b = prof("cmp", [[103, 50], [104, 400], [105, 50]], 104, 100, "INDICATIVE", { window: { from: 0, to: 99 } });
    const r = fuseProfiles(a, b);
    if (!r.ok) throw new Error(r.reason);
    const averaged = (a.poc! + b.poc!) / 2;
    expect(averaged).toBe(102);
    expect(r.fused.poc).toBe(104);
    expect(r.fused.poc).not.toBe(averaged);
    // …and the volume-weighted mean of POCs is not it either.
    const weighted = (a.poc! * 500 + b.poc! * 400) / 900;
    expect(r.fused.poc).not.toBeCloseTo(weighted, 1);
  });
});

describe("§23 · Composite remains a different invention", () => {
  const bar = (time: number, low: number, high: number, volume = 100) => ({ time, open: low, high, low, close: high, volume });
  const session = (d: number, base: number) => Array.from({ length: 10 }, (_, i) => bar(d * 100_000 + i * 60, base + (i % 3) * 0.4, base + 1 + (i % 3) * 0.4));

  it("Composite re-profiles raw BARS of completed sessions; Fusion sums two finished distributions and keeps both parents", () => {
    const bars = [...session(0, 100), ...session(1, 101), ...session(2, 150)];
    const cmp = selectCompositeProfile(bars);
    expect(cmp.drawn).toBe(true);
    const today = selectVisibleRangeProfile(bars, 2 * 100_000, 2 * 100_000 + 9 * 60);
    expect(today.drawn).toBe(true);
    // A composite has no parents to keep; a fusion must name both.
    expect("sources" in cmp).toBe(false);
    const src = (id: string, rows: readonly { price: number; volume: number }[], poc: number, window: { from: number; to: number }): FusionSourceProfile =>
      ({ id, species: id, rows, poc, asOf: window.to, fidelity: null, instrument: "TSLA", volumeUnit: "BAR_VOLUME", evidence: "CANDLE_ESTIMATED", window });
    // Composite (sessions 0–1) + today's visible range: price ranges 100–102.8 vs 150–151.8 — honest NO_OVERLAP.
    const far = fuseProfiles(src("composite", cmp.rows, cmp.poc!, { from: 0, to: 100_540 }), src("visible-range", today.rows, today.poc!, { from: 200_000, to: 200_540 }));
    expect(far).toEqual({ ok: false, reason: "NO_OVERLAP" });
    // The owners are separate modules: Composite never calls Fusion; Fusion never touches bars or vpEngine.
    const here = (f: string) => readFileSync(join(__dirname, f), "utf8");
    expect(here("selectCompositeProfile.ts")).not.toMatch(/fuseProfiles/);
    expect(here("fuseProfiles.ts")).not.toMatch(/from "@\/lib\/vpEngine"|computeProfileFromBars|LegacyOhlcvTuple/);
  });
});
