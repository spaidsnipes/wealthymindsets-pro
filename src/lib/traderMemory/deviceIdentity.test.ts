/**
 * DEVICE IDENTITY — Sentinels.
 *
 * The only property worth having is STABILITY. A device id that changes makes
 * one machine look like many, and every cross-device answer built on it is
 * then wrong in a way no screen can reveal.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { thisDeviceId, resetDeviceIdCacheForTests, UNKNOWN_DEVICE_ID } from "./deviceIdentity";

type Store = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };

function installWindow(store: Store) {
  (globalThis as unknown as { window?: unknown }).window = { localStorage: store };
}

function memoryStore(): Store & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

beforeEach(() => resetDeviceIdCacheForTests());
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
  resetDeviceIdCacheForTests();
});

describe("deviceIdentity", () => {
  it("returns the SAME id on the second call — the whole point of the module", () => {
    installWindow(memoryStore());
    let n = 0;
    const first = thisDeviceId(() => `dev_${++n}`);
    const second = thisDeviceId(() => `dev_${++n}`);
    expect(first).toBe(second);
    expect(n).toBe(1); // minted once, not twice
  });

  it("survives a reload — reads back the persisted id rather than minting a new one", () => {
    const store = memoryStore();
    installWindow(store);
    const before = thisDeviceId(() => "dev_alpha");

    resetDeviceIdCacheForTests(); // simulate a fresh page load, same storage
    const after = thisDeviceId(() => "dev_beta_SHOULD_NOT_BE_USED");

    expect(after).toBe(before);
    expect(after).toBe("dev_alpha");
  });

  it("is UNKNOWN on the server rather than minting a per-render id", () => {
    // No window. A throwaway id here would make one device look like hundreds.
    expect(thisDeviceId(() => "dev_x")).toBe(UNKNOWN_DEVICE_ID);
  });

  it("is UNKNOWN when storage throws (private mode) — it does not fabricate", () => {
    installWindow({
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
    });
    expect(thisDeviceId(() => "dev_x")).toBe(UNKNOWN_DEVICE_ID);
  });

  it("is UNKNOWN when the id generator returns nothing, and writes no empty key", () => {
    const store = memoryStore();
    installWindow(store);
    expect(thisDeviceId(() => "   ")).toBe(UNKNOWN_DEVICE_ID);
    expect(store.map.size).toBe(0);
  });

  it("treats a blank persisted value as absent and mints over it", () => {
    // ANTI-VACUITY: the guards above must not make the module return UNKNOWN
    // for everything. A corrupted empty entry is the one case where minting
    // is correct, and it still yields a real id.
    const store = memoryStore();
    store.map.set("wm.device-id.v1", "");
    installWindow(store);
    expect(thisDeviceId(() => "dev_real")).toBe("dev_real");
  });
});
