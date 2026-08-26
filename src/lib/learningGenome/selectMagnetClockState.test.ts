import { describe, it, expect } from "vitest";

import { selectMagnetClockState } from "./selectMagnetClockState";

describe("selectMagnetClockState — canon §5 MAGNET CLOCK / PATH QUALITY", () => {
  it("empty transitions → current DORMANT + valid", () => {
    const r = selectMagnetClockState({ transitions: [] });
    expect(r.current).toBe("DORMANT");
    expect(r.valid).toBe(true);
    expect(r.history).toEqual(["DORMANT"]);
  });

  it("canonical full lifecycle → CONSUMED", () => {
    const r = selectMagnetClockState({
      transitions: ["AWAKENING", "PULLING", "APPROACHING", "TAPPED", "CONSUMED"],
    });
    expect(r.current).toBe("CONSUMED");
    expect(r.valid).toBe(true);
    expect(r.history).toEqual([
      "DORMANT", "AWAKENING", "PULLING", "APPROACHING", "TAPPED", "CONSUMED",
    ]);
  });

  it("TAPPED → REJECTED → DORMANT valid regression", () => {
    const r = selectMagnetClockState({
      transitions: ["AWAKENING", "PULLING", "APPROACHING", "TAPPED", "REJECTED", "DORMANT"],
    });
    expect(r.current).toBe("DORMANT");
    expect(r.valid).toBe(true);
  });

  it("AWAKENING → DORMANT regression allowed", () => {
    const r = selectMagnetClockState({
      transitions: ["AWAKENING", "DORMANT"],
    });
    expect(r.valid).toBe(true);
    expect(r.current).toBe("DORMANT");
  });

  it("DORMANT → PULLING skip is INVALID (canon: must AWAKEN first)", () => {
    const r = selectMagnetClockState({
      transitions: ["PULLING"],
    });
    expect(r.valid).toBe(false);
    expect(r.invalid_step).toEqual({ index: 0, from: "DORMANT", to: "PULLING" });
  });

  it("APPROACHING → CONSUMED skip is INVALID (canon: must TAP first)", () => {
    const r = selectMagnetClockState({
      transitions: ["AWAKENING", "PULLING", "APPROACHING", "CONSUMED"],
    });
    expect(r.valid).toBe(false);
    expect(r.invalid_step!.from).toBe("APPROACHING");
    expect(r.invalid_step!.to).toBe("CONSUMED");
  });

  it("ACCEPTED is terminal — no further transitions allowed", () => {
    const r = selectMagnetClockState({
      transitions: ["AWAKENING", "PULLING", "APPROACHING", "TAPPED", "ACCEPTED", "DORMANT"],
    });
    expect(r.valid).toBe(false);
    expect(r.invalid_step!.from).toBe("ACCEPTED");
  });

  it("CONSUMED is terminal", () => {
    const r = selectMagnetClockState({
      transitions: ["AWAKENING", "PULLING", "APPROACHING", "TAPPED", "CONSUMED", "DORMANT"],
    });
    expect(r.valid).toBe(false);
    expect(r.invalid_step!.from).toBe("CONSUMED");
  });

  it("REJECTED → DORMANT is the only allowed transition from REJECTED", () => {
    const r = selectMagnetClockState({
      transitions: ["AWAKENING", "PULLING", "APPROACHING", "TAPPED", "REJECTED", "AWAKENING"],
    });
    expect(r.valid).toBe(false);
    expect(r.invalid_step!.from).toBe("REJECTED");
    expect(r.invalid_step!.to).toBe("AWAKENING");
  });

  it("Every response carries a canon anchor", () => {
    for (const transitions of [
      [] as any,
      ["AWAKENING"] as any,
      ["PULLING"] as any,
    ]) {
      const r = selectMagnetClockState({ transitions });
      expect(r.canon).toContain("§5");
    }
  });
});
