/**
 * F11B · selectPassportSlots — each slot, real vs UNKNOWN, from the owners.
 *
 * Fixtures are built by the REAL owners (structure → zone objects → the
 * lifecycle; the level owner; the lineage owner), so every slot is checked
 * against what those owners publish, and every silence against what they
 * do not.
 */

import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "../canonicalBar";
import type { MarketStructureVM } from "./selectMarketStructure";
import { selectStructureMarketObjects } from "./selectStructureMarketObjects";
import { selectStructureZoneObjects, type StructureZone } from "./selectStructureZoneObjects";
import { selectObjectLineage, selectZoneLineage } from "./selectZoneLineage";
import {
  PASSPORT_SLOT_ORDER, markFor, passportDockSide, selectPassportSlots, shortObjectId,
  type PassportSlotId, type PassportSlotsVM,
} from "./selectPassportSlots";

const bars: LegacyOhlcvTuple[] = [
  { time: 3600, open: 8, high: 10, low: 7, close: 9, volume: 1 },
  { time: 7200, open: 9, high: 14, low: 11, close: 13, volume: 1 },
  { time: 10800, open: 12, high: 13, low: 8.5, close: 12, volume: 1 }, // into the 7–10 demand band: 50% deep
  { time: 14400, open: 12, high: 13, low: 11.5, close: 12.5, volume: 1 }, // left upward: REJECTED
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
const zones = selectStructureZoneObjects({ structure, bars, identities });
const demand = zones.find(z => z.side === "DEMAND")!;
const stamp = (sec: number) => `T${sec}`;
const slotOf = (vm: PassportSlotsVM, id: PassportSlotId) => vm.slots.find(s => s.id === id)!;

const zoneVM = (z: StructureZone = demand, decisionId: string | null = null) =>
  selectPassportSlots({ object: z.object, zone: z, lineage: selectZoneLineage({ zone: z, identities, decisionId }), stamp });

const level = selectStructureMarketObjects({ structure, bars, identities }).find(l => l.objectId.endsWith(":HIGH"))!;
const levelVM = (lineage = selectObjectLineage({ object: level, method: "m", identities, decisionId: null })) =>
  selectPassportSlots({ object: level, lineage, originWord: "Swing high", levelOwner: "STRUCTURE", stamp });

describe("the slots are the plate's, in the plate's order", () => {
  it("eight slots, F11B order, for a zone AND a level — kind changes only the noun", () => {
    expect(zoneVM().slots.map(s => s.id)).toEqual([...PASSPORT_SLOT_ORDER]);
    expect(levelVM().slots.map(s => s.id)).toEqual([...PASSPORT_SLOT_ORDER]);
    expect(zoneVM().slots.map(s => s.title)).toEqual(
      ["BIRTH SOURCE", "AGE", "TOUCHES", "DEFENSES", "CONSUMPTION", "DECAY", "INVALIDATION", "FIDELITY"]);
  });

  it("every slot's mark follows its status: UNKNOWN is a dashed ring, FAIL a ✕", () => {
    for (const vm of [zoneVM(), levelVM()]) for (const s of vm.slots) expect(s.mark).toBe(markFor(s.id, s.status));
    expect(markFor("AGE", "OK")).toBe("CLOCK");
    expect(markFor("DEFENSES", "OK")).toBe("SHIELD");
    expect(markFor("INVALIDATION", "WATCH")).toBe("CROSS");
    expect(markFor("FIDELITY", "OK")).toBe("CHECK");
    expect(markFor("AGE", "FAIL")).toBe("CROSS");
    expect(markFor("CONSUMPTION", "UNKNOWN")).toBe("UNKNOWN");
  });
});

describe("a ZONE — every slot read from the lifecycle and lineage owners", () => {
  const vm = zoneVM();
  it("the fixture really is DEFENDED with one 50%-deep rejection", () => {
    expect(demand.lifecycle.state).toBe("DEFENDED");
    expect(demand.lifecycle.deepestPenetration).toBeCloseTo(0.5, 10);
  });

  it("BIRTH SOURCE: origin and the admitted source; birth time and provenance", () => {
    expect(slotOf(vm, "BIRTH_SOURCE")).toMatchObject({ primary: "Swing-low origin · coinbase", secondary: "T3600 · REST_BACKFILL", status: "OK" });
  });

  it("AGE: lifecycle asOf − birth, bars since birth, still valid", () => {
    expect(slotOf(vm, "AGE")).toMatchObject({ primary: "0d 3h 0m", secondary: "Since birth · 3 bars · still valid", status: "OK", mark: "CLOCK" });
  });

  it("TOUCHES: confirmed episodes and the last one's time", () => {
    expect(slotOf(vm, "TOUCHES")).toMatchObject({ primary: "1 confirmed", secondary: "Last T10800", status: "OK" });
  });

  it("DEFENSES: rejections counted, never graded", () => {
    const s = slotOf(vm, "DEFENSES");
    expect(s).toMatchObject({ primary: "1 held", status: "OK", mark: "SHIELD" });
    expect(`${s.primary} ${s.secondary}`).not.toMatch(/strong|weak|probab|strength|score/i);
  });

  it("CONSUMPTION: the meter is the lifecycle's deepestPenetration", () => {
    const s = slotOf(vm, "CONSUMPTION");
    expect(s.meter).toBeCloseTo(0.5, 10);
    expect(s.primary).toBe("50% of the band");
    expect(s.secondary).toBe("Mitigated · far edge intact · deepest T10800");
    expect(s.status).toBe("OK");
  });

  it("DECAY: the state in words, stated not projected", () => {
    expect(slotOf(vm, "DECAY")).toMatchObject({ primary: "Edges intact", secondary: "1 test in 3 bars · stated, not projected — no half-life", status: "OK" });
  });

  it("INVALIDATION: the lifecycle's own rule — armed is WATCH, a ✕ in the watch tone", () => {
    expect(slotOf(vm, "INVALIDATION")).toMatchObject({ primary: "7", secondary: "A bar close below breaks it · a wick through is a sweep", status: "WATCH", mark: "CROSS" });
  });

  it("FIDELITY: the object's fidelity at birth, one of the five", () => {
    expect(slotOf(vm, "FIDELITY")).toMatchObject({ primary: "INDICATIVE", secondary: "At birth · Lawful observation · not broker-backed", status: "OK" });
  });

  it("footer: short id, asOf, and the decision beside the object — never 'in its evidence'", () => {
    expect(vm.footer.passportId).toBe(`ZONE-BTC-1h-${(3600).toString(36).toUpperCase()}-DEMAND`);
    expect(vm.footer.objectId).toBe(demand.object.objectId);
    expect(vm.footer.inspectedLine).toBe("T14400");
    expect(vm.footer.decision).toEqual({ state: "NONE", line: "none taken on this camera" });
    const taken = zoneVM(demand, "D-1842").footer.decision;
    expect(taken.state).toBe("BESIDE");
    expect(taken.line).toBe("D-1842 · beside the object — the decision publishes no evidence list");
  });

  it("an INVALID zone fails AGE, DEFENSES, CONSUMPTION, DECAY and INVALIDATION — with the close's time", () => {
    const broken = [...bars, { time: 18000, open: 9, high: 9.5, low: 6, close: 6.5, volume: 1 }];
    const z = selectStructureZoneObjects({ structure, bars: broken, identities }).find(x => x.side === "DEMAND")!;
    const v = selectPassportSlots({ object: z.object, zone: z, lineage: null, stamp });
    expect(z.lifecycle.state).toBe("INVALID");
    for (const id of ["AGE", "DEFENSES", "CONSUMPTION", "DECAY", "INVALIDATION"] as const) expect(slotOf(v, id).status).toBe("FAIL");
    expect(slotOf(v, "INVALIDATION").secondary).toBe("Closed below it T18000");
    expect(slotOf(v, "CONSUMPTION").meter).toBe(1);
  });

  it("an untouched zone reads 0% — measured nothing, not 'not measured'", () => {
    const z = selectStructureZoneObjects({ structure, bars: bars.slice(0, 2), identities }).find(x => x.side === "DEMAND")!;
    const v = selectPassportSlots({ object: z.object, zone: z, lineage: null, stamp });
    expect(slotOf(v, "CONSUMPTION")).toMatchObject({ primary: "0% of the band", meter: 0, status: "OK" });
    expect(slotOf(v, "TOUCHES").primary).toBe("None since birth");
    expect(slotOf(v, "DEFENSES")).toMatchObject({ primary: "Not yet tested", status: "WATCH" });
  });

  it("a lineage compiled for another object is ignored: BIRTH SOURCE says the source was not admitted", () => {
    const other = { ...selectZoneLineage({ zone: demand, identities, decisionId: "D-9" }), objectId: "ZONE:OTHER" };
    const v = selectPassportSlots({ object: demand.object, zone: demand, lineage: other, stamp });
    expect(slotOf(v, "BIRTH_SOURCE")).toMatchObject({ primary: "Swing-low origin · source not admitted", status: "UNKNOWN" });
    expect(v.footer.decision.state).toBe("NONE");
  });
});

describe("a LEVEL — no lifecycle owner, so its silences are UNKNOWN, never numbers", () => {
  const vm = levelVM();
  it("DEFENSES and CONSUMPTION are UNKNOWN with no meter and no digits", () => {
    for (const id of ["DEFENSES", "CONSUMPTION"] as const) {
      const s = slotOf(vm, id);
      expect(s.status).toBe("UNKNOWN");
      expect(s.mark).toBe("UNKNOWN");
      expect(s.meter).toBeNull();
      expect(s.primary).toBe("Not measured");
      expect(`${s.primary}${s.secondary}`).not.toMatch(/\d/);
    }
  });

  it("INVALIDATION says no rule is stated", () => {
    expect(slotOf(vm, "INVALIDATION")).toMatchObject({ primary: "No rule stated", secondary: "This level has no lifecycle owner yet", status: "UNKNOWN" });
  });

  it("BIRTH SOURCE and AGE come from the birth bar's admitted identity", () => {
    expect(slotOf(vm, "BIRTH_SOURCE")).toMatchObject({ primary: "Swing high · coinbase", secondary: "T7200 · REST_BACKFILL", status: "OK" });
    expect(slotOf(vm, "AGE").primary).toBe("0d 2h 0m");
  });

  it("with no lineage, BIRTH SOURCE is UNKNOWN and AGE falls back to the owner's bar count", () => {
    const v = selectPassportSlots({ object: level, lineage: null, originWord: "Swing high", levelOwner: "STRUCTURE", stamp });
    expect(slotOf(v, "BIRTH_SOURCE").status).toBe("UNKNOWN");
    expect(slotOf(v, "AGE").primary).toBe(`${level.decay} bar${level.decay === 1 ? "" : "s"}`);
  });

  it("TOUCHES states the structure owner's rule; a memory level its recent tests", () => {
    expect(slotOf(vm, "TOUCHES")).toMatchObject({ primary: "None since birth", secondary: "The level owner publishes only untouched levels; a touched level leaves the glass" });
    const mem = { ...level, objectId: "MEMORY:BTC|1h|7200000|e0:POC", testBarIds: ["a", "b"] };
    const v = selectPassportSlots({ object: mem, lineage: null, originWord: "Prior-session POC", levelOwner: "MEMORY", stamp });
    expect(slotOf(v, "TOUCHES").primary).toBe("2 recent");
  });

  it("a fidelity that is not one of the five is UNKNOWN, not promoted", () => {
    const v = selectPassportSlots({ object: { ...level, fidelityAtBirth: "SYNTHETIC" }, lineage: null, stamp });
    expect(slotOf(v, "FIDELITY")).toMatchObject({ primary: "SYNTHETIC", status: "UNKNOWN" });
  });
});

describe("shortObjectId", () => {
  it("packs only the birth instant; every other part stays", () => {
    expect(shortObjectId("ZONE:TSLA|15m|1758800000000|e0:SUPPLY")).toBe(`ZONE-TSLA-15m-${(1758800000).toString(36).toUpperCase()}-SUPPLY`);
    expect(shortObjectId("MEMORY:TSLA|15m|1758800000000|e0:POC")).toMatch(/^MEMORY-TSLA-15m-[0-9A-Z]+-POC$/);
    expect(shortObjectId("odd")).toBe("odd");
    expect(shortObjectId("x".repeat(40))).toHaveLength(28);
  });
});

describe("passportDockSide — the wall away from the object", () => {
  const W = 1100, w = 360;
  it("a pin under the left wall sends the drawer right (the plate's side)", () => {
    expect(passportDockSide({ objectX: 200, paneWidth: W, drawerWidth: w })).toBe("RIGHT");
  });
  it("a pin under the right wall sends it left", () => {
    expect(passportDockSide({ objectX: 900, paneWidth: W, drawerWidth: w })).toBe("LEFT");
  });
  it("a pin in the middle: the object runs birth → now, so the LEFT wall covers none of it", () => {
    expect(passportDockSide({ objectX: 500, paneWidth: W, drawerWidth: w })).toBe("LEFT");
  });
  it("no measured x keeps the left wall", () => {
    expect(passportDockSide({ objectX: null, paneWidth: W, drawerWidth: w })).toBe("LEFT");
    expect(passportDockSide({ objectX: 500, paneWidth: 0, drawerWidth: w })).toBe("LEFT");
  });
});
