import { describe, it, expect } from "vitest";
import {
  fmtNum,
  formatMemoryAge,
  relTime,
  fidelityToTone,
  coverageTone,
  memoryStateTone,
  persistenceRightTone,
} from "./nectarFormat";
import { WM } from "./design/wmTokens";

describe("nectarFormat.fmtNum", () => {
  it("keeps small values at 2dp with sign", () => {
    expect(fmtNum(0)).toBe("0.00");
    expect(fmtNum(12.5)).toBe("+12.50");
    expect(fmtNum(-3.7)).toBe("-3.70");
  });
  it("collapses thousands with K suffix", () => {
    expect(fmtNum(1_250)).toBe("+1.25K");
    expect(fmtNum(-9_999)).toBe("-10.00K");
  });
  it("collapses millions with M suffix", () => {
    expect(fmtNum(1_500_000)).toBe("+1.50M");
    expect(fmtNum(-2_345_678)).toBe("-2.35M");
  });
});

describe("nectarFormat.formatMemoryAge", () => {
  it("returns Ns when under a minute", () => {
    expect(formatMemoryAge(1000, 1042)).toBe("42s memory");
  });
  it("returns Nm when under an hour", () => {
    expect(formatMemoryAge(0, 60 * 5)).toBe("5m memory");
  });
  it("returns Nh with remainder minutes when under a day", () => {
    expect(formatMemoryAge(0, 60 * 60 * 3 + 60 * 12)).toBe("3h 12m memory");
    // Whole hours drop the remainder segment.
    expect(formatMemoryAge(0, 60 * 60 * 4)).toBe("4h memory");
  });
  it("returns Nd when over a day", () => {
    expect(formatMemoryAge(0, 60 * 60 * 24 * 3 + 60 * 60)).toBe("3d memory");
  });
  it("never returns a negative age", () => {
    // Future horizon (clock skew) should not produce a negative label.
    expect(formatMemoryAge(1000, 500)).toBe("0s memory");
  });
});

describe("nectarFormat.relTime", () => {
  const now = 1_700_000_000_000;
  it("renders 'just now' inside a second", () => {
    expect(relTime(now - 500, now)).toBe("just now");
  });
  it("renders seconds under a minute", () => {
    expect(relTime(now - 42_000, now)).toBe("42s ago");
  });
  it("renders minutes under an hour", () => {
    expect(relTime(now - 15 * 60_000, now)).toBe("15m ago");
  });
  it("renders hours under a day", () => {
    expect(relTime(now - 5 * 3_600_000, now)).toBe("5h ago");
  });
  it("renders days beyond that", () => {
    expect(relTime(now - 3 * 86_400_000, now)).toBe("3d ago");
  });
});

describe("nectarFormat.fidelityToTone", () => {
  it("maps OBSERVED / LIVE / FULL to ok", () => {
    expect(fidelityToTone("OBSERVED")).toBe(WM.state.ok);
    expect(fidelityToTone("LIVE_STREAM")).toBe(WM.state.ok);
    expect(fidelityToTone("FULL_FIDELITY")).toBe(WM.state.ok);
  });
  it("maps DERIVED / PARTIAL to watch", () => {
    expect(fidelityToTone("DERIVED")).toBe(WM.state.watch);
    expect(fidelityToTone("PARTIAL")).toBe(WM.state.watch);
  });
  it("maps INFERRED / STALE / UNAVAILABLE to warn", () => {
    expect(fidelityToTone("INFERRED")).toBe(WM.state.warn);
    expect(fidelityToTone("STALE")).toBe(WM.state.warn);
    expect(fidelityToTone("UNAVAILABLE")).toBe(WM.state.warn);
  });
  it("null falls back to dim (UNKNOWN)", () => {
    expect(fidelityToTone(null)).toBe(WM.text.dim);
  });
  it("unknown vocabulary falls back to muted, not fake ok", () => {
    expect(fidelityToTone("something_else")).toBe(WM.text.muted);
  });
});

describe("nectarFormat.coverageTone", () => {
  it("LIVE → ok, STALE → warn", () => {
    expect(coverageTone("LIVE")).toBe(WM.state.ok);
    expect(coverageTone("STALE")).toBe(WM.state.warn);
    expect(coverageTone("UNAVAILABLE")).toBe(WM.state.warn);
    expect(coverageTone("DEGRADED")).toBe(WM.state.watch);
    expect(coverageTone("CONNECTING")).toBe(WM.state.watch);
    expect(coverageTone("SOMETHING_NEW")).toBe(WM.text.muted);
  });
});

describe("nectarFormat.memoryStateTone", () => {
  it("RETAINED / SUMMARY_ONLY → ok, SESSION_ONLY → watch, else dim", () => {
    expect(memoryStateTone("RETAINED")).toBe(WM.state.ok);
    expect(memoryStateTone("SUMMARY_ONLY")).toBe(WM.state.ok);
    expect(memoryStateTone("SESSION_ONLY")).toBe(WM.state.watch);
    expect(memoryStateTone("NO_MEMORY")).toBe(WM.text.dim);
  });
});

describe("nectarFormat.persistenceRightTone", () => {
  it("ALLOWED → ok, everything else → warn (fail-closed)", () => {
    expect(persistenceRightTone("ALLOWED")).toBe(WM.state.ok);
    expect(persistenceRightTone("UNKNOWN")).toBe(WM.state.warn);
    expect(persistenceRightTone("DENIED")).toBe(WM.state.warn);
  });
});
