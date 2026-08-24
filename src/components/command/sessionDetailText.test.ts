import { describe, it, expect } from "vitest";
import { selectCanonicalSessionPresentation } from "../../lib/marketData/canonicalIdentity";

function present(session: string, connected: boolean, dayOfWeek: number, symbol = "TSLA", observedActivityAt: number | null = null) {
  return selectCanonicalSessionPresentation({
    symbol,
    requestedSession: session,
    connected,
    dayOfWeek,
    observedActivityAt,
    evaluatedAt: 2_000,
  });
}

/**
 * I-Bkt 6: SESSION tile detail-text truth guard.
 *
 * Discovered on shift-H walk: /command-deck showed "SESSION RTH ·
 * disconnected" on Saturday. Truth is "market closed", not
 * "disconnected" — a Saturday user shouldn't think our data pipe
 * is broken; the market itself is closed.
 *
 * State matrix: session ∈ {RTH, ETH, OVERNIGHT, CLOSED} ×
 * connected ∈ {true, false} × dayOfWeek ∈ {0=Sun, 1..5=weekday, 6=Sat}.
 */

describe("sessionDetailText — weekend / market-closed / connection truth", () => {
  it("Sunday (dow=0) → 'market closed' regardless of transport state", () => {
    expect(present("RTH", true, 0).detail).toBe("market closed");
    expect(present("RTH", false, 0).detail).toBe("market closed");
  });
  it("Saturday (dow=6) → 'market closed' regardless of transport state", () => {
    expect(present("RTH", true, 6).detail).toBe("market closed");
    expect(present("RTH", false, 6).detail).toBe("market closed");
  });
  it("Weekday + session=CLOSED → 'market closed' even if transport connected", () => {
    for (let d = 1; d <= 5; d++) {
      expect(present("CLOSED", true, d).detail).toBe("market closed");
    }
  });
  it("Weekday + session=RTH + connected → 'connected'", () => {
    for (let d = 1; d <= 5; d++) {
      expect(present("RTH", true, d).detail).toBe("connected");
    }
  });
  it("Weekday + session=RTH + disconnected → 'no data connection' (honest, non-mysterious)", () => {
    for (let d = 1; d <= 5; d++) {
      expect(present("RTH", false, d).detail).toBe("no data connection");
    }
  });
  it("Case-insensitive session token", () => {
    expect(present("rth", false, 3).detail).toBe("no data connection");
    expect(present("closed", true, 3).detail).toBe("market closed");
  });
  it("Observed Sunday futures activity remains session UNKNOWN, never market closed", () => {
    expect(present("RTH", true, 0, "NQ1!", 1_000)).toMatchObject({
      value: "FUTURES ACTIVITY OBSERVED",
      detail: "session classification unavailable — no authoritative calendar",
      activity: "OBSERVED",
    });
  });
  it("Futures without observed activity remain session UNKNOWN", () => {
    expect(present("RTH", false, 0, "ES1!", null)).toMatchObject({
      value: "SESSION UNKNOWN",
      activity: "UNKNOWN",
    });
  });
});
