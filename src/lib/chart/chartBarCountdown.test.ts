import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLOSING_WINDOW_SECONDS, chartBarCountdown } from "./chartBarCountdown";

function codeOf(rel: string): string {
  return readFileSync(join(process.cwd(), "src", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * MEASURED LIVE 2026-09-17, NQ1! 30m: the strip read
 *   "... V 4  15:12  LAST 07:04 PM"
 * `15:12` is 15 minutes 12 seconds left in a 30-minute bar. `07:04 PM` is a
 * clock time. They were adjacent, and only one of them said which it was.
 */
const HALF_HOUR = 1800;
const REMAINING = 15 * 60 + 12;

describe("chartBarCountdown — a duration wearing a clock's clothes", () => {
  it("× THE COLON: the glyph can never be read as a time of day", () => {
    for (const [rem, iv] of [
      [REMAINING, HALF_HOUR],
      [3600 * 2 + 61, 86_400],
      [59, 60],
      [12, 15],
    ] as const) {
      const g = chartBarCountdown(rem, iv, true).glyph;
      expect(g, `"${g}" still contains a clock separator`).not.toContain(":");
      expect(g, `"${g}" carries no unit`).toMatch(/[smh]/);
    }
  });

  it("the live 30m reading becomes 15m 12s, not 15:12", () => {
    const c = chartBarCountdown(REMAINING, HALF_HOUR, true);
    expect(c.glyph).toBe("15m 12s");
    expect(c.kind).toBe("LIVE_BAR");
  });

  it("sub-minute intervals keep the bare seconds form — it was never ambiguous", () => {
    expect(chartBarCountdown(12, 15, true).glyph).toBe("12s");
  });

  it("hour-plus intervals name every unit", () => {
    expect(chartBarCountdown(3661, 86_400, true).glyph).toBe("1h 01m 01s");
  });

  it("× THE UNASKED BADGE: a degraded feed says the number is the CLOCK only", () => {
    // The defect: `barEnd - now` consults the wall clock and the timeframe and
    // nothing else, so it counted down confidently over a frozen candle.
    const c = chartBarCountdown(REMAINING, HALF_HOUR, false, "DELAYED");
    expect(c.kind).toBe("CLOCK_ONLY");
    expect(c.title).toMatch(/CLOCK ONLY/);
    expect(c.title).toMatch(/will not complete when this reaches zero/);
    expect(c.title).toContain("DELAYED");
  });

  it("§35: the remaining time is NEVER withheld, on any verdict", () => {
    // Blanking the countdown on a degraded feed trades an overclaim for a
    // blindness, which is the same family of defect.
    for (const live of [true, false]) {
      expect(chartBarCountdown(REMAINING, HALF_HOUR, live).glyph).toBe("15m 12s");
    }
  });

  it("the live and degraded sentences are genuinely different readings", () => {
    const live = chartBarCountdown(REMAINING, HALF_HOUR, true);
    const dead = chartBarCountdown(REMAINING, HALF_HOUR, false, "STALE");
    expect(live.title).not.toBe(dead.title);
    expect(live.spoken).not.toBe(dead.spoken);
    expect(live.title).toMatch(/now forming on this chart closes/);
  });

  it("× THE URGENCY THAT IS NOT EARNED: closing only flashes on a live bar", () => {
    expect(chartBarCountdown(3, HALF_HOUR, true).closing).toBe(true);
    expect(chartBarCountdown(3, HALF_HOUR, false, "STALE").closing).toBe(false);
    expect(chartBarCountdown(CLOSING_WINDOW_SECONDS + 1, HALF_HOUR, true).closing).toBe(false);
    // Zero is not "about to close" — it has closed, or nothing is arriving.
    expect(chartBarCountdown(0, HALF_HOUR, true).closing).toBe(false);
  });

  it("a missing interval is NO READING, not zero seconds left", () => {
    for (const bad of [null, undefined, 0, -1, Number.NaN]) {
      const c = chartBarCountdown(REMAINING, bad as never, true);
      expect(c.kind, String(bad)).toBe("UNKNOWN");
      expect(c.glyph, String(bad)).toBe("—");
      expect(c.title, String(bad)).toMatch(/UNKNOWN/);
    }
    expect(chartBarCountdown(Number.NaN, HALF_HOUR, true).kind).toBe("UNKNOWN");
  });

  it("the interval is named in words, so the hover says WHICH bar", () => {
    expect(chartBarCountdown(60, HALF_HOUR, true).title).toContain("30-minute bar");
    expect(chartBarCountdown(60, 3600, true).title).toContain("1-hour bar");
    expect(chartBarCountdown(3, 15, true).title).toContain("15-second bar");
    expect(chartBarCountdown(60, 86_400, true).title).toContain("1-day bar");
  });

  it("a blank feed label degrades the wording, never the verdict", () => {
    const c = chartBarCountdown(REMAINING, HALF_HOUR, false, "   ");
    expect(c.kind).toBe("CLOCK_ONLY");
    expect(c.title).toContain("not live");
  });

  it("the countdown is spoken, not hover-only", () => {
    expect(chartBarCountdown(REMAINING, HALF_HOUR, true).spoken).toMatch(/until the 30-minute bar closes/);
    expect(chartBarCountdown(REMAINING, HALF_HOUR, false, "DELAYED").spoken).toMatch(/not tracking it/);
  });
});

describe("MainChart adoption", () => {
  const CODE = codeOf("components/chart/MainChart.tsx");

  it("× THE UNCONSULTED OWNER: the strip compiles through chartBarCountdown", () => {
    expect(CODE).toContain("chartBarCountdown(");
  });

  it("× THE COLON FORMATTER: the old clock-shaped formatter is gone", () => {
    expect(CODE, "formatCountdown rebuilt the HH:MM ambiguity")
      .not.toMatch(/function formatCountdown/);
  });

  it("× THE COUNTDOWN THAT NEVER ASKED: feedLive is threaded from candleDataStatus", () => {
    expect(CODE).toContain("candleStatus.live");
    // And the status is compiled ONCE — a second call is a second opinion.
    expect((CODE.match(/candleDataStatus\(/g) || []).length).toBe(1);
  });

  it("the countdown reaches the eye, the hover and assistive tech", () => {
    expect(CODE).toContain("{barCountdown.glyph}");
    expect(CODE).toContain("title={barCountdown.title}");
    expect(CODE).toContain("aria-label={barCountdown.spoken}");
    expect(CODE).toContain("data-bar-countdown-kind={barCountdown.kind}");
  });

  it("the flash is chosen from the verdict, not from the raw remainder", () => {
    expect(CODE).toContain("barCountdown.closing");
    expect(CODE, "closeFlash is painting urgency straight from the remainder again")
      .not.toMatch(/closeFlash \? "text-wm-red"/);
  });

  it("FL-06 removes only the desktop pill shell and keeps the price instrument", () => {
    expect(CODE).toContain("candleCountdownUsesPillShell(W)");
    expect(CODE).toContain("progressRef.current * Math.PI * 2");
    expect(CODE).toContain("countdownRef.current");
    expect(CODE).toContain("closeFlashRef.current");
    expect(CODE).toContain("srs?.priceToCoordinate(lastBar.close)");
    expect(CODE).toContain("ctx.lineTo(x + boxW + 34, cy + 0.5)");
  });
});

describe("a PROVEN-closed market has no bar to count down to (GP12 §24)", () => {
  it("reads MARKET_CLOSED — never a ticking number toward a bar due days away", () => {
    const c = chartBarCountdown(1251, 3600, false, "SESSION CLOSED — LAST VERIFIED", true);
    expect(c.kind).toBe("MARKET_CLOSED");
    expect(c.glyph).toBe("CLOSED");
    expect(c.closing).toBe(false);
    expect(c.spoken).toContain("no bar is forming");
  });

  it("closure outranks even a live flag — the flag cannot conjure a forming bar", () => {
    expect(chartBarCountdown(3, 60, true, "LIVE", true).closing).toBe(false);
  });

  it("without proof of closure the clock reading is unchanged", () => {
    expect(chartBarCountdown(1251, 3600, false, "DEGRADED").kind).toBe("CLOCK_ONLY");
  });

  it("MainChart passes PROVEN closure only, hides the header countdown and the price-line pill", () => {
    const code = readFileSync(join(process.cwd(), "src", "components/chart/MainChart.tsx"), "utf8");
    expect(code).toMatch(/candleStatus\.label,\s*\/\/[^\n]*\n\s*sessionOpen === false,\s*\);/);
    expect(code).toContain('countdownRef.current = barCountdown.kind === "MARKET_CLOSED" ? "" : barCountdown.glyph;');
    // 2026-09-26 (H-501 permission): the pill also asks the permission table
    // (candleTimer SPEAKs at every depth).
    expect(code).toContain('if (candleTimerRef.current && countdownRef.current && att.paints("candleTimer")) {');
    expect(code).toContain('barCountdown.kind === "MARKET_CLOSED" ? "hidden" : ""');
  });
});
