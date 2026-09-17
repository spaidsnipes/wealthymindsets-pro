import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { compactSpawnKeys, SPAWN_CACHE_COMPACT_AT } from "./bubbleSpawnCache";

const key = (i: number) => `k${i}`;
const bubble = (i: number) => ({ spawnKey: key(i) });
const keysUpTo = (n: number) => new Set(Array.from({ length: n }, (_, i) => key(i)));

describe("compactSpawnKeys — a live bubble's key is never evictable", () => {
  it("does nothing at or below the compaction threshold", () => {
    const keys = keysUpTo(SPAWN_CACHE_COMPACT_AT);
    expect(compactSpawnKeys(keys, [])).toBe(keys); // identity: no allocation
  });

  it("KEEPS every key still held by a live bubble — the whole point", () => {
    // The old code replaced the set wholesale, so each of these zones passed
    // its dedupe check on the next frame and drew a SECOND disc on the same
    // price while the first was still bobbing there.
    const live = [bubble(3), bubble(17), bubble(400)];
    const kept = compactSpawnKeys(keysUpTo(SPAWN_CACHE_COMPACT_AT + 1), live);
    for (const b of live) expect(kept.has(b.spawnKey), b.spawnKey).toBe(true);
  });

  it("drops the keys of bubbles that are gone", () => {
    const kept = compactSpawnKeys(keysUpTo(SPAWN_CACHE_COMPACT_AT + 1), [bubble(3)]);
    expect(kept.size).toBe(1);
    expect(kept.has(key(9))).toBe(false);
  });

  it("does not cap below the live count — more alive than the threshold still all kept", () => {
    // A cap would reintroduce the exact defect at a different number. The live
    // set is the floor; it is bounded by what fits on a canvas, not by a const.
    const live = Array.from({ length: SPAWN_CACHE_COMPACT_AT + 50 }, (_, i) => bubble(i));
    const kept = compactSpawnKeys(keysUpTo(SPAWN_CACHE_COMPACT_AT + 100), live, 10);
    expect(kept.size).toBe(SPAWN_CACHE_COMPACT_AT + 50);
  });

  it("ignores bubbles with no usable key rather than pinning undefined", () => {
    const live = [bubble(1), { spawnKey: "" }, { spawnKey: undefined as unknown as string }];
    const kept = compactSpawnKeys(keysUpTo(SPAWN_CACHE_COMPACT_AT + 1), live);
    expect(kept.size).toBe(1);
    expect(kept.has(key(1))).toBe(true);
  });

  it("is idempotent — compacting a compacted set changes nothing", () => {
    const live = Array.from({ length: 5 }, (_, i) => bubble(i));
    const once = compactSpawnKeys(keysUpTo(SPAWN_CACHE_COMPACT_AT + 1), live);
    expect(compactSpawnKeys(once, live)).toBe(once);
  });
});

/**
 * SENTINEL — the flush that duplicated bubbles must not come back.
 *
 * This module is only worth anything if MainChart stops replacing the set with
 * an empty one on a size trip. A pure owner with no adopter is the failure mode
 * this repo has hit repeatedly (see vpRenderReceipt.test.ts).
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */
describe("SENTINEL — MainChart evicts by liveness, not by counter", () => {
  const REL = "src/components/chart/MainChart.tsx";
  /** COMMENT-STRIPPED: the dead formula is discussed in prose in that file. */
  const src = fs
    .readFileSync(path.join(process.cwd(), REL), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("both bubble paths adopt the shared owner", () => {
    expect(src, `${REL} → must import the owner`).toMatch(/compactSpawnKeys/);
    const calls = src.match(/compactSpawnKeys\s*\(/g) ?? [];
    expect(calls.length, `${REL} → delta AND big-trade paths both need it`).toBe(2);
  });

  it("the size-tripped full flush is GONE from both paths", () => {
    // The exact shape of the defect: `if (…size > N) …ref.current = new Set()`.
    // Mode-exit flushes are fine and deliberately not matched — those clear the
    // bubble array in the same breath, so no live bubble is left unpinned.
    expect(
      src,
      `${REL} → a size-tripped flush re-admits every on-screen zone and doubles it`,
    ).not.toMatch(/SpawnRef\.current\.size\s*>\s*\d+\)\s*\w*SpawnRef\.current\s*=\s*new Set\(\)/);
  });

  it("each adoption is handed the LIVE array, not an empty one", () => {
    // `compactSpawnKeys(keys, [])` type-checks and behaves exactly like the old
    // flush. Naming the live refs is what makes the adoption real.
    expect(src, `${REL} → delta path must pass its live bubbles`).toMatch(
      /compactSpawnKeys\(\s*deltaBubbleSpawnRef\.current\s*,\s*deltaBubblesRef\.current\s*\)/,
    );
    expect(src, `${REL} → big-trade path must pass its live bubbles`).toMatch(
      /compactSpawnKeys\(\s*bubbleSpawnRef\.current\s*,\s*bubblesRef\.current\s*\)/,
    );
  });
});
