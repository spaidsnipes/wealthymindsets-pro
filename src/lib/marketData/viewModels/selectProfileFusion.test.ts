import { describe, expect, it } from "vitest";

import selectProfileFusion, { type FusionSourceLevel } from "./selectProfileFusion";

const L = (species: FusionSourceLevel["species"], kind: string, price: number): FusionSourceLevel => ({ species, kind, price });

describe("refusals", () => {
  it("one species cannot fuse with itself", () => {
    const v = selectProfileFusion([L("LIVING", "POC", 238.4), L("LIVING", "VAH", 238.41)]);
    expect(v.reason).toBe("FEWER_THAN_TWO_SPECIES");
    expect(v.zones).toEqual([]);
  });
  it("two species that do not meet is NO_AGREEMENT, not a zone", () => {
    const v = selectProfileFusion([L("LIVING", "POC", 238.4), L("TPO", "POC", 241.8)]);
    expect(v.reason).toBe("NO_AGREEMENT");
  });
});

describe("fused zones", () => {
  it("levels from different species within tolerance fuse, with provenance kept", () => {
    const v = selectProfileFusion([
      L("LIVING", "POC", 238.40),
      L("TPO", "POC", 238.45),
      L("MEMORY", "S-1 POC", 238.52),
      L("STRUCTURE", "POC", 237.53),
    ]);
    expect(v.drawn).toBe(true);
    const z = v.zones[0];
    expect(z.low).toBe(238.40);
    expect(z.high).toBe(238.52);
    expect(z.speciesCount).toBe(3);
    expect(z.sources.map(s => s.species)).toEqual(["LIVING", "TPO", "MEMORY"]);
    expect(z.provenance).toBe("LIVING POC · TPO POC · MEMORY S-1 POC");
  });

  it("invents no price: zone edges are contributing prices", () => {
    const v = selectProfileFusion([L("LIVING", "VAL", 236.9), L("TPO", "VAL", 236.8)]);
    const z = v.zones[0];
    expect([236.8, 236.9]).toContain(z.low);
    expect([236.8, 236.9]).toContain(z.high);
  });

  it("carries no score, weight or confidence field", () => {
    const v = selectProfileFusion([L("LIVING", "POC", 100), L("TPO", "POC", 100.01)]);
    const keys = Object.keys(v.zones[0]);
    expect(keys.some(k => /score|weight|confidence|prob/i.test(k))).toBe(false);
  });

  it("is deterministic regardless of input order", () => {
    const a = [L("LIVING", "POC", 238.4), L("TPO", "POC", 238.45), L("MEMORY", "S-1 POC", 238.5)];
    expect(selectProfileFusion([...a].reverse())).toEqual(selectProfileFusion(a));
  });
});
