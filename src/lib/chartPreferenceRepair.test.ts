import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  KEYS_TO_REPAIR,
  PREFERENCE_REPAIR_KEY,
  PREFERENCE_REPAIR_VERSION,
  needsRepair,
  repairChartPreferences,
} from "./chartPreferenceRepair";

/** A localStorage good enough to be wrong in the ways that matter. */
function installStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
  return { map, storage };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("needsRepair", () => {
  it("runs when the browser has never been stamped", () => {
    expect(needsRepair(null)).toBe(true);
  });

  it("does not run again once stamped at the current version", () => {
    expect(needsRepair(String(PREFERENCE_REPAIR_VERSION))).toBe(false);
  });

  it("runs again when stamped at an older version", () => {
    expect(needsRepair(String(PREFERENCE_REPAIR_VERSION - 1))).toBe(true);
  });

  it("treats an unparseable stamp as absent rather than as done", () => {
    // Failing toward running once more is recoverable. Failing toward skipping
    // forever is the exact bug this module exists to end, so a corrupt stamp
    // must never be read as permission to skip.
    expect(needsRepair("")).toBe(true);
    expect(needsRepair("yes")).toBe(true);
    expect(needsRepair("{}")).toBe(true);
  });

  it("does not run for a stamp from a FUTURE version", () => {
    // A browser that has seen a newer build must not be dragged backwards by an
    // older one served from a stale edge cache.
    expect(needsRepair(String(PREFERENCE_REPAIR_VERSION + 1))).toBe(false);
  });
});

describe("repairChartPreferences", () => {
  it("THE DEFECT: removes the stored value that was suppressing the new default", () => {
    // This is the exact state of every browser that had ever opened /charts:
    // the mount-write had already persisted `false` before the trader touched
    // anything, so `lsGet` returned it and the flipped default never applied.
    const { map } = installStorage({ wm_absorptionAnatomy: "false" });

    const removed = repairChartPreferences();

    expect(removed).toContain("wm_absorptionAnatomy");
    expect(map.has("wm_absorptionAnatomy")).toBe(false);
  });

  it("stamps the browser so the repair never discards a choice twice", () => {
    const { map } = installStorage({ wm_absorptionAnatomy: "false" });
    repairChartPreferences();
    expect(map.get(PREFERENCE_REPAIR_KEY)).toBe(String(PREFERENCE_REPAIR_VERSION));
  });

  it("is idempotent — a second call removes nothing", () => {
    const { map } = installStorage({ wm_absorptionAnatomy: "false" });
    repairChartPreferences();

    // The trader deliberately switches it off again after the repair.
    map.set("wm_absorptionAnatomy", "false");

    expect(repairChartPreferences()).toEqual([]);
    expect(
      map.get("wm_absorptionAnatomy"),
      "a choice made AFTER the repair must survive — otherwise the repair is " +
        "not a one-time correction, it is a switch the trader cannot turn off",
    ).toBe("false");
  });

  it("leaves every preference outside the repair list untouched", () => {
    const { map } = installStorage({
      wm_absorptionAnatomy: "false",
      wm_ofImbalanceStack: "false",
      wm_fixedVP: "true",
      wm_timeframe: '"15m"',
      wm_extHours: "false",
    });

    repairChartPreferences();

    expect(map.get("wm_ofImbalanceStack")).toBe("false");
    expect(map.get("wm_fixedVP")).toBe("true");
    expect(map.get("wm_timeframe")).toBe('"15m"');
    expect(map.get("wm_extHours")).toBe("false");
  });

  it("reports only keys that were actually present", () => {
    const { map } = installStorage({});
    const removed = repairChartPreferences();
    expect(removed).toEqual([]);
    // Still stamped: there was nothing to repair, and that IS the repair done.
    expect(map.get(PREFERENCE_REPAIR_KEY)).toBe(String(PREFERENCE_REPAIR_VERSION));
  });

  it("no-ops on the server rather than throwing during render", () => {
    vi.stubGlobal("window", undefined);
    expect(() => repairChartPreferences()).not.toThrow();
    expect(repairChartPreferences()).toEqual([]);
  });

  it("survives storage being unavailable (private mode, blocked cookies)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {},
        removeItem: () => {},
      },
    });
    expect(() => repairChartPreferences()).not.toThrow();
    expect(repairChartPreferences()).toEqual([]);
  });

  it("does not stamp when removal throws, so the repair retries next load", () => {
    // Recording a job that did not happen is the failure mode that makes a
    // migration silently permanent. Better to retry than to lie.
    const map = new Map<string, string>([["wm_absorptionAnatomy", "false"]]);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    });

    expect(() => repairChartPreferences()).not.toThrow();
    expect(map.has(PREFERENCE_REPAIR_KEY)).toBe(false);
  });
});

describe("the repair list stays narrow", () => {
  it("names only the key whose default actually changed", () => {
    // Each entry here silently discards a real trader choice one time. That is
    // justified for a key whose stored value is suppressing a decision the
    // product has since made, and for nothing else. If this fails because an
    // entry was added, the addition needs its own written reason — widening the
    // list is how a one-time correction turns into a habit of overruling users.
    expect(KEYS_TO_REPAIR).toEqual(["wm_absorptionAnatomy"]);
  });
});
