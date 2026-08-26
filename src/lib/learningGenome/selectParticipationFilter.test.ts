import { describe, it, expect } from "vitest";

import { selectParticipationFilter } from "./selectParticipationFilter";

describe("selectParticipationFilter — canon §7 PARTICIPATION FILTER", () => {
  it("UNKNOWN when both axes missing", () => {
    const r = selectParticipationFilter({});
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.underlying).toBe("UNKNOWN");
    expect(r.contract).toBe("UNKNOWN");
  });

  it("UNKNOWN when only underlying is measured", () => {
    const r = selectParticipationFilter({ underlyingParticipationRatio: 0.8 });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.underlying).toBe("STRONG");
    expect(r.contract).toBe("UNKNOWN");
  });

  it("GREEN when underlying STRONG + contract LIQUID", () => {
    const r = selectParticipationFilter({
      underlyingParticipationRatio: 0.85,
      spreadDollars: 0.02,
      midDollars: 1.0, // spread 2%
      contractVolumeRatio: 0.8,
    });
    expect(r.verdict).toBe("GREEN");
    expect(r.underlying).toBe("STRONG");
    expect(r.contract).toBe("LIQUID");
  });

  it("RED when underlying WEAK regardless of contract", () => {
    const r = selectParticipationFilter({
      underlyingParticipationRatio: 0.2,
      spreadDollars: 0.01,
      midDollars: 1.0,
      contractVolumeRatio: 1.0,
    });
    expect(r.verdict).toBe("RED");
    expect(r.underlying).toBe("WEAK");
  });

  it("RED when contract ILLIQUID regardless of underlying", () => {
    const r = selectParticipationFilter({
      underlyingParticipationRatio: 0.9,
      spreadDollars: 0.15,
      midDollars: 1.0, // 15% spread
    });
    expect(r.verdict).toBe("RED");
    expect(r.contract).toBe("ILLIQUID");
  });

  it("AMBER when STRONG underlying + MARGINAL contract", () => {
    const r = selectParticipationFilter({
      underlyingParticipationRatio: 0.9,
      spreadDollars: 0.05,
      midDollars: 1.0, // 5% spread → MARGINAL
    });
    expect(r.verdict).toBe("AMBER");
    expect(r.contract).toBe("MARGINAL");
  });

  it("AMBER when MIXED underlying + LIQUID contract", () => {
    const r = selectParticipationFilter({
      underlyingParticipationRatio: 0.5,
      spreadDollars: 0.02,
      midDollars: 1.0,
    });
    expect(r.verdict).toBe("AMBER");
    expect(r.underlying).toBe("MIXED");
    expect(r.contract).toBe("LIQUID");
  });

  it("Non-positive mid price falls back to UNKNOWN contract", () => {
    const r = selectParticipationFilter({
      underlyingParticipationRatio: 0.8,
      spreadDollars: 0.01,
      midDollars: 0,
    });
    expect(r.contract).toBe("UNKNOWN");
  });

  it("Negative participation ratio → UNKNOWN underlying", () => {
    const r = selectParticipationFilter({
      underlyingParticipationRatio: -0.1,
      spreadDollars: 0.01,
      midDollars: 1.0,
    });
    expect(r.underlying).toBe("UNKNOWN");
  });

  it("Every verdict carries a canon anchor", () => {
    for (const input of [
      {},
      { underlyingParticipationRatio: 0.8, spreadDollars: 0.02, midDollars: 1.0, contractVolumeRatio: 0.8 },
      { underlyingParticipationRatio: 0.5, spreadDollars: 0.02, midDollars: 1.0 },
      { underlyingParticipationRatio: 0.1, spreadDollars: 0.01, midDollars: 1.0 },
    ]) {
      const r = selectParticipationFilter(input);
      expect(r.canon).toContain("§7");
    }
  });
});
