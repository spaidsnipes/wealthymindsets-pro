import { describe, expect, it } from "vitest";
import fuseProfiles, { FUSION_METHOD, type FusionSourceProfile } from "./fuseProfiles";

const prof = (id: string, rows: [number, number][], poc: number, asOf = 100, fidelity: FusionSourceProfile["fidelity"] = "INDICATIVE"): FusionSourceProfile =>
  ({ id, species: id.toUpperCase(), rows: rows.map(([price, volume]) => ({ price, volume })), poc, asOf, fidelity });

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
  });

  it("recomputes the value area from the fused rows (70 %)", () => {
    const r = fuseProfiles(A, B);
    if (!r.ok) throw new Error(r.reason);
    expect(r.fused.val).toBe(10.5);
    expect(r.fused.vah).toBe(11.5);
  });

  it("keeps provenance: sources[], method, version, older asOf, weaker fidelity", () => {
    const r = fuseProfiles(A, B);
    if (!r.ok) throw new Error(r.reason);
    expect(r.fused.sources.map(s => [s.id, s.poc, s.volume])).toEqual([["vrp", 10.5, 1100], ["cmp", 11, 1100]]);
    expect(r.fused.method).toBe(FUSION_METHOD);
    expect(r.fused.asOf).toBe(150);
    expect(r.fused.fidelity).toBe("DEGRADED");
    expect(r.fused.id).toBe("fusion:vrp+cmp");
  });

  it("refuses without overlap, without two sources, or without volume", () => {
    expect(fuseProfiles(A, prof("far", [[50, 10], [51, 10]], 50))).toEqual({ ok: false, reason: "NO_OVERLAP" });
    expect(fuseProfiles(A, null)).toEqual({ ok: false, reason: "NEEDS_TWO_SOURCES" });
    expect(fuseProfiles(A, A)).toEqual({ ok: false, reason: "NEEDS_TWO_SOURCES" });
    expect(fuseProfiles(A, prof("z", [[10, 0]], 10))).toEqual({ ok: false, reason: "NO_VOLUME" });
  });

  it("does not touch its sources (unfuse = drop the object)", () => {
    const before = JSON.stringify([A, B]);
    fuseProfiles(A, B);
    expect(JSON.stringify([A, B])).toBe(before);
  });
});
