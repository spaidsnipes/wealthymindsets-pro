import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHART_TF_SHIPPED, getTimeframe, timeframeSpokenName } from "./timeframes";

/**
 * MEASURED LIVE 2026-09-17 on https://wealthymindsetspro.com/charts (NQ1!, 30m):
 * all nine timeframe buttons returned
 *   aria-pressed: null, aria-current: null, aria-selected: null,
 *   role: null, aria-label: null, title: ""
 * and the selected one differed from the other eight by exactly ONE thing —
 * a background colour class.
 *
 * Two defects compound there:
 *
 *  1. COLOUR CARRIES STATE ALONE. Which timeframe is active is not decoration:
 *     it is the provenance word printed on the biggest number on the product
 *     ("29699.75 LAST 30m BAR CLOSE"). A user who cannot see the blue cannot
 *     read that sentence.
 *
 *  2. `1m` AND `1M` ARE SPOKEN IDENTICALLY. One minute and one month are
 *     ~43,200x apart. A control whose two ends are indistinguishable by ear is
 *     not a labelled control.
 *
 * The spoken name is DERIVED from `candleIntervalSec` — the same number the
 * fetch path hands the provider — so the announced name cannot drift from the
 * bars actually drawn.
 */
function codeOf(rel: string): string {
  return readFileSync(join(process.cwd(), "src", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("timeframeSpokenName — the announced name is derived, never retyped", () => {
  it("× THE MINUTE THAT SOUNDS LIKE A MONTH: 1m and 1M do not collide", () => {
    expect(timeframeSpokenName("1m")).toBe("1 minute bars");
    expect(timeframeSpokenName("1M")).toBe("1 month bars");
    expect(timeframeSpokenName("1m")).not.toBe(timeframeSpokenName("1M"));
  });

  it("every shipped timeframe has a distinct spoken name", () => {
    const spoken = CHART_TF_SHIPPED.map(timeframeSpokenName);
    expect(new Set(spoken).size, `collision among: ${spoken.join(" | ")}`).toBe(spoken.length);
  });

  it("the sub-day names are computed from candleIntervalSec, not typed", () => {
    // If a name were hand-written it could survive a table change silently.
    for (const id of CHART_TF_SHIPPED) {
      const sec = getTimeframe(id).candleIntervalSec;
      if (sec < 3600) {
        expect(timeframeSpokenName(id)).toBe(`${sec / 60} minutes bars`.replace("1 minutes", "1 minute"));
      } else if (sec % 3600 === 0 && sec < 86_400) {
        const h = sec / 3600;
        expect(timeframeSpokenName(id)).toBe(`${h} hour${h === 1 ? "" : "s"} bars`);
      }
    }
  });

  it("calendar units are named as calendar units — 1M is not '30 days'", () => {
    // The canonical table stores 1M as 30 days because seconds is the only
    // unit a fetch can carry. Announcing "30 days bars" would be a DIFFERENT
    // claim than the button makes.
    expect(getTimeframe("1M").candleIntervalSec).toBe(30 * 86_400);
    expect(timeframeSpokenName("1M")).not.toContain("day");
    expect(timeframeSpokenName("1D")).toBe("1 day bars");
    expect(timeframeSpokenName("1W")).toBe("1 week bars");
  });
});

describe("chart toolbar adoption — the selected timeframe is said, not only coloured", () => {
  const CODE = codeOf("components/chart/ChartToolbar.tsx");
  const at = CODE.indexOf("wm-chart-timeframes");
  const group = CODE.slice(at, CODE.indexOf("</div>", at));

  it("× THE UNHEARD GROUP: aria-label on a bare div reaches no one", () => {
    expect(at, "the timeframe group vanished").toBeGreaterThan(-1);
    expect(group, "the group carries a name with no role to hang it on").toContain('role="group"');
  });

  it("× THE COLOUR-ONLY SELECTION: every button declares pressed state", () => {
    expect(group).toContain("aria-pressed={active}");
  });

  it("× THE RETYPED LABEL: the spoken name comes from the canonical owner", () => {
    expect(group).toMatch(/aria-label=\{spoken\}/);
    expect(CODE).toContain("timeframeSpokenName(tf.emit)");
  });
});
