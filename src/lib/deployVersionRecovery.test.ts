import { describe, expect, it, vi } from "vitest";
import { isChunkLoadError, recoverFromVersionSkew, RECOVERY_KEY, servingBuildDiffers } from "./deployVersionRecovery";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as unknown as Storage & { m: Map<string, string> }; };
const identity = (sha: string) => vi.fn(async () => new Response(JSON.stringify({ sha }), { status: 200 })) as unknown as typeof fetch;

describe("deploy-version recovery (P0-A)", () => {
  it("recognises chunk-load failures across browsers", () => {
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "Loading chunk 123 failed." })).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /x.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });

  it("an old page meeting a new build reloads once onto it", async () => {
    const storage = mem(); const reload = vi.fn();
    const did = await recoverFromVersionSkew(new Error("x"), { fetchImpl: identity("new"), storage, reload, nowMs: 1_000_000 });
    // pageBuildSha() is empty under test, so skew is proven only by a chunk error here:
    expect(did).toBe(false);
    const did2 = await recoverFromVersionSkew({ name: "ChunkLoadError", message: "" }, { fetchImpl: identity("new"), storage, reload, nowMs: 1_000_000 });
    expect(did2).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem(RECOVERY_KEY)).toBe("1000000");
  });

  it("never loops: a second crash inside the window keeps the error page", async () => {
    const storage = mem(); const reload = vi.fn();
    storage.setItem(RECOVERY_KEY, "1000000");
    const did = await recoverFromVersionSkew({ name: "ChunkLoadError", message: "" }, { fetchImpl: identity("new"), storage, reload, nowMs: 1_030_000 });
    expect(did).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("serving-build comparison: differs only when both builds are known and different", async () => {
    expect(await servingBuildDiffers(identity("bbb"), "aaa")).toBe(true);
    expect(await servingBuildDiffers(identity("aaa"), "aaa")).toBe(false);
    expect(await servingBuildDiffers(identity("bbb"), "")).toBe(false);
    expect(await servingBuildDiffers(vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch, "aaa")).toBe(false);
  });
});
