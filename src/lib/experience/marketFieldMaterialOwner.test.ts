/**
 * SCENE_FRAGMENTATION guard — ONE OWNER for the market field's material.
 *
 * `chartsRoomChrome.test.ts` cured five files that painted their own opaque
 * slab around MARKET. Its FRAME list is:
 *
 *   ChartToolbar · LeftDrawingSidebar · StockInfoPanel · ChartsDashboard ·
 *   TimeframeSelector
 *
 * `MainChart.tsx` is not on it — and MainChart owns the market field itself.
 * So the largest surface in the product kept the defect after its five
 * neighbours were fixed.
 *
 * ── THE DEFECT THIS PINS ──────────────────────────────────────────────
 * MainChart's wrapper paints the canonical material:
 *
 *   background: chartSettings?.background ?? "#0B0E1A"
 *
 * The 28px OHLCV strip directly inside it used to paint:
 *
 *   background: "#0B0E1A"
 *
 * A hardcoded restatement of the same value. This is the VACUOUS AGREEMENT
 * shape: a duplicate owner that agrees with the true owner in the DEFAULT
 * case, and that agreement is precisely what let it survive review. It
 * diverges the instant the trader changes the chart background in Appearance,
 * at which point MARKET's own price truth renders as a foreign slab floating
 * inside the market field.
 *
 * MEASURED LIVE on production before the fix — /charts?symbol=TSLA with
 * `wm_chartSettings.background` set to `#241014`:
 *
 *   strip        -> rgb(11, 14, 26)
 *   market field -> rgb(36, 16, 20)   divergent: true
 *
 * ── WHY A SOURCE-LEVEL GATE ───────────────────────────────────────────
 * `tsc --noEmit` is structurally blind to every line of this: `background:
 * "#0B0E1A"` is a perfectly well-typed `React.CSSProperties`. Mounting tests
 * are blind too — the defect is a COLOUR, and it renders happily at the
 * default setting, which is the only setting a fixture would use. Only an
 * assertion on the source can hold it.
 *
 * ── THE TRAP THIS SUITE ENCODES ───────────────────────────────────────
 * The comment in MainChart.tsx explaining the fix NAMES `#0B0E1A` several
 * times. A naive `not.toMatch` would fail on the very prose documenting the
 * cure. Every negative assertion below runs on comment-stripped source.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const READ = (rel: string) => readFileSync(resolve(__dirname, "../..", rel), "utf8");

/** Strip block and line comments so prose about a hex cannot fail a gate. */
const CODE = (rel: string) =>
  READ(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const MAIN_CHART = "components/chart/MainChart.tsx";

describe("the market field has ONE material owner", () => {
  it("VACUITY GUARD: the scan actually read MainChart", () => {
    // Every negative assertion below is of the form "this pattern does NOT
    // appear". A typo'd path, a moved file, or a comment-stripper that ate the
    // whole buffer would make ALL of them pass while policing nothing — the
    // exact failure `lib/ops/sentinelsProveTheyScanned.test.ts` exists to
    // catch, and the same VACUOUS AGREEMENT shape this suite polices, turned
    // on the suite itself. Prove the read found material FIRST and loudly.
    const src = CODE(MAIN_CHART);
    expect(
      src.length,
      "MainChart.tsx read back nearly empty — this Sentinel's scan has drifted " +
        "and every gate below is passing vacuously",
    ).toBeGreaterThan(100_000);
    // And prove the stripper left the STYLE layer intact, not just bytes.
    expect(
      (src.match(/background:/g) ?? []).length,
      "no `background:` declarations survived the comment strip — the gates " +
        "below are looking at the wrong text",
    ).toBeGreaterThan(20);
  });

  it("THE DEFECT: no element restates the FIELD fill as a bare literal", () => {
    // The shape being outlawed is an inline style prop assigning the market
    // field's own value DIRECTLY:   background: "#0B0E1A"
    // as opposed to the canonical read, which is legal and required:
    //                               background: chartSettings?.background ?? "#0B0E1A"
    // The regex only matches the former, because the latter has an
    // identifier — not a quote — immediately after the colon.
    //
    // DELIBERATELY BOUNDED TO THE FIELD VALUE. MainChart also contains many
    // opaque interior surfaces — context menus, tool popovers, settings
    // panels — painted `#0E1322` / `#141824` / `#2A3350`. Those are NOT the
    // room boundary and they are REQUIRED to stay opaque: they float over
    // live candles and glass there would be an accessibility regression, the
    // same "popover exception" that `chartsRoomChrome.test.ts` protects as
    // trap 2. Widening this sweep to every hex would make the gate a demand
    // to break that law. Only the field's own material has one owner.
    const src = CODE(MAIN_CHART);
    const bare = src.match(/background:\s*"#0B0E1A"/g) ?? [];
    expect(
      bare,
      "a second owner is painting the market field's material; it will " +
        "diverge from chartSettings.background the moment the trader " +
        "changes it in Appearance",
    ).toEqual([]);
  });

  it("THE DEFECT: the OHLCV strip carries no fill of its own", () => {
    // Targeted at the exact element, so a future refactor that reintroduces
    // the slab under a different literal still turns this red.
    const src = CODE(MAIN_CHART);
    const strip = src.match(/\{\s*height:\s*28,\s*flexShrink:\s*0,\s*background:\s*([^}]*)\}/);
    expect(strip, "the 28px OHLCV strip style object is missing").not.toBeNull();
    expect(strip![1].trim().replace(/,$/, "")).toBe('"transparent"');
  });

  it("the canonical owner still paints the field — we removed a duplicate, not the fill", () => {
    // OVER-CORRECTION GUARD. Deleting the strip's fill is only correct
    // because the wrapper has one. If a later change strips the wrapper too,
    // the market field loses its material entirely and the defect becomes a
    // worse defect. Pin the real owner.
    expect(CODE(MAIN_CHART)).toMatch(
      /background:\s*chartSettings\?\.background\s*\?\?\s*"#0B0E1A"\s*,\s*touchAction/,
    );
  });

  it("the strip keeps its structural delimiter — a fill was removed, not the structure", () => {
    // OVER-CORRECTION GUARD. Canon calls for brass structural hairlines, not
    // for the removal of all structure. Transparency is the cure; erasing the
    // boundary between controls and candles is not.
    expect(CODE(MAIN_CHART)).toMatch(
      /height:\s*28,\s*flexShrink:\s*0,\s*background:\s*"transparent"[\s\S]{0,160}?border-b border-wm-border\/50/,
    );
  });

  it("renderer fills still read the canonical setting, never a naked constant", () => {
    // The chart engine and the overlay canvases need a concrete colour STRING
    // (lightweight-charts and 2D canvas cannot consume `transparent` for a
    // backing fill). Those call sites are legitimate — but each must DERIVE
    // the value from chartSettings rather than hardcode it.
    //
    // There is exactly one lawful non-fill use left: the active-chip label,
    // `color: active ? "#0B0E1A" : …`, which paints FOREGROUND text knocked
    // out of a gold pill. That is a contrast pairing with the pill, not a
    // claim about the room's material, so it does not take the field's owner.
    // It is named here rather than tolerated silently — an unnamed exception
    // is how the original duplicate survived in the first place.
    const src = CODE(MAIN_CHART);
    const hits = src.match(/"#0B0E1A"/g) ?? [];
    const guarded = src.match(/chartSettings[\s\S]{0,24}?\?\?\s*"#0B0E1A"/g) ?? [];
    // Pinned to the ternary itself. A looser `color:\s*…"#0B0E1A"` matches
    // lazily ACROSS newlines and swallows the lightweight-charts option
    // objects — `background: { color: chartSettings?.background ?? "#0B0E1A" }`
    // — which are already counted as guarded, double-counting them.
    const foreground = src.match(/color:\s*active\s*\?\s*"#0B0E1A"/g) ?? [];
    expect(foreground, "the knocked-out chip label is the only lawful non-fill use")
      .toHaveLength(1);
    expect(
      hits.length,
      "every #0B0E1A fill must be a fallback on a chartSettings read",
    ).toBe(guarded.length + foreground.length);
  });

  it("does not regress the five files chartsRoomChrome.test.ts already cured", () => {
    // The sibling gate owns those. This asserts only that the two suites
    // describe ONE law rather than two, so a future reader extending either
    // one finds the other.
    const sibling = READ("lib/experience/chartsRoomChrome.test.ts");
    expect(sibling).toContain("wm-room-chrome");
    expect(CODE(MAIN_CHART)).not.toContain("wm-room-chrome");
  });
});
