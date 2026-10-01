/**
 * THE FULL LADDER ON THE GLASS — Garden 16 §24, "UX COMPRESSION ≠ FEATURE
 * DELETION" (2026-09-26).
 *
 * MEASURED ON THE GLASS before this existed (local /charts, real UI): the chip
 * offered exactly the nine CHART_TF_SHIPPED ids. 3m, 10m, 2h and 4h — which the
 * chart's first bar route serves natively — had no button anywhere, and the
 * canon's tick and seconds rungs were not even named. These cases pin the one
 * expandable control that fixes that, and pin it HONESTLY: an unavailable rung
 * is drawn, is not a button, and says why in words.
 */
import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { TimeframeGlassChip, TimeframeLadder, TIMEFRAME_LADDER_ID } from "./TimeframeGlassChip";
import { CANON_LADDER, canonRungSpokenName, type CanonRung } from "@/lib/timeframes";
import { canonAvailabilityFor } from "@/lib/marketData/chartBarRoute";

// The ladder these tests render is TSLA's: the glass never reads CANON_LADDER raw.
const TSLA_LADDER = CANON_LADDER.map(r => canonAvailabilityFor(r, "TSLA"));

/** Every element in a rendered tree, props and all — enough to press a button without a DOM. */
function elements(node: unknown, out: React.ReactElement<Record<string, unknown>>[] = []) {
  if (Array.isArray(node)) node.forEach(n => elements(n, out));
  else if (React.isValidElement(node)) {
    const el = node as React.ReactElement<Record<string, unknown>>;
    out.push(el);
    elements(el.props.children, out);
  }
  return out;
}
const textOf = (node: unknown): string =>
  typeof node === "string" || typeof node === "number" ? String(node)
    : Array.isArray(node) ? node.map(textOf).join("")
      : React.isValidElement(node) ? textOf((node.props as { children?: unknown }).children) : "";

const code = readFileSync(join(process.cwd(), "src/components/chart/TimeframeGlassChip.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("TimeframeLadder — every canon rung, honest about each", () => {
  const html = renderToStaticMarkup(<TimeframeLadder timeframe="15m" symbol="TSLA" onChoose={() => {}} />);

  it("draws all 23 canon rungs, grouped, under the panel the More control names", () => {
    expect(html).toContain(`id="${TIMEFRAME_LADDER_ID}"`);
    expect(html).toContain('aria-label="All timeframes"');
    for (const r of CANON_LADDER) expect(html, r.id).toMatch(new RegExp(`>${r.id}<`));
    const headings = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(m => m[1]);
    expect(headings).toEqual(["Tick &amp; seconds", "Minutes", "Hours", "Days &amp; longer"]);
  });

  it("a NATIVE rung is a real button; an UNAVAILABLE rung is NOT a button", () => {
    const tree = elements(TimeframeLadder({ timeframe: "15m", symbol: "TSLA", onChoose: () => {} }));
    for (const r of TSLA_LADDER) {
      const el = tree.find(e => e.props["data-availability"] && textOf(e).startsWith(r.id) && textOf(e).replace(/,.*$/, "") === r.id);
      expect(el, r.id).toBeDefined();
      if (r.availability === "UNAVAILABLE") {
        expect(el!.type, `${r.id} is unavailable but rendered as a ${String(el!.type)}`).toBe("span");
        expect(el!.props.onClick, `${r.id} is unavailable but pressable`).toBeUndefined();
        expect(el!.props.tabIndex).toBeUndefined();
      } else {
        expect(el!.type, r.id).toBe("button");
        expect(el!.props["aria-label"]).toBe(canonRungSpokenName(r));
      }
    }
    expect(tree.filter(e => e.type === "button")).toHaveLength(13);
  });

  it("every unavailable rung states its reason in visible words, not only a tooltip", () => {
    const visible = html.replace(/title="[^"]*"/g, "");
    for (const r of TSLA_LADDER) {
      if (r.availability !== "UNAVAILABLE") continue;
      expect(visible, `${r.id}'s reason is only in a title`).toContain(r.reason);
    }
    // One line per distinct reason, naming its rungs — the tape rungs read it once.
    expect(visible.split("Needs a certified trade tape").length - 1).toBe(1);
    expect(visible).toContain("TICK · 1s · 10s</span>: Needs a certified trade tape — none on this path.");
    // The seconds clocks are real chart ids now; no route serves them for an equity.
    expect(visible).toContain("5s · 15s · 30s");
  });

  it("marks the current timeframe — and only it — with aria-current", () => {
    const tree = elements(TimeframeLadder({ timeframe: "3m", symbol: "TSLA", onChoose: () => {} }));
    const current = tree.filter(e => e.props["aria-current"] === "true");
    expect(current.map(textOf)).toEqual(["3m"]);
  });

  it("pressing a NATIVE rung hands its chart id to onChoose — for every servable rung", () => {
    const onChoose = vi.fn();
    const tree = elements(TimeframeLadder({ timeframe: "15m", symbol: "TSLA", onChoose }));
    const buttons = tree.filter(e => e.type === "button");
    for (const b of buttons) (b.props.onClick as () => void)();
    const expected = TSLA_LADDER.flatMap(r => (r.availability === "UNAVAILABLE" ? [] : [r.chartTf]));
    expect(onChoose.mock.calls.map(c => c[0])).toEqual(expected);
    expect(expected).toEqual(["1m", "2m", "3m", "5m", "10m", "15m", "30m", "1h", "2h", "4h", "1D", "1W", "1M"]);
  });

  it("a DERIVED rung, when one exists, says 'derived' aloud and on the glass", () => {
    const derived: CanonRung = { id: "20m", group: "MINUTES", n: 20, unit: "minute", availability: "DERIVED_CANONICAL", chartTf: "10m" };
    const tree = elements(TimeframeLadder({ timeframe: "15m", symbol: "TSLA", onChoose: () => {}, rungs: [derived] }));
    const b = tree.find(e => e.type === "button")!;
    expect(b.props["aria-label"]).toMatch(/derived from finer bars$/);
    expect(textOf(b)).toContain("derived");
    expect(b.props["data-availability"]).toBe("DERIVED_CANONICAL");
  });
});

describe("TimeframeGlassChip — ONE expandable control, ONE door to the setter", () => {
  it("the strip's nine and the ladder's rungs both go through the same `choose`", () => {
    expect(code).toMatch(/const choose = \(id: TFId\) => \{ setTimeframe\(id\); setOpen\(false\); \};/);
    // The ONLY call of setTimeframe in the file is inside `choose`.
    expect(code.match(/setTimeframe\(/g)).toHaveLength(1);
    expect(code).toContain("onClick={() => choose(id)}");
    expect(code).toContain("<TimeframeLadder timeframe={timeframe} symbol={symbol} onChoose={choose} />");
  });

  it("the More control is a disclosure: expanded/collapsed, controls the ladder, named with its visible word", () => {
    expect(code).toContain("aria-expanded={ladderOpen}");
    expect(code).toContain("aria-controls={TIMEFRAME_LADDER_ID}");
    expect(code).toContain('aria-label="More timeframes"');
    expect(code).toMatch(/>\s*More <span aria-hidden="true">/);
    // It is not a timeframe, so it never claims to be the current one.
    const more = code.slice(code.indexOf("wm-chart-timeframe-more") - 400, code.indexOf("wm-chart-timeframe-more") + 400);
    expect(more).not.toContain("aria-current");
    expect(more).not.toContain("aria-pressed");
  });

  it("there is exactly one More control, and it lives on the strip", () => {
    expect(code.match(/wm-chart-timeframe-more/g)).toHaveLength(1);
    const strip = code.slice(code.indexOf('className="wm-chart-timeframes'), code.indexOf("</div>", code.indexOf('className="wm-chart-timeframes')));
    expect(strip).toContain("wm-chart-timeframe-more");
  });

  it("the calm strip is still the nine, and the ladder is closed until asked for", () => {
    expect(code).toContain("CHART_TF_SHIPPED.map");
    expect(code).toContain("useState(false);\n  const [ladderOpen, setLadderOpen] = useState(false);");
    expect(code).toContain("{open && ladderOpen && <TimeframeLadder");
  });

  it("reopening on a timeframe off the strip opens the ladder with it, so the current one is visible", () => {
    expect(code).toMatch(/if \(!open\) setLadderOpen\(!CHART_TF_SHIPPED\.includes\(timeframe as TFId\)\);/);
  });

  it("server-renders closed: only the chip, announcing its timeframe from the registry", () => {
    const html = renderToStaticMarkup(<TimeframeGlassChip timeframe="3m" setTimeframe={() => {}} symbol="TSLA" />);
    expect(html).toContain('aria-label="Timeframe: 3 minutes bars. Change timeframe."');
    expect(html).not.toContain(TIMEFRAME_LADDER_ID);
    expect(html).not.toContain("wm-chart-timeframes ");
  });
});

describe("the ladder answers for the symbol on the glass (Garden 16 §26)", () => {
  const derivedIds = (sym: string) =>
    elements(TimeframeLadder({ timeframe: "15m", symbol: sym, onChoose: () => {} }))
      .filter(e => e.type === "button" && e.props["data-availability"] === "DERIVED_CANONICAL")
      .map(e => textOf(e).replace(/derived$/, ""));

  it("BTCUSD: 3m / 10m / 2h / 4h wear 'derived' on the glass and aloud; TSLA, BTC and ES1! wear it nowhere", () => {
    expect(derivedIds("BTCUSD")).toEqual(["3m", "10m", "2h", "4h"]);
    // ES1! is served by tastytrade's own candles at every size since 2026-10-01:
    // 16 servable rungs (5s/15s/30s included), every one native.
    const es = elements(TimeframeLadder({ timeframe: "15m", symbol: "ES1!", onChoose: () => {} })).filter(e => e.type === "button");
    expect(es.length).toBeGreaterThan(15);
    expect(es).toHaveLength(16);
    expect(es.every(e => e.props["data-availability"] === "NATIVE_PROVIDER")).toBe(true);
    expect(derivedIds("ES1!")).toEqual([]);
    const tree = elements(TimeframeLadder({ timeframe: "4h", symbol: "BTCUSD", onChoose: () => {} }));
    const b = tree.find(e => e.type === "button" && textOf(e).startsWith("4h"))!;
    expect(b.props["aria-label"]).toBe("4 hours bars, derived from finer bars");
    expect(b.props["aria-current"]).toBe("true");
    for (const sym of ["TSLA", "BTC"]) {
      const buttons = elements(TimeframeLadder({ timeframe: "15m", symbol: sym, onChoose: () => {} })).filter(e => e.type === "button");
      expect(buttons, sym).toHaveLength(13);
      expect(buttons.every(e => e.props["data-availability"] === "NATIVE_PROVIDER"), sym).toBe(true);
    }
  });

  it("the chip hands the chart's symbol to the ladder", () => {
    expect(code).toContain("export function TimeframeGlassChip({ timeframe, setTimeframe, symbol }: Props)");
    const main = readFileSync(join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(main).toContain("<TimeframeGlassChip timeframe={timeframe} setTimeframe={setTimeframe} symbol={symbol} />");
  });

  it("on 1Y the ladder top says what the chart is on — and marks NO rung current, the dashed 1Y included", () => {
    const html = renderToStaticMarkup(<TimeframeLadder timeframe="1Y" symbol="TSLA" onChoose={() => {}} />);
    expect(html).toContain("On now: 1Y — served as monthly candles · pending the Founder&#x27;s decision");
    // First thing in the panel, before any group.
    expect(html.indexOf("wm-chart-timeframe-on-now")).toBeLessThan(html.indexOf("<h3"));
    expect(html).not.toContain('aria-current="true"');
    const tree = elements(TimeframeLadder({ timeframe: "1Y", symbol: "TSLA", onChoose: () => {} }));
    const y1 = tree.find(e => e.props["data-availability"] && textOf(e).startsWith("1Y"))!;
    expect(y1.type).toBe("span");
    expect(y1.props["data-availability"]).toBe("UNAVAILABLE");
    expect(String(y1.props.className)).not.toContain("bg-wm-blue");
  });

  it("on 6M and 45m the same, in their own words; on a marked rung there is no sentence", () => {
    const six = renderToStaticMarkup(<TimeframeLadder timeframe="6M" symbol="ES1!" onChoose={() => {}} />);
    expect(six).toContain("On now: 6M — served as half-year candles rebuilt from quarterly bars · pending the Founder&#x27;s decision");
    expect(six).not.toContain('aria-current="true"');
    const fortyFive = renderToStaticMarkup(<TimeframeLadder timeframe="45m" symbol="TSLA" onChoose={() => {}} />);
    expect(fortyFive).toContain("On now: 45m — no bar route serves it for this instrument · pending the Founder&#x27;s decision");
    const marked = renderToStaticMarkup(<TimeframeLadder timeframe="3m" symbol="TSLA" onChoose={() => {}} />);
    expect(marked).not.toContain("wm-chart-timeframe-on-now");
  });
});
