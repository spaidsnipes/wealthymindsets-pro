import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearOwnerScopedLocalStorage, completeLocalSignOut } from "./logoutIsolation";

describe("logoutIsolation — owner-scoped localStorage cleanup", () => {
  function installFakeLocalStorage(): Map<string, string> {
    const store = new Map<string, string>();
    (globalThis as unknown as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
      },
    };
    return store;
  }
  function uninstallFakeLocalStorage(): void {
    delete (globalThis as unknown as { window?: unknown }).window;
  }

  beforeEach(() => { uninstallFakeLocalStorage(); });
  afterEach(() =>  { uninstallFakeLocalStorage(); });

  it("removes every owner-scoped key", () => {
    const store = installFakeLocalStorage();
    // Seed every documented owner-scoped key + one non-owner key.
    store.set("wm-profile", "{}");
    store.set("wm-profile-avatar", "data:...");
    store.set("wm-profile-bg", "#000");
    store.set("wm-radio-liked", "[]");
    store.set("wm_songs", "[]");
    store.set("wm_watchlists", "{}");
    store.set("wm_quick_syms", "[]");
    store.set("wm_scanner_starred", "[]");
    store.set("wm_scanner_alerted", "[]");
    store.set("wm_journal_entries", "[]");
    store.set("wm_edu_progress", "{}");
    store.set("wm_settings", "{}");           // NON-owner (device pref)
    store.set("wm-install-dismissed", "true"); // NON-owner (device state)

    const removed = clearOwnerScopedLocalStorage();

    expect(removed).toBe(11);
    // Owner-scoped keys gone.
    expect(store.has("wm-profile")).toBe(false);
    expect(store.has("wm_journal_entries")).toBe(false);
    // Non-owner keys preserved.
    expect(store.get("wm_settings")).toBe("{}");
    expect(store.get("wm-install-dismissed")).toBe("true");
  });

  it("returns 0 when no owner-scoped keys are present", () => {
    const store = installFakeLocalStorage();
    store.set("wm_settings", "{}");
    expect(clearOwnerScopedLocalStorage()).toBe(0);
    // Non-owner key still there.
    expect(store.get("wm_settings")).toBe("{}");
  });

  it("returns 0 when window is absent (SSR)", () => {
    expect(clearOwnerScopedLocalStorage()).toBe(0);
  });

  it("skips keys that throw on getItem — never propagates", () => {
    (globalThis as unknown as { window?: unknown }).window = {
      localStorage: {
        getItem: () => { throw new Error("SecurityError"); },
        setItem: () => {},
        removeItem: () => {},
      },
    };
    expect(() => clearOwnerScopedLocalStorage()).not.toThrow();
    expect(clearOwnerScopedLocalStorage()).toBe(0);
  });

  it("runs every local cleanup when the server logout request rejects", async () => {
    const calls: string[] = [];

    await completeLocalSignOut(
      Promise.reject(new TypeError("network offline")),
      [
        () => calls.push("session-symbols"),
        () => { calls.push("paper"); throw new Error("broken paper storage"); },
        () => calls.push("points"),
        () => calls.push("owner-local"),
        () => calls.push("auth-cache"),
        () => calls.push("route"),
      ],
    );

    expect(calls).toEqual([
      "session-symbols",
      "paper",
      "points",
      "owner-local",
      "auth-cache",
      "route",
    ]);
  });

  it("does not wait for a pending server request before clearing local state", async () => {
    let resolveServer!: () => void;
    const pendingServer = new Promise<void>(resolve => { resolveServer = resolve; });
    const calls: string[] = [];

    const completion = completeLocalSignOut(pendingServer, [() => calls.push("local")]);

    expect(calls).toEqual(["local"]);
    resolveServer();
    await completion;
  });
});
