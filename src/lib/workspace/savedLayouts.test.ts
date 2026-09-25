/**
 * SAVED LAYOUTS — the list's rules, and the compiler functions a saved layout
 * is captured, applied and recognised through.
 *
 * Fixtures are read from the LIVE catalogue where it matters (which ids are
 * TOGGLE rows, which are DRAW), so a catalogue change that would let a layout
 * arm a drawing cursor fails here instead of on the trader's chart.
 */
import { describe, expect, it } from "vitest";

import { selectProfileMenu, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import {
  ARRANGEMENT_SPECS,
  arrangementSwitches,
  captureArrangement,
  savedArrangementInForce,
  savedArrangementSwitches,
} from "@/lib/marketData/viewModels/selectChartArrangement";
import { MY_STACK_STORAGE_KEY, captureMyStack } from "@/lib/marketData/viewModels/myProfileStack";
import {
  checkLayoutName,
  deleteLayout,
  layoutNameKey,
  layoutOnCount,
  loadSavedLayouts,
  MAX_LAYOUT_NAME_LENGTH,
  MAX_SAVED_LAYOUTS,
  migrateLegacyMyStack,
  MIGRATED_MY_STACK_ID,
  MIGRATED_MY_STACK_NAME,
  parseSavedLayouts,
  readSavedLayouts,
  renameLayout,
  sanitizeLayoutSwitches,
  SAVED_LAYOUTS_SCHEMA_VERSION,
  SAVED_LAYOUTS_STORAGE_KEY,
  saveLayout,
  serializeSavedLayouts,
  storeSavedLayouts,
  type SavedLayout,
} from "./savedLayouts";

const menu = (active: Readonly<Partial<Record<ProfileId, boolean>>> = {}) =>
  selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active });

const DRAW_IDS = menu().entries.filter((e) => e.gesture === "DRAW").map((e) => e.id);
const TOGGLE_IDS = menu().entries.filter((e) => e.gesture === "TOGGLE").map((e) => e.id);

let n = 0;
const ids = () => `t${++n}`;

/** A current arrangement, as the room would announce it. */
const CAPTURE = captureArrangement(menu({ SESSION: true, FIXED_RANGE: true }));

function saved(list: readonly SavedLayout[], name: string, capture = CAPTURE) {
  const r = saveLayout(list, name, capture, ids);
  if (!r.ok) throw new Error(r.message);
  return r;
}

function fakeStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe("the catalogue fixtures are not vacuous", () => {
  it("there are TOGGLE rows and DRAW rows to reason about", () => {
    expect(TOGGLE_IDS.length).toBeGreaterThan(10);
    expect(DRAW_IDS).toEqual(expect.arrayContaining(["DELTA_VP", "ANCHORED_RANGE"]));
  });
});

describe("the compiler: a saved layout is the same object a desk is", () => {
  it("captureArrangement keeps every TOGGLE row, on or off, and no DRAW row", () => {
    const c = captureArrangement(menu({ SESSION: true, DELTA_VP: true }));
    expect(Object.keys(c).sort()).toEqual([...TOGGLE_IDS].sort());
    expect(c.SESSION).toBe(true);
    expect(c.FIXED_RANGE).toBe(false);
    for (const id of DRAW_IDS) expect(id in c).toBe(false);
  });

  it("captured → applied reproduces the arrangement exactly (same shape arrangementSwitches produces)", () => {
    const regime = arrangementSwitches("REGIME", menu());
    const captured = captureArrangement(menu(regime));
    expect(savedArrangementSwitches(captured, menu())).toEqual(regime);
  });

  it("applying drops DRAW gestures, unknown ids and non-boolean values — a layout cannot arm a cursor", () => {
    const out = savedArrangementSwitches(
      { DELTA_VP: true, ANCHORED_RANGE: true, NOT_A_READING: true, SESSION: "yes", FIXED_RANGE: true },
      menu(),
    );
    expect(out).toEqual({ FIXED_RANGE: true });
  });

  it("rows a layout does not name are LEFT ALONE (legacy profile-only slot, readings added later)", () => {
    const out = savedArrangementSwitches({ LIVING_PROFILE: true }, menu());
    expect(out).toEqual({ LIVING_PROFILE: true });
    expect("ABSORPTION" in out).toBe(false);
  });

  it("in force = every switch the layout names matches the capture", () => {
    expect(savedArrangementInForce({ SESSION: true, FIXED_RANGE: true }, CAPTURE)).toBe(true);
    expect(savedArrangementInForce({ SESSION: true, FIXED_RANGE: false }, CAPTURE)).toBe(false);
  });

  it("an empty comparison is NOT in force, and no capture is never in force", () => {
    expect(savedArrangementInForce({}, CAPTURE)).toBe(false);
    expect(savedArrangementInForce({ NOT_A_READING: true }, CAPTURE)).toBe(false);
    expect(savedArrangementInForce({ SESSION: true }, null)).toBe(false);
  });
});

describe("names", () => {
  it("normalises whitespace and keys case-insensitively", () => {
    expect(checkLayoutName("  Open   drive \t")).toEqual({ ok: true, name: "Open drive" });
    expect(layoutNameKey(" OPEN  Drive")).toBe(layoutNameKey("open drive"));
  });

  it("refuses an empty name", () => {
    expect(checkLayoutName("   ")).toMatchObject({ ok: false, problem: "EMPTY" });
  });

  it(`refuses a name over ${MAX_LAYOUT_NAME_LENGTH} characters, accepts exactly ${MAX_LAYOUT_NAME_LENGTH}`, () => {
    expect(checkLayoutName("x".repeat(MAX_LAYOUT_NAME_LENGTH))).toMatchObject({ ok: true });
    expect(checkLayoutName("x".repeat(MAX_LAYOUT_NAME_LENGTH + 1))).toMatchObject({ ok: false, problem: "TOO_LONG" });
  });

  it("refuses control characters that are not whitespace", () => {
    expect(checkLayoutName("Open\u0007drive")).toMatchObject({ ok: false, problem: "BAD_CHARACTERS" });
  });

  it("refuses every built-in desk's name, in any case — two tiles called Regime would be one lie", () => {
    for (const spec of ARRANGEMENT_SPECS) {
      expect(checkLayoutName(spec.label.toUpperCase())).toMatchObject({ ok: false, problem: "RESERVED" });
    }
  });

  it("rename onto another layout's name is a DUPLICATE; onto its own name is fine", () => {
    const a = saved([], "Open");
    const b = saved(a.list, "Close");
    expect(checkLayoutName("close", b.list, a.layout.id)).toMatchObject({ ok: false, problem: "DUPLICATE" });
    expect(checkLayoutName("OPEN", b.list, a.layout.id)).toMatchObject({ ok: true, name: "OPEN" });
  });
});

describe("save / rename / delete", () => {
  it("saves the capture under a name, sanitized to TOGGLE rows", () => {
    const r = saved([], "Open drive", { ...CAPTURE, DELTA_VP: true } as Record<string, boolean>);
    expect(r.replaced).toBe(false);
    expect(r.list).toHaveLength(1);
    expect(r.layout.name).toBe("Open drive");
    expect("DELTA_VP" in r.layout.switches).toBe(false);
    expect(r.layout.switches.SESSION).toBe(true);
    expect(layoutOnCount(r.layout)).toBe(2);
  });

  it("saving under an existing name (any case) UPDATES that layout in place — same id, same position", () => {
    const a = saved([], "Open");
    const b = saved(a.list, "Close");
    const other = captureArrangement(menu({ LIVING_PROFILE: true }));
    const c = saved(b.list, "OPEN", other);
    expect(c.replaced).toBe(true);
    expect(c.list).toHaveLength(2);
    expect(c.list[0].id).toBe(a.layout.id);
    expect(c.list[0].switches.LIVING_PROFILE).toBe(true);
    expect(c.list[0].switches.SESSION).toBe(false);
  });

  it(`refuses a NEW layout past ${MAX_SAVED_LAYOUTS} rather than evicting one — but still updates an existing one`, () => {
    let list: readonly SavedLayout[] = [];
    for (let i = 0; i < MAX_SAVED_LAYOUTS; i++) list = saved(list, `L${i}`).list;
    const refused = saveLayout(list, "One more", CAPTURE, ids);
    expect(refused).toMatchObject({ ok: false });
    expect(saveLayout(list, "L3", CAPTURE, ids)).toMatchObject({ ok: true, replaced: true });
  });

  it("refuses to save an empty desk when the chart has reported nothing", () => {
    expect(saveLayout([], "Open", {}, ids)).toMatchObject({ ok: false });
  });

  it("refuses a reserved name on save", () => {
    expect(saveLayout([], "clean", CAPTURE, ids)).toMatchObject({ ok: false });
  });

  it("never issues a duplicate or malformed id", () => {
    const a = saveLayout([], "A", CAPTURE, () => "same");
    if (!a.ok) throw new Error("save failed");
    const b = saveLayout(a.list, "B", CAPTURE, () => "same");
    const c = saveLayout(a.list, "C", CAPTURE, () => "not a valid id!");
    if (!b.ok || !c.ok) throw new Error("save failed");
    expect(b.layout.id).not.toBe("same");
    expect(c.layout.id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("renames in place and refuses a clash", () => {
    const a = saved([], "Open");
    const b = saved(a.list, "Close");
    const r = renameLayout(b.list, a.layout.id, "  Opening   range ");
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.list.map((l) => l.name)).toEqual(["Opening range", "Close"]);
    expect(renameLayout(r.list, a.layout.id, "close")).toMatchObject({ ok: false });
    expect(renameLayout(r.list, "missing", "X")).toMatchObject({ ok: false });
  });

  it("deletes by id and nothing else", () => {
    const a = saved([], "Open");
    const b = saved(a.list, "Close");
    expect(deleteLayout(b.list, a.layout.id).map((l) => l.name)).toEqual(["Close"]);
  });
});

describe("serialization — schema-versioned, re-validated on read", () => {
  it("round-trips", () => {
    const b = saved(saved([], "Open").list, "Close");
    const raw = serializeSavedLayouts(b.list);
    expect(JSON.parse(raw).v).toBe(SAVED_LAYOUTS_SCHEMA_VERSION);
    expect(parseSavedLayouts(raw)).toEqual(b.list);
  });

  it("absent, garbage, or an unknown schema version is UNREADABLE (null), not an empty list", () => {
    expect(parseSavedLayouts(null)).toBeNull();
    expect(parseSavedLayouts("{not json")).toBeNull();
    expect(parseSavedLayouts(JSON.stringify({ v: 2, layouts: [] }))).toBeNull();
    expect(parseSavedLayouts(JSON.stringify({ layouts: [] }))).toBeNull();
    expect(parseSavedLayouts(JSON.stringify({ v: 1, layouts: [] }))).toEqual([]);
  });

  it("drops bad entries, keeps the FIRST of a duplicate id or name, and caps the list", () => {
    const good = { id: "a", name: "Open", switches: { SESSION: true } };
    const raw = JSON.stringify({
      v: 1,
      layouts: [
        good,
        { id: "a", name: "Other", switches: { SESSION: true } }, // dup id
        { id: "b", name: "OPEN", switches: { SESSION: true } }, // dup name
        { id: "c", name: "Regime", switches: { SESSION: true } }, // reserved
        { id: "d", name: "Draw only", switches: { DELTA_VP: true } }, // nothing left
        { id: "bad id!", name: "Bad", switches: { SESSION: true } },
        { id: "e", name: 7, switches: { SESSION: true } },
        null,
        ...Array.from({ length: MAX_SAVED_LAYOUTS + 3 }, (_, i) => ({ id: `x${i}`, name: `X${i}`, switches: { SESSION: true } })),
      ],
    });
    const list = parseSavedLayouts(raw)!;
    expect(list[0]).toEqual(good);
    expect(list.map((l) => l.id)).not.toContain("b");
    expect(list.map((l) => l.id)).not.toContain("c");
    expect(list.map((l) => l.id)).not.toContain("d");
    expect(list).toHaveLength(MAX_SAVED_LAYOUTS);
  });

  it("sanitizes switches on read", () => {
    expect(sanitizeLayoutSwitches({ SESSION: true, DELTA_VP: true, NOPE: true, FIXED_RANGE: 1 })).toEqual({ SESSION: true });
    expect(sanitizeLayoutSwitches(["SESSION"])).toEqual({});
  });
});

describe("the legacy My stack slot migrates with nothing lost", () => {
  // EXACTLY what the retired "Save my stack" button wrote.
  const legacyRaw = JSON.stringify(captureMyStack({ LIVING_PROFILE: true, TPO_PROFILE: true }));

  it("becomes the first saved layout, named My stack, keeping its profile-only switch set", () => {
    const m = migrateLegacyMyStack(legacyRaw)!;
    expect(m.id).toBe(MIGRATED_MY_STACK_ID);
    expect(m.name).toBe(MIGRATED_MY_STACK_NAME);
    expect(m.switches.LIVING_PROFILE).toBe(true);
    expect(m.switches.TPO_PROFILE).toBe(true);
    expect(m.switches.SESSION).toBe(false);
    // Profile-only: applying it touches exactly what the old Restore touched.
    expect("ABSORPTION" in m.switches).toBe(false);
    expect(layoutOnCount(m)).toBe(2);
  });

  it("no store yet → the list IS the legacy slot", () => {
    expect(readSavedLayouts(null, legacyRaw).map((l) => l.name)).toEqual([MIGRATED_MY_STACK_NAME]);
    expect(readSavedLayouts(null, null)).toEqual([]);
  });

  it("an unreadable store falls back to the legacy slot rather than showing nothing", () => {
    expect(readSavedLayouts("{broken", legacyRaw).map((l) => l.id)).toEqual([MIGRATED_MY_STACK_ID]);
  });

  it("a readable store WINS, even empty — a deleted My stack is not resurrected", () => {
    expect(readSavedLayouts(serializeSavedLayouts([]), legacyRaw)).toEqual([]);
  });

  it("migrated + saved again keeps My stack first and writes the new key, never the old one", () => {
    const store = fakeStorage({ [MY_STACK_STORAGE_KEY]: legacyRaw });
    const list = loadSavedLayouts(store);
    const next = saved(list, "Open").list;
    expect(storeSavedLayouts(store, next)).toBe(true);
    expect(store.data.get(MY_STACK_STORAGE_KEY)).toBe(legacyRaw);
    expect(loadSavedLayouts(store).map((l) => l.name)).toEqual([MIGRATED_MY_STACK_NAME, "Open"]);
    expect(JSON.parse(store.data.get(SAVED_LAYOUTS_STORAGE_KEY)!).layouts[0].id).toBe(MIGRATED_MY_STACK_ID);
  });

  it("blocked storage reads as empty and reports a refused write", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    expect(loadSavedLayouts(blocked)).toEqual([]);
    expect(storeSavedLayouts(blocked, [])).toBe(false);
    expect(loadSavedLayouts(null)).toEqual([]);
  });
});
