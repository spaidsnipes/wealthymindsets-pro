/**
 * INSPECT ON A SELECTED SHELF OR MARK — render proof.
 *
 * The ticket reads the glass's resolution of the selection and nothing else,
 * so these fixtures are built by the REAL owners (`selectAbsorptionAnatomy`,
 * `selectExhaustion`, `selectAnatomyInspect`) over fixture bars — a hand-typed
 * reading could print numbers no owner would have published.
 *
 * Rendered to static markup (no testing-library in this repo).
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import { selectAbsorptionAnatomy, type AnatomyBarInput } from "@/lib/marketData/selectAbsorptionAnatomy";
import {
  markTarget,
  selectAnatomyInspect,
  zoneTarget,
  type AnatomyTarget,
} from "@/lib/marketData/viewModels/anatomySelection";
import { selectChartSelection, CHART_SELECTION_AT_REST, selectedAnatomyOf } from "@/lib/marketData/viewModels/chartSelection";
import selectExhaustion from "@/lib/marketData/viewModels/selectExhaustion";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";

const T0 = 1_750_000_000 - (1_750_000_000 % 60);
const bar = (k: number, open: number, close: number, volume: number, split?: [number, number]): AnatomyBarInput => ({
  time: T0 + 60 * k, open, close, high: Math.max(open, close) + 0.5, low: Math.min(open, close) - 0.5, volume,
  ...(split ? { askVol: split[0], bidVol: split[1] } : {}),
});
const frame = (input: AnatomyBarInput[]) => {
  const anatomy = selectAbsorptionAnatomy(input, { windowBars: input.length });
  return { anatomy, ex: selectExhaustion(anatomy) };
};
const shelfBars = [bar(0, 100, 101, 100), bar(1, 101, 103, 100), bar(2, 103, 103.1, 1000), bar(3, 103.1, 103.2, 900), bar(4, 103, 105, 100)];

/** The selection as the reducer holds it after a click, then any re-resolutions. */
function selected(target: AnatomyTarget, first: ReturnType<typeof frame>, ...later: ReturnType<typeof frame>[]) {
  let s = selectChartSelection(CHART_SELECTION_AT_REST, {
    type: "select",
    selection: {
      kind: "ANATOMY", symbol: "ES", timeframe: "1m", wall: "LEFT",
      reading: selectAnatomyInspect(target, first.anatomy, first.ex, false), lastDrawn: null,
    },
  });
  for (const f of later) s = selectChartSelection(s, { type: "resolveAnatomy", reading: selectAnatomyInspect(target, f.anatomy, f.ex, false) });
  return selectedAnatomyOf(s)!;
}

const render = (sel: ReturnType<typeof selected>) =>
  renderToStaticMarkup(
    <ChartInspectTicket
      vm={selectInspectTicket({ barOpenMs: null, barSpanMs: null, price: null, barVolume: null, prints: [] })}
      followingLiveBar={false}
      open
      onOpenChange={() => {}}
      onOpenFootprint={() => {}}
      selectedAnatomy={sel}
    />,
  );

describe("SELECTED ABSORPTION ZONE", () => {
  const f = frame(shelfBars);
  const target = zoneTarget(f.anatomy.zones[0]!);

  it("on VOLUME: the zone, its bars with em-dash deltas, side UNKNOWN, the withheld hold test and the limit line", () => {
    const html = render(selected(target, f));
    expect(html).toContain("SELECTED ABSORPTION ZONE");
    expect(html).toContain(`data-inspect-anatomy="abs:${T0 + 120}"`);
    expect(html).toContain('data-inspect-anatomy-state="SAME"');
    expect(html).toContain("ON THE GLASS");
    expect(html).toContain("102.5 – 103.7");
    expect(html).toContain("effort = traded volume, unsigned · side UNKNOWN");
    // Per-bar rows: effort 100% / 90%, displacement 5% / 5%, and no delta — never 0.
    expect(html).toMatch(/· 100% · 5% · —/);
    expect(html).toMatch(/· 90% · 5% · —/);
    expect(html).not.toMatch(/· [+−]?0<|· \+0\b/);
    expect(html).toContain("EFFICIENCY RATIO");
    expect(html).toContain("NOT MEASURED — the anatomy owner publishes no wall or hold test");
    expect(html).toContain("effort ≥ 60% and displacement ≤ 35% of the window&#x27;s own peak · ≥ 2 consecutive bars");
    expect(html).toContain("Cannot separate absorption from an empty auction, a halt, or two large participants crossing.");
    expect(html).toContain("left-2");
  });

  it("names no side, no defended wall, no expected travel, no probability", () => {
    const html = render(selected(target, f));
    expect(html).not.toMatch(/aggress|buyer|seller/i);
    expect(html).not.toMatch(/wall at|held at|expected travel|closed through/i);
    expect(html).not.toMatch(/probab|likely|chance|confidence/i);
  });

  it("on an INFERRED split: signed deltas, and the basis says INFERRED", () => {
    const split: [number, number][] = [[60, 40], [60, 40], [800, 200], [200, 650], [60, 40]];
    const g = frame(shelfBars.map((b, k) => ({ ...b, askVol: split[k][0], bidVol: split[k][1] })));
    expect(g.anatomy.basis).toBe("INFERRED_DELTA");
    expect(g.anatomy.zones).toHaveLength(1);
    const html = render(selected(zoneTarget(g.anatomy.zones[0]!), g));
    expect(html).toContain("DELTA · INFERRED");
    expect(html).toContain("+600");
    expect(html).toContain("−450");
    expect(html).not.toMatch(/aggress|buyer|seller/i);
  });

  it("renormalised away while in view: NOT GRADED, its bars as graded now, and the last drawn reading stamped with its window", () => {
    const g = frame([bar(-1, 99, 101, 5000), ...shelfBars]);
    const html = render(selected(target, f, g));
    expect(html).toContain('data-inspect-anatomy-state="NOT_GRADED_IN_WINDOW"');
    expect(html).toContain("This window (6 bars) no longer grades it");
    expect(html).toContain("ITS BARS, AS THIS WINDOW GRADES THEM");
    expect(html).toMatch(/effort 20% · displacement 5%/);
    expect(html).toContain("LAST DRAWN READING · measured on 5 bars in view");
  });

  it("the camera leaves it: OUT OF VIEW, the last drawn reading kept, never silently dropped", () => {
    const g = frame([bar(5, 105, 106, 100), bar(6, 106, 107, 200), bar(7, 107, 108, 300)]);
    const html = render(selected(target, f, g));
    expect(html).toContain('data-inspect-anatomy-state="OUT_OF_VIEW"');
    expect(html).toContain("Its bars are outside the camera.");
    expect(html).toContain("LAST DRAWN READING");
    expect(html).toContain("102.5 – 103.7");
  });
});

describe("SELECTED EXHAUSTION", () => {
  function cycles(n: number): AnatomyBarInput[] {
    const out: AnatomyBarInput[] = [bar(0, 101, 100, 100)];
    let k = 1, c = 100;
    for (let i = 0; i < n; i++) {
      for (const vol of [1000, 900, 300, 200]) { c += 2; out.push({ ...bar(k++, c - 1, c, vol) }); }
      for (let j = 0; j < 3; j++) { c -= 1; out.push({ ...bar(k++, c + 1, c, 100) }); }
    }
    return out;
  }
  const f = frame(cycles(2));
  const mark = f.ex.marks[0]!;

  it("the push, origin → extreme, the effort halves, extension, each follow bar, energy transfer — and not a forecast", () => {
    const html = render(selected(markTarget(mark), f));
    expect(html).toContain("SELECTED EXHAUSTION");
    expect(html).toContain(`data-inspect-anatomy="exh:UP:${mark.time}"`);
    expect(html).toContain("Up · 4 bars");
    expect(html).toContain("99.5 → 108.5");
    expect(html).toMatch(/Effort 2nd ÷ 1st.*26% · first half 95% · second half 25% of the window&#x27;s peak \(traded volume\)/);
    expect(html).toContain("4.5× the window&#x27;s median bar range · extended at 3×");
    expect(html.match(/not beyond/g)?.length).toBe(3);
    expect(html).toContain("0/3 · LOST");
    expect(html).toContain("EXHAUSTED");
    expect(html).toContain("A fact about the push, not a forecast.");
    expect(html).not.toMatch(/aggress|buyer|seller|probab|likely/i);
    expect(html).not.toContain("PENDING");
  });

  it("follow-through cut off by the camera: PENDING with how many follow bars exist, and the near miss's count", () => {
    const cut = frame(cycles(1).slice(0, 6));
    const html = render(selected(markTarget(mark), f, cut));
    expect(html).toContain('data-inspect-anatomy-state="NOT_GRADED_IN_WINDOW"');
    expect(html).toContain("This window no longer grades it exhausted");
    expect(html).toContain("PENDING (1 of 3 bars after the push are in this window)");
    expect(html).toContain("NOT EXHAUSTED · 2 OF 3");
    // The near miss is the CURRENT reading, not the last drawn one.
    expect(html).not.toContain("LAST DRAWN READING");
  });
});
