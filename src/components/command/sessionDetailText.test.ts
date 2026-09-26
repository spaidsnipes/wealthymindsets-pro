import { describe, it, expect } from "vitest";
import { selectCanonicalSessionPresentation } from "../../lib/marketData/canonicalIdentity";

/**
 * September 2026 lines up so that the 6th is a Sunday and the 5th a Saturday —
 * the actual weekend on which the SESSION tile's self-contradiction was read
 * off production. dayOfWeek `d` maps to a real date with that MARKET day.
 *
 * These were local-midnight Dates, and the drift-guard below read `getDay()`,
 * which is ALSO the local day — so the guard agreed with the broken table and
 * proved nothing. Both now speak ET, which is the clock the presenter reads.
 */
import {
  ET_DAY_BY_INDEX as DAY_TO_DATE,
  etWeekday,
} from "../../lib/marketData/marketDayFixtures";

function present(session: string, connected: boolean, dayOfWeek: number, symbol = "TSLA", observedActivityAt: number | null = null) {
  const at = DAY_TO_DATE[dayOfWeek];
  // A guard, not decoration: if this table ever drifts, the tests below would
  // silently start asserting a different day than their titles claim.
  const ET_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  expect(
    etWeekday(at),
    `DAY_TO_DATE[${dayOfWeek}] must be a real day-${dayOfWeek} IN MARKET TIME`,
  ).toBe(ET_NAMES[dayOfWeek]);
  return selectCanonicalSessionPresentation({
    symbol,
    requestedSession: session,
    connected,
    at,
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
    // A weekday: Sunday noon ET is now PROVEN closed for futures (the weekly
    // edge, 2026-09-26), so the unestablished case is asked mid-week.
    expect(present("RTH", false, 3, "ES1!", null)).toMatchObject({
      value: "SESSION UNKNOWN",
      activity: "UNKNOWN",
    });
  });
});

/* ── The half this file never looked at ──────────────────────────────────
 *
 * Every assertion above reads `.detail`. Not one reads `.value`. That is how
 * the SESSION tile shipped, for weeks, rendering this on a Saturday:
 *
 *     value  →  "RTH"
 *     detail →  "market closed"
 *
 * One tile, two adjacent DOM nodes, opposite claims — and a green suite,
 * because I-Bkt 6 fixed the caption and locked the caption. Asserting the half
 * you just repaired and never the half you didn't touch certifies the whole
 * tile on the strength of one corner of it.
 *
 * `present("RTH", true, 6)` on line 33 is a literal specification of the
 * contradiction: session RTH, Saturday, and the only thing checked is the
 * subtitle. The lie was in the return object the whole time.
 */
describe("SESSION tile value — the headline may not contradict its own caption", () => {
  it("THE CORE REGRESSION: Saturday equities render CLOSED, never the store key RTH", () => {
    const p = present("RTH", true, 6);
    expect(p.value).toBe("CLOSED");
    expect(p.value).not.toBe("RTH");
    expect(p.detail).toBe("market closed");
  });

  it("value and detail never state opposite things about closure, on any day", () => {
    // The invariant the tile violated: if the caption says the market is
    // closed, the headline may not name a running session, and vice versa.
    const RUNNING_SESSION_TOKENS = ["RTH", "EXTENDED", "ETH", "OVERNIGHT"];
    for (const symbol of ["TSLA", "SPY", "AAPL"]) {
      for (let d = 0; d <= 6; d++) {
        for (const connected of [true, false]) {
          const p = present("RTH", connected, d, symbol);
          if (p.detail === "market closed") {
            expect(RUNNING_SESSION_TOKENS, `${symbol} day ${d} connected=${connected}`)
              .not.toContain(p.value);
          }
        }
      }
    }
  });

  it("never renders a store-key session token as the value, for any symbol or day", () => {
    for (const symbol of ["TSLA", "SPY", "BTC", "ETH", "GC1!", "NQ1!"]) {
      for (let d = 0; d <= 6; d++) {
        const { value } = present("RTH", true, d, symbol);
        expect(["RTH", "EXTENDED", "OVERNIGHT"], `${symbol} day ${d}`).not.toContain(value);
      }
    }
  });

  it("Saturday futures say CLOSED rather than shrugging SESSION UNKNOWN", () => {
    // Same false humility the mobile pill had. Closure IS proven on a Saturday.
    for (const sym of ["GC1!", "NQ1!", "ES1!"]) {
      expect(present("RTH", false, 6, sym, null).value, sym).toBe("CLOSED");
    }
  });

  it("but observed activity still outranks the calendar — no CLOSED over a real print", () => {
    // If a trade was actually seen, the market demonstrably is not closed.
    // Stamping CLOSED on top of live evidence is this same overreach inverted.
    expect(present("RTH", true, 6, "NQ1!", 1_000).value).toBe("FUTURES ACTIVITY OBSERVED");
  });

  it("weekday equities are honestly unknown — there is still no intraday calendar", () => {
    for (let d = 1; d <= 5; d++) {
      expect(present("RTH", true, d).value, `day ${d}`).toBe("SESSION ?");
    }
  });

  it("crypto keeps 24X7 and is never CLOSED, including both weekend days", () => {
    for (const d of [0, 6]) {
      const p = present("RTH", true, d, "BTC");
      expect(p.value).toBe("24X7");
      expect(p.detail).not.toBe("market closed");
    }
  });

  it("at: null yields no session claim at all — the first paint may not assert a day", () => {
    // The ribbon used to pass `new Date(nowMs ?? 0).getDay()`; new Date(0) is
    // 1970-01-01, a weekday. So every Saturday's first paint asserted a weekday.
    for (const symbol of ["TSLA", "GC1!", "SPY"]) {
      const p = selectCanonicalSessionPresentation({
        symbol,
        requestedSession: "RTH",
        connected: true,
        at: null,
        observedActivityAt: null,
        evaluatedAt: 2_000,
      });
      expect(p.value, symbol).not.toBe("CLOSED");
      expect(p.detail, symbol).not.toBe("market closed");
      expect(["RTH", "EXTENDED", "OVERNIGHT"], symbol).not.toContain(p.value);
    }
  });
});
