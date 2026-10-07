/**
 * MY VIEWS — Drive Garden 18 snapshot 10-02 §B1–2 (2026-10-07).
 *
 * Starter Views are editable copies with Restore; the trader's switches as
 * they stand migrate IN PLACE to "My current view" (nothing on or off);
 * restoring a View restores preferences, never market events; a proof scene
 * persists nothing. One owner: `savedLayouts.ts` on `wm_workspaceLayouts`.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { selectProfileMenu, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import {
  arrangementSwitches,
  captureArrangement,
  defaultStarterArms,
  selectChartArrangement,
  setStarterArmsOverride,
  starterArms,
  starterEdited,
} from "@/lib/marketData/viewModels/selectChartArrangement";
import {
  CURRENT_VIEW_ID,
  CURRENT_VIEW_NAME,
  currentViewMigrated,
  duplicateStarterView,
  loadSavedLayouts,
  MAX_SAVED_LAYOUTS,
  migrateCurrentView,
  parseSavedLayouts,
  readSavedLayouts,
  renameLayout,
  restoreStarterView,
  SAVED_LAYOUTS_STORAGE_KEY,
  saveLayout,
  saveStarterView,
  screenViews,
  serializeSavedLayouts,
  starterArmsFromList,
  starterOverride,
  starterView,
  starterViewId,
  storeSavedLayouts,
  userViews,
  type SavedLayout,
} from "./savedLayouts";
import { MY_STACK_STORAGE_KEY, captureMyStack } from "@/lib/marketData/viewModels/myProfileStack";
import { chartPropsForView } from "@/lib/desk/deskView";

const menu = (active: Readonly<Partial<Record<ProfileId, boolean>>> = {}) =>
  selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active });
const capture = (active: Readonly<Partial<Record<ProfileId, boolean>>>) => captureArrangement(menu(active));

let n = 0;
const ids = () => `v${++n}`;

function storage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

afterEach(() => setStarterArmsOverride(null));

describe("starter Views are editable copies", () => {
  it("keeping the current composition as Order Flow stores ONE edited copy under the starter's id and name", () => {
    const r1 = saveStarterView([], "ORDER_FLOW", capture({ ABSORPTION: true, SESSION: true }));
    if (!r1.ok) throw new Error(r1.message);
    expect(r1.layout).toMatchObject({ id: starterViewId("ORDER_FLOW"), name: "Order Flow", starter: "ORDER_FLOW" });
    const r2 = saveStarterView(r1.list, "ORDER_FLOW", capture({ ABSORPTION: true }));
    if (!r2.ok) throw new Error(r2.message);
    expect(r2.replaced).toBe(true);
    expect(r2.list.filter((l) => l.starter === "ORDER_FLOW")).toHaveLength(1);
    expect(starterArmsFromList(r2.list).ORDER_FLOW).toEqual(["ABSORPTION"]);
  });

  it("Restore removes only the edit — the canon default answers again", () => {
    const r = saveStarterView([{ id: "mine", name: "Mine", switches: { SESSION: true } }], "REGIME", capture({ TPO_PROFILE: true }));
    if (!r.ok) throw new Error(r.message);
    const restored = restoreStarterView(r.list, "REGIME");
    expect(restored).toEqual([{ id: "mine", name: "Mine", switches: { SESSION: true } }]);
    expect(starterOverride(restored, "REGIME")).toBeNull();
    const view = starterView(restored, "REGIME");
    expect(Object.entries(view.switches).filter(([, v]) => v).map(([k]) => k).sort()).toEqual([...defaultStarterArms("REGIME")].sort());
  });

  it("a starter keeps its name (rename refused); Duplicate makes a View of the trader's own", () => {
    const r = saveStarterView([], "REVIEW", capture({ SESSION: true }));
    if (!r.ok) throw new Error(r.message);
    expect(renameLayout(r.list, starterViewId("REVIEW"), "Night review").ok).toBe(false);
    const d = duplicateStarterView(r.list, "REVIEW", ids);
    if (!d.ok) throw new Error(d.message);
    expect(d.layout.name).toBe("Review 2");
    expect(d.layout.starter).toBeUndefined();
    // Duplicating a DEFAULT starter does not leave a phantom edit behind.
    const d2 = duplicateStarterView([], "ORDER_FLOW", ids);
    if (!d2.ok) throw new Error(d2.message);
    expect(d2.list.map((l) => l.name)).toEqual(["Order Flow 2"]);
    expect(starterOverride(d2.list, "ORDER_FLOW")).toBeNull();
  });

  it("edited starters round-trip through storage and do not count against the cap", () => {
    let list: readonly SavedLayout[] = [];
    for (let i = 0; i < MAX_SAVED_LAYOUTS; i++) {
      const r = saveLayout(list, `View ${i}`, capture({ SESSION: true }), ids);
      if (!r.ok) throw new Error(r.message);
      list = r.list;
    }
    const s = saveStarterView(list, "CLEAN", capture({ TPO_PROFILE: true }));
    if (!s.ok) throw new Error(s.message);
    const back = parseSavedLayouts(serializeSavedLayouts(s.list))!;
    expect(userViews(back)).toHaveLength(MAX_SAVED_LAYOUTS);
    expect(starterOverride(back, "CLEAN")?.switches.TPO_PROFILE).toBe(true);
  });

  it("a forged starter entry (wrong id, unknown starter, duplicate) is dropped on read", () => {
    const raw = JSON.stringify({
      v: 1,
      layouts: [
        { id: "x", name: "Order Flow", switches: { SESSION: true }, starter: "ORDER_FLOW" },
        { id: "starter-NOPE", name: "Nope", switches: { SESSION: true }, starter: "NOPE" },
        { id: starterViewId("REGIME"), name: "anything", switches: { SESSION: true }, starter: "REGIME" },
        { id: starterViewId("REGIME"), name: "again", switches: { TPO_PROFILE: true }, starter: "REGIME" },
      ],
    });
    const list = parseSavedLayouts(raw)!;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: starterViewId("REGIME"), name: "Regime", starter: "REGIME" });
  });

  it("the compiler presses the trader's edit everywhere, and the canon once restored", () => {
    const m = menu({});
    expect(starterEdited("ORDER_FLOW")).toBe(false);
    setStarterArmsOverride({ ORDER_FLOW: ["SESSION", "TPO_PROFILE"] });
    expect(starterArms("ORDER_FLOW")).toEqual(["SESSION", "TPO_PROFILE"]);
    const sw = arrangementSwitches("ORDER_FLOW", m);
    expect(Object.entries(sw).filter(([, v]) => v).map(([k]) => k).sort()).toEqual(["SESSION", "TPO_PROFILE"]);
    // The chart arranged as the edit DECLARES the starter, not CUSTOM.
    expect(selectChartArrangement({ menu: menu({ SESSION: true, TPO_PROFILE: true }) }).activeId).toBe("ORDER_FLOW");
    setStarterArmsOverride(null);
    expect(starterArms("ORDER_FLOW")).toEqual(defaultStarterArms("ORDER_FLOW"));
    expect(selectChartArrangement({ menu: menu({ SESSION: true, TPO_PROFILE: true }) }).activeId).toBeNull();
  });

  it("each Desk screen can wear a starter or a View of the trader's own", () => {
    const list: SavedLayout[] = [{ id: "mine", name: "Mine", switches: { SESSION: true } }];
    expect(screenViews(list).map((v) => v.name)).toEqual(["Order Flow", "Regime", "Review", "Mine"]);
  });
});

describe("MIGRATE IN PLACE — the trader's current switches become “My current view”", () => {
  const WM_OF_KEYS = { wm_ofAbsorption: "true", wm_ofTpoProfile: "true", wm_ofSessionVP: "false" };

  it("adds the capture as a View, writes the Views key only, and turns nothing on or off", () => {
    const store = storage({ ...WM_OF_KEYS });
    const before = new Map(store.data);
    const cap = capture({ ABSORPTION: true, TPO_PROFILE: true });
    const list = loadSavedLayouts(store);
    const next = migrateCurrentView(list, store.getItem(SAVED_LAYOUTS_STORAGE_KEY), cap)!;
    expect(next).not.toBeNull();
    expect(next[0]).toMatchObject({ id: CURRENT_VIEW_ID, name: CURRENT_VIEW_NAME });
    // EXACTLY the switches the chart reported — every TOGGLE row, on or off.
    expect(next[0].switches).toEqual(cap);
    expect(storeSavedLayouts(store, next)).toBe(true);
    // Every switch key the chart reads is byte-for-byte what it was.
    for (const [k, v] of before) expect(store.data.get(k)).toBe(v);
    expect([...store.data.keys()].filter((k) => !before.has(k))).toEqual([SAVED_LAYOUTS_STORAGE_KEY]);
    expect(currentViewMigrated(store.getItem(SAVED_LAYOUTS_STORAGE_KEY))).toBe(true);
  });

  it("runs once: a migrated document is never migrated again, even after the View is deleted", () => {
    const cap = capture({ ABSORPTION: true });
    const next = migrateCurrentView([], null, cap)!;
    const raw = serializeSavedLayouts(next.filter((l) => l.id !== CURRENT_VIEW_ID));
    expect(migrateCurrentView(parseSavedLayouts(raw)!, raw, cap)).toBeNull();
  });

  it("keeps the legacy My stack slot and every saved View, in place", () => {
    const legacy = JSON.stringify(captureMyStack({ LIVING_PROFILE: true }));
    const list = readSavedLayouts(null, legacy);
    const next = migrateCurrentView(list, null, capture({ ABSORPTION: true }))!;
    expect(next.map((l) => l.id)).toEqual([CURRENT_VIEW_ID, "my-stack"]);
    expect(readSavedLayouts(null, legacy)).toEqual(list);
  });

  it("no twin, no noise: nothing on, or a View already holding it, adds nothing (but records the migration)", () => {
    const cap = capture({ SESSION: true });
    const held: SavedLayout[] = [{ id: "s", name: "Session", switches: cap }];
    expect(migrateCurrentView(held, null, cap)).toEqual(held);
    expect(migrateCurrentView([], null, capture({}))).toEqual([]);
  });

  it("waits for the chart: no capture, no migration", () => {
    expect(migrateCurrentView([], null, null)).toBeNull();
  });
});

describe("restoring a View restores preferences, never market events", () => {
  it("a stored View carries switches + style only — event payloads are dropped on read", () => {
    const raw = JSON.stringify({
      v: 1,
      layouts: [{ id: "a", name: "A", switches: { ABSORPTION: true }, roles: { ABSORPTION: "PRIMARY" }, zones: [{ price: 100 }], events: ["BIG_TRADE"], bars: [[1, 2, 3, 4]] }],
    });
    const [view] = parseSavedLayouts(raw)!;
    expect(Object.keys(view).sort()).toEqual(["id", "name", "roles", "switches"]);
    const props = chartPropsForView(view);
    expect(Object.keys(props)).not.toContain("zones");
    expect(Object.keys(props)).not.toContain("events");
  });
});

describe("one owner; a proof scene persists nothing", () => {
  const SRC = readFileSync("src/lib/workspace/savedLayouts.ts", "utf8");
  it("the Views store write is held in a proof scene before it reaches storage", () => {
    const body = SRC.slice(SRC.indexOf("export function storeSavedLayouts"));
    expect(body.indexOf("proofSceneHoldsWrites()")).toBeGreaterThan(-1);
    expect(body.indexOf("proofSceneHoldsWrites()")).toBeLessThan(body.indexOf("storage.setItem"));
  });
  it("the door never migrates inside a proof scene", () => {
    const door = readFileSync("src/components/os/SavedLayoutsDoor.tsx", "utf8");
    expect(door).toMatch(/if \(!capture \|\| proofSceneHoldsWrites\(\)\) return;\s*[^]*?migrateCurrentView\(/);
  });
  it("no second layout store: only savedLayouts.ts names the Views key", () => {
    expect(SAVED_LAYOUTS_STORAGE_KEY).toBe("wm_workspaceLayouts");
    const runtime = readFileSync("src/lib/workspace/myViewsRuntime.ts", "utf8");
    expect(runtime).not.toMatch(/localStorage\.setItem|"wm_/);
  });
  it("the legacy My stack key is still only read", () => {
    expect(MY_STACK_STORAGE_KEY).toBeTruthy();
    expect(SRC).not.toMatch(/removeItem/);
  });
});
