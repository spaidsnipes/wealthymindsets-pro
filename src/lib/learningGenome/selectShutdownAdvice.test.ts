import { describe, it, expect } from "vitest";

import { selectShutdownAdvice } from "./selectShutdownAdvice";

describe("selectShutdownAdvice — canon §Daily Risk + §10 Profit/Shutdown", () => {
  it("empty → OK", () => {
    const s = selectShutdownAdvice([]);
    expect(s.state).toBe("OK");
    expect(s.cumulative_r).toBe(0);
    expect(s.losing_trades).toBe(0);
  });

  it("single small loss → OK", () => {
    const s = selectShutdownAdvice([-0.5]);
    expect(s.state).toBe("OK");
  });

  it("cumulative exactly -2R → AT_TWO_R_STOP (canon inclusive)", () => {
    const s = selectShutdownAdvice([-1, -1]);
    expect(s.state).toBe("AT_TWO_R_STOP");
    expect(s.cumulative_r).toBe(-2);
  });

  it("cumulative below -2R → AT_TWO_R_STOP", () => {
    const s = selectShutdownAdvice([-1.5, -1]);
    expect(s.state).toBe("AT_TWO_R_STOP");
  });

  it("two losing trades (even if net > -2R) → AT_TWO_LOSSES", () => {
    const s = selectShutdownAdvice([-0.5, -0.5]);
    expect(s.state).toBe("AT_TWO_LOSSES");
    expect(s.losing_trades).toBe(2);
    expect(s.cumulative_r).toBe(-1);
  });

  it("hard stop takes priority over two-loss (both true → -2R wins)", () => {
    const s = selectShutdownAdvice([-1, -1, -0.5]);
    // cumulative -2.5 → AT_TWO_R_STOP wins priority
    expect(s.state).toBe("AT_TWO_R_STOP");
  });

  it("+3R exactly → AT_THREE_R_TARGET (canon inclusive)", () => {
    const s = selectShutdownAdvice([1, 2]);
    expect(s.state).toBe("AT_THREE_R_TARGET");
    expect(s.cumulative_r).toBe(3);
  });

  it("+3R with one prior loss → still AT_THREE_R_TARGET", () => {
    const s = selectShutdownAdvice([-1, 4]);
    // net +3, losses=1 (< 2), no hard stop → target
    expect(s.state).toBe("AT_THREE_R_TARGET");
  });

  it("session-open path when net between -2 and +3 with < 2 losses", () => {
    const s = selectShutdownAdvice([1, -0.5]);
    expect(s.state).toBe("OK");
  });

  it("canon anchor present on every state", () => {
    for (const stream of [[], [-1], [-1, -1], [3], [-0.5, -0.5]]) {
      const s = selectShutdownAdvice(stream);
      expect(s.canon.startsWith("§")).toBe(true);
      expect(s.message.length).toBeGreaterThan(0);
    }
  });
});
