import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSharedReads, sharedRead } from "./sharedRead";

beforeEach(() => resetSharedReads());

describe("sharedRead — one read per key at a time", () => {
  it("callers asking while a read is in flight share it (4 panes → 1 request)", async () => {
    const read = vi.fn(async () => ({ state: "NO_POSITIONS" }));
    const all = await Promise.all([0, 1, 2, 3].map(() => sharedRead("pos:NQ1", read)));
    expect(read).toHaveBeenCalledTimes(1);
    expect(all.every(a => a === all[0])).toBe(true);
  });
  it("a settled answer is reused only inside the window; after it, a fresh read", async () => {
    let t = 1000;
    const now = () => t;
    const read = vi.fn(async () => t);
    await sharedRead("k", read, { now, settledMs: 1500 });
    await Promise.resolve();
    t = 2000;
    await sharedRead("k", read, { now, settledMs: 1500 });
    expect(read).toHaveBeenCalledTimes(1);
    t = 4000;
    expect(await sharedRead("k", read, { now, settledMs: 1500 })).toBe(4000);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("different keys never share; a failed read is not kept", async () => {
    const read = vi.fn(async () => 1);
    await sharedRead("a", read); await sharedRead("b", read);
    expect(read).toHaveBeenCalledTimes(2);
    const bad = vi.fn(async () => { throw new Error("x"); });
    await expect(sharedRead("c", bad)).rejects.toThrow("x");
    await Promise.resolve();
    await expect(sharedRead("c", bad)).rejects.toThrow("x");
    expect(bad).toHaveBeenCalledTimes(2);
  });
});

describe("MainChart's broker cost-line read goes through sharedRead", () => {
  it("one shared read per symbol key", async () => {
    const { readFileSync } = await import("node:fs");
    const mc = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(mc.length).toBeGreaterThan(100000);
    expect(mc).toContain("await sharedRead(`broker-positions:${wanted}`, async () => {");
  });
});
