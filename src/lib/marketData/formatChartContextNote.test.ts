/**
 * The chart-context line handed to the model in /api/spaidbot.
 *
 * WHY THESE TESTS EXIST (2026-09-05). The route built the note inline with
 * `if (context.changePct !== undefined)`. The zero-pair — `change === 0 &&
 * changePct === 0`, the "no reference close yet" sentinel that
 * useWebSocket.flush() leaves behind — is very much `!== undefined`, so on a
 * closed Saturday the assistant's own prompt said:
 *
 *   [Current chart: GC1! @ $4,476.60 (+0.00%)]
 *
 * while the SYSTEM_PROMPT three hundred characters above it said "Never invent
 * current prices" and "When live evidence is missing, say exactly what is
 * missing". The model cannot disclose a gap it was never shown.
 *
 * Two properties are pinned below, and they are not the same property:
 *   1. An unbacked percentage is never printed.
 *   2. Its absence is DISCLOSED. Silence is not good enough — a note that just
 *      omits the percentage reads as an unremarkable chart, and the route has
 *      already promised the model it will be told what is missing.
 */

import { describe, it, expect } from "vitest";
import { formatChartContextNote } from "./formatChartContextNote";

const DISCLOSURE = /day change unavailable/i;

describe("prints a percentage only when a real reference close backs it", () => {
  it("refuses the zero-pair that was reaching the model as '(+0.00%)'", () => {
    const note = formatChartContextNote({
      symbol: "GC1!",
      price: 4476.6,
      change: 0,
      changePct: 0,
    });
    // The literal that was observed in the prompt, in both sign forms.
    expect(note).not.toContain("+0.00%");
    expect(note).not.toContain("0.00%");
    expect(note).not.toContain("%");
    expect(note).toMatch(DISCLOSURE);
  });

  it("prints a backed change, with an explicit sign", () => {
    expect(
      formatChartContextNote({ symbol: "GC1!", price: 4476.6, change: -15.2, changePct: -0.34 }),
    ).toContain("(-0.34%)");
    expect(
      formatChartContextNote({ symbol: "NQ1!", price: 21820, change: 180.5, changePct: 0.83 }),
    ).toContain("(+0.83%)");
  });

  it("refuses a hand-crafted body that supplies changePct without change", () => {
    // /api/spaidbot is reachable by any authenticated client. The percentage
    // alone cannot prove a reference close exists, so a POST that omits the
    // absolute must not be able to talk the server into printing one.
    const note = formatChartContextNote({ symbol: "GC1!", price: 4476.6, changePct: -0.34 });
    expect(note).not.toContain("-0.34%");
    expect(note).toMatch(DISCLOSURE);
  });

  it("refuses non-finite numbers", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const note = formatChartContextNote({ symbol: "GC1!", change: bad, changePct: bad });
      expect(note).not.toContain("%");
      expect(note).toMatch(DISCLOSURE);
    }
  });

  it("keeps a flat percent when the absolute move is real", () => {
    // Proves the guard keys on the PAIR. A sub-rounding move is a fact.
    expect(
      formatChartContextNote({ symbol: "GC1!", price: 4476.6, change: 0.004, changePct: 0 }),
    ).toContain("(+0.00%)");
  });
});

describe("absence is disclosed, not merely omitted", () => {
  it("names the gap and forbids the inference", () => {
    const note = formatChartContextNote({ symbol: "GC1!", price: 4476.6, change: 0, changePct: 0 });
    // Not just "no percentage" — an instruction the model can act on. Without
    // this sentence the note reads as an unremarkable chart and the assistant
    // is free to narrate a quiet session it was never shown.
    expect(note).toMatch(/do not state or imply a daily move/i);
  });

  it("discloses even when there is no price either", () => {
    expect(formatChartContextNote({ symbol: "GC1!" })).toMatch(DISCLOSURE);
  });
});

describe("the symbol and price halves", () => {
  it("returns nothing when there is no symbol to talk about", () => {
    expect(formatChartContextNote(null)).toBe("");
    expect(formatChartContextNote(undefined)).toBe("");
    expect(formatChartContextNote({})).toBe("");
    expect(formatChartContextNote({ symbol: "   " })).toBe("");
    expect(formatChartContextNote({ symbol: 12345, price: 4476.6 })).toBe("");
  });

  it("omits a price of 0 — that is not a price", () => {
    // The old inline builder used `if (context.price)`, which skipped this by
    // accident. Doing it on purpose means a future refactor to `!= null`
    // cannot quietly start printing "@ $0".
    const note = formatChartContextNote({ symbol: "GC1!", price: 0, change: 1, changePct: 1 });
    expect(note).not.toContain("$0");
    expect(note).toContain("GC1!");
  });

  it("omits a negative or non-finite price", () => {
    for (const bad of [-1, NaN, Infinity, "4476.60", null]) {
      expect(formatChartContextNote({ symbol: "GC1!", price: bad })).not.toContain("@");
    }
  });

  it("formats a real price with thousands separators", () => {
    expect(formatChartContextNote({ symbol: "GC1!", price: 4476.6 })).toContain("@ $4,476.6");
  });

  it("is delimited so it cannot bleed into the user's own sentence", () => {
    const note = formatChartContextNote({ symbol: "GC1!", price: 4476.6, change: 1, changePct: 1 });
    expect(note.startsWith("\n\n[Current chart:")).toBe(true);
    expect(note.endsWith("]")).toBe(true);
  });
});

describe("never throws on a malformed body", () => {
  it("survives every field being the wrong type", () => {
    const hostile: unknown[] = [
      { symbol: "GC1!", price: {}, change: [], changePct: () => 0 },
      { symbol: "GC1!", price: "abc", change: "0", changePct: "0" },
      { symbol: "GC1!", change: null, changePct: null },
      { symbol: ["GC1!"] },
      [],
      "GC1!",
      0,
    ];
    for (const body of hostile) {
      expect(() => formatChartContextNote(body as never)).not.toThrow();
    }
  });
});

describe("the note itself cannot claim liveness", () => {
  it("never dates the change", () => {
    // A date word is a liveness claim (Canon §8). This note has no clock and
    // no session-closure input, so it may not say when the move happened.
    const note = formatChartContextNote({
      symbol: "GC1!",
      price: 4476.6,
      change: -15.2,
      changePct: -0.34,
    });
    expect(note).not.toMatch(/\b(today|last session|live|current(ly)? trading)\b/i);
  });
});

/**
 * The Founder's 2026-09-12 TIMEFRAME LAW (WM Pro Operating System Build Order):
 * "Every material thesis/evidence fact carries timeframe. 1m = execution/response
 * context. 5–15m = location/ORB context. 1H–D = regime/structure context. Spaidbot
 * and Thesis must name the timeframe of claims when ambiguity would change
 * meaning. Blending daily regime with 1m response into one unlabeled claim is
 * CROSS_WIRED."
 *
 * Before this fence, the model received "[Current chart: TSLA @ $365.25]" with
 * no timeframe. It could not tell whether the trader was reading a 1m response
 * or a 1H regime, so anything it said blended the two — the exact CROSS_WIRED
 * shape the Founder's law names.
 */
describe("timeframe accompanies every claim (TIMEFRAME LAW)", () => {
  it("prints the timeframe right after the symbol", () => {
    // The reader parses "TSLA 15m" as one identity, the way a trader reads
    // their own chart tab. Any word between the symbol and the price would
    // fight that reading.
    const note = formatChartContextNote({ symbol: "TSLA", timeframe: "15m", price: 365.25 });
    expect(note).toContain("[Current chart: TSLA 15m @");
  });

  it("names the absence when a caller sends no timeframe", () => {
    // A hand-crafted POST from a third client (or a mid-migration caller) may
    // arrive without timeframe. The route already promises the model it will
    // be told what is missing, so silence is not an option — an unlabeled
    // claim is precisely CROSS_WIRED.
    const note = formatChartContextNote({ symbol: "TSLA", price: 365.25 });
    expect(note).toContain("(timeframe unspecified)");
    expect(note).not.toContain("[Current chart: TSLA @");
  });

  it("does not accept a non-string timeframe as a real one", () => {
    // The wire is `unknown`; a body carrying `timeframe: 5` (a number, or
    // worse, an object) must not be printed as if a trader chose it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const note = formatChartContextNote({ symbol: "TSLA", timeframe: 5 as any, price: 365.25 });
    expect(note).toContain("(timeframe unspecified)");
  });

  it("trims whitespace so ' 15m ' does not render as double-spaced prose", () => {
    const note = formatChartContextNote({ symbol: "TSLA", timeframe: "  15m  ", price: 365.25 });
    expect(note).toContain("[Current chart: TSLA 15m @");
  });
});

/**
 * Founder truth-surface law (2026-09-12, Grok-review delta): "Minimum directly
 * inspectable: role + asOf + source. Missing role = UNKNOWN." The visible
 * strip carries all three. The Spaidbot wire was still missing ROLE — the
 * model received a price with no way to know whether it was streaming, twelve
 * hours stale, or an unavailable placeholder. A stale close could therefore
 * be quoted with the same confidence as a real print.
 */
describe("role accompanies every price (truth-surface law, ROLE half)", () => {
  it("prints the canonical role right after the price", () => {
    const note = formatChartContextNote({
      symbol: "TSLA",
      timeframe: "15m",
      role: "STALE",
      price: 365.25,
    });
    expect(note).toContain("$365.25 [role STALE]");
  });

  it("normalises casing so 'live' still counts as LIVE", () => {
    // The wire is `unknown` — a caller who lowercased must not accidentally
    // graduate to "role UNKNOWN" as if they meant nothing.
    const note = formatChartContextNote({ symbol: "TSLA", role: "live", price: 100 });
    expect(note).toContain("[role LIVE]");
  });

  it("prints [role UNKNOWN] when no role is supplied", () => {
    // Silence in this slot is the whole hazard — the pre-atom-3 sentence
    // "[Current chart: TSLA 15m @ $365.25]" let the model assume streaming
    // truth by default. The note now says out loud that it doesn't know.
    const note = formatChartContextNote({ symbol: "TSLA", price: 365.25 });
    expect(note).toContain("[role UNKNOWN]");
  });

  it("rejects roles that are not in the canonical set", () => {
    // "FRESH" and "REAL_TIME" and "OK" are the kinds of made-up strings a
    // hostile or careless caller might POST. Every one collapses to UNKNOWN
    // — the note may not print a verdict the market-data producer would not.
    for (const bogus of ["FRESH", "REAL_TIME", "OK", "GREEN", "gogogo", ""]) {
      const note = formatChartContextNote({ symbol: "TSLA", role: bogus, price: 100 });
      expect(note, `bogus role ${JSON.stringify(bogus)} leaked into the note`).toContain("[role UNKNOWN]");
    }
  });

  it("rejects a non-string role (a number, an object) rather than stringifying it", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n1 = formatChartContextNote({ symbol: "TSLA", role: 42 as any, price: 100 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n2 = formatChartContextNote({ symbol: "TSLA", role: { name: "LIVE" } as any, price: 100 });
    expect(n1).toContain("[role UNKNOWN]");
    expect(n2).toContain("[role UNKNOWN]");
  });
});

/**
 * The canonical role set duplicated in formatChartContextNote.ts must stay in
 * step with MarketQualityState — a role the producer can emit that this file
 * doesn't recognise would silently collapse to UNKNOWN, and a role this file
 * accepts that the producer cannot emit would let a hostile client mint a
 * verdict. Static assertion, no runtime dependency between the two.
 */
import type { MarketQualityState } from "./canonicalMarketState";
describe("the note's canonical role set matches the producer's", () => {
  it("every MarketQualityState is recognised by canonicalRole", () => {
    // Compile-time enumeration: if a new role is added upstream it must be
    // added below, and this test will fail until formatChartContextNote knows
    // about it too.
    const roles: MarketQualityState[] = [
      "LIVE", "DELAYED", "STALE", "PARTIAL", "PROXY", "REPLAY", "UNAVAILABLE",
    ];
    for (const r of roles) {
      const note = formatChartContextNote({ symbol: "TSLA", role: r, price: 100 });
      expect(note, `producer role ${r} was not recognised`).toContain(`[role ${r}]`);
    }
  });
});
