/**
 * F11B · THE PASSPORT DRAWER — render proof against the plate
 * (`WM_NewMockup_85_F11B_Passport_Drawer`).
 *
 * The drawer renders the eight slots `selectPassportSlots` compiles, in the
 * plate's order, each with a medallion, two lines and a status mark coloured
 * by the palette owner; the CONSUMPTION meter only where the lifecycle owner
 * measured one; and the PASSPORT ID · INSPECTED · DECISION footer. Where an
 * owner is silent the slot says "Not measured" and prints no number.
 *
 * Fixtures are built by the REAL owners. Rendered to static markup.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import { WM } from "@/lib/design/wmTokens";
import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import { PASSPORT_SLOT_ORDER } from "@/lib/marketData/viewModels/selectPassportSlots";
import { selectStructureMarketObjects } from "@/lib/marketData/viewModels/selectStructureMarketObjects";
import { selectStructureZoneObjects } from "@/lib/marketData/viewModels/selectStructureZoneObjects";
import { selectObjectLineage, selectZoneLineage } from "@/lib/marketData/viewModels/selectZoneLineage";
import type { MarketObject } from "@/lib/marketData/marketObjectKinds";
import type { StructureZone } from "@/lib/marketData/viewModels/selectStructureZoneObjects";

const bars: LegacyOhlcvTuple[] = [
  { time: 3600, open: 8, high: 10, low: 7, close: 9, volume: 1 },
  { time: 7200, open: 9, high: 14, low: 11, close: 13, volume: 1 },
  { time: 10800, open: 12, high: 13, low: 8.5, close: 12, volume: 1 },
  { time: 14400, open: 12, high: 13, low: 11.5, close: 12.5, volume: 1 },
];
const identities: CanonicalBarIdentity[] = bars.map(bar => ({
  barId: `BTC|1h|${bar.time * 1000}|e0`, symbolId: "BTC", sessionId: "CONTINUOUS",
  timeframe: "1h", asOf: bar.time * 1000, receivedAt: bar.time * 1000 + 1,
  fidelity: "INDICATIVE", source: "coinbase", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const structure: MarketStructureVM = {
  measured: true, lookback: 1, barCount: bars.length, unconfirmedBars: 1,
  confirmationLagNote: "one bar", swingHighs: [{ time: 7200, price: 14 }],
  swingLows: [{ time: 3600, price: 7 }], lastSwingHigh: { time: 7200, price: 14 },
  lastSwingLow: { time: 3600, price: 7 }, bias: "RANGE", biasNote: "range",
  insufficientNote: null,
};
const zone = selectStructureZoneObjects({ structure, bars, identities }).find(z => z.side === "DEMAND")!;
const level = selectStructureMarketObjects({ structure, bars, identities }).find(l => l.objectId.endsWith(":HIGH"))!;

const render = (p: { zone?: StructureZone; level?: MarketObject; decisionId?: string | null }) =>
  renderToStaticMarkup(
    <ChartInspectTicket
      vm={selectInspectTicket({ barOpenMs: null, barSpanMs: null, price: null, barVolume: null, prints: [] })}
      followingLiveBar={false}
      open
      onOpenChange={() => {}}
      onOpenFootprint={() => {}}
      selectedZone={p.zone ?? null}
      zoneLineage={p.zone ? selectZoneLineage({ zone: p.zone, identities, decisionId: p.decisionId ?? null }) : null}
      selectedLevel={p.level ?? null}
      levelLineage={p.level ? selectObjectLineage({ object: p.level, method: "m", identities, decisionId: p.decisionId ?? null }) : null}
      activeDecisionId={p.decisionId ?? null}
      timeZone="UTC"
    />,
  );

/** One slot's <li>, markup and visible text. */
const slotOf = (html: string, id: string) => {
  const at = html.indexOf(`data-passport-slot="${id}"`);
  expect(at, id).toBeGreaterThan(-1);
  const li = html.slice(html.lastIndexOf("<li", at), html.indexOf("</li>", at) + 5);
  return { li, text: li.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() };
};

describe("the drawer is the F11B plate", () => {
  for (const [name, p] of [["zone", { zone }], ["level", { level }]] as const) {
    it(`${name}: title, D ≈ 0, all eight slots in the plate's order, and the footer`, () => {
      const html = render(p);
      expect(html).toContain("MARKET OBJECT PASSPORT");
      expect(html).toContain("D ≈ 0");
      const at = PASSPORT_SLOT_ORDER.map(id => html.indexOf(`data-passport-slot="${id}"`));
      expect(at.every(i => i > -1)).toBe(true);
      expect([...at].sort((a, b) => a - b)).toEqual(at);
      const footer = html.indexOf('data-testid="passport-footer"');
      expect(footer).toBeGreaterThan(at[at.length - 1]);
      expect(html).toMatch(/PASSPORT ID:<\/span> <span[^>]*>[A-Z]+-BTC-1h-/);
      expect(html).toContain("INSPECTED AS OF:");
      expect(html).toContain("1970-01-01 04:00 UTC");
    });
  }

  it("every slot wears a medallion and a status mark in the palette owner's tone", () => {
    const html = render({ zone });
    const tone = { OK: WM.state.ok, WATCH: WM.state.watch, FAIL: WM.state.objection, UNKNOWN: WM.state.neutral } as const;
    for (const id of PASSPORT_SLOT_ORDER) {
      const { li } = slotOf(html, id);
      const status = /data-passport-status="(\w+)"/.exec(li)![1] as keyof typeof tone;
      expect(li).toMatch(/rounded-full border/);
      expect(li).toContain(`style="color:${tone[status]}" data-passport-mark=`);
    }
  });

  it("zone: the CONSUMPTION meter is the lifecycle's measured depth, in the medallion and the bar", () => {
    const { li, text } = slotOf(render({ zone }), "CONSUMPTION");
    expect(li).toContain('data-passport-meter="50"');
    expect(li).toContain("width:50%");
    expect(text).toContain("50% of the band");
    expect(li).toContain('data-passport-status="OK"');
  });

  it("zone: the lifecycle's invalidation price and rule, the fidelity at birth, the admitted source", () => {
    const html = render({ zone });
    expect(slotOf(html, "INVALIDATION").text).toContain("7 A bar close below breaks it");
    expect(slotOf(html, "FIDELITY").text).toContain("INDICATIVE");
    expect(slotOf(html, "BIRTH_SOURCE").text).toContain("Swing-low origin · coinbase");
    expect(html).toContain('data-passport-state="DEFENDED"');
  });

  it("level: silent owners render 'Not measured' with no meter and no number", () => {
    const html = render({ level });
    expect(html).not.toContain("data-passport-meter");
    for (const id of ["DEFENSES", "CONSUMPTION"]) {
      const { li, text } = slotOf(html, id);
      expect(li).toContain('data-passport-status="UNKNOWN"');
      expect(li).toContain('data-passport-mark="UNKNOWN"');
      expect(text).toMatch(/^[A-Z ]+ Not measured /);
      expect(text).not.toMatch(/\d/);
    }
    const inv = slotOf(html, "INVALIDATION");
    expect(inv.text).toBe("INVALIDATION No rule stated This level has no lifecycle owner yet");
  });

  it("the footer names the decision BESIDE the object when one is born on this camera", () => {
    expect(render({ zone, decisionId: "D-1842" })).toMatch(/data-passport-decision="BESIDE"[\s\S]*D-1842 · beside the object/);
    expect(render({ zone })).toContain('data-passport-decision="NONE"');
  });

  it("with nothing laid out, the drawer keeps the left wall (the pin is measured in the browser)", () => {
    expect(render({ zone })).toContain('data-passport-dock="LEFT"');
  });
});
