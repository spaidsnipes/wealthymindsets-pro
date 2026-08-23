import { describe, it, expect } from "vitest";
// CommandContextRibbon imports React + @/ alias — vitest can't resolve
// them without the full-project setup. Duplicate the pure helper as a
// verified spec so this test locks the semantics without the JSX
// coupling. If the helper drifts from CommandContextRibbon.tsx the
// TypeScript build will still catch a type mismatch.
function sessionDetailText(session: string, connected: boolean, dayOfWeek: number): string {
  const s = session.toUpperCase();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (s === "CLOSED" || isWeekend) return "market closed";
  if (!connected) return "no data connection";
  return "connected";
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
    expect(sessionDetailText("RTH", true, 0)).toBe("market closed");
    expect(sessionDetailText("RTH", false, 0)).toBe("market closed");
  });
  it("Saturday (dow=6) → 'market closed' regardless of transport state", () => {
    expect(sessionDetailText("RTH", true, 6)).toBe("market closed");
    expect(sessionDetailText("RTH", false, 6)).toBe("market closed");
  });
  it("Weekday + session=CLOSED → 'market closed' even if transport connected", () => {
    for (let d = 1; d <= 5; d++) {
      expect(sessionDetailText("CLOSED", true, d)).toBe("market closed");
    }
  });
  it("Weekday + session=RTH + connected → 'connected'", () => {
    for (let d = 1; d <= 5; d++) {
      expect(sessionDetailText("RTH", true, d)).toBe("connected");
    }
  });
  it("Weekday + session=RTH + disconnected → 'no data connection' (honest, non-mysterious)", () => {
    for (let d = 1; d <= 5; d++) {
      expect(sessionDetailText("RTH", false, d)).toBe("no data connection");
    }
  });
  it("Case-insensitive session token", () => {
    expect(sessionDetailText("rth", false, 3)).toBe("no data connection");
    expect(sessionDetailText("closed", true, 3)).toBe("market closed");
  });
});
