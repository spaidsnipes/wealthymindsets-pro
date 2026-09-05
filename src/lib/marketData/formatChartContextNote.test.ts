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
