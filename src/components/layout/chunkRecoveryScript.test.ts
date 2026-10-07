import { describe, expect, it } from "vitest";
import { CHUNK_RECOVERY_SCRIPT } from "./chunkRecoveryScript";
import { RECOVERY_KEY } from "@/lib/deployVersionRecovery";

function harness(stored: Record<string, string> = {}) {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  let reloads = 0;
  const store = { ...stored };
  const window = {
    sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } },
    location: { reload: () => { reloads++; } },
    addEventListener: (t: string, fn: (e: unknown) => void) => { (listeners[t] ??= []).push(fn); },
  };
  new Function("window", CHUNK_RECOVERY_SCRIPT)(window);
  return { fire: (t: string, e: unknown) => listeners[t]?.forEach(fn => fn(e)), reloads: () => reloads, store };
}

describe("chunk-load failures reload once before React can catch them", () => {
  it("a ChunkLoadError reloads and stamps the shared guard key", () => {
    const h = harness();
    const err = Object.assign(new Error("Loading chunk 4219 failed."), { name: "ChunkLoadError" });
    h.fire("error", { error: err });
    expect(h.reloads()).toBe(1);
    expect(Number(h.store[RECOVERY_KEY])).toBeGreaterThan(0);
  });
  it("a rejected dynamic import reloads too", () => {
    const h = harness();
    h.fire("unhandledrejection", { reason: new TypeError("Failed to fetch dynamically imported module: /x.js") });
    expect(h.reloads()).toBe(1);
  });
  it("a second failure inside the window does not loop", () => {
    const h = harness({ [RECOVERY_KEY]: String(Date.now() - 5_000) });
    h.fire("error", { error: { name: "ChunkLoadError", message: "Loading chunk 1 failed." } });
    expect(h.reloads()).toBe(0);
  });
  it("an ordinary error is left to the boundaries", () => {
    const h = harness();
    h.fire("error", { error: new Error("Cannot read properties of undefined") });
    expect(h.reloads()).toBe(0);
  });
});
