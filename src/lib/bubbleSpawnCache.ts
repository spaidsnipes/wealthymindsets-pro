/**
 * bubbleSpawnCache — bounded de-duplication for bubble spawn keys.
 *
 * WHAT WENT WRONG
 * ---------------
 * Both bubble paths in MainChart kept a `Set<string>` of spawn keys so a price
 * zone that had already produced a bubble would not produce a second one. Both
 * bounded it the same way:
 *
 *     if (spawnRef.current.size > 400) spawnRef.current = new Set();
 *
 * A full flush. The comment above it said "keep the dedupe set from growing
 * unbounded", which it does — but the keys it throws away include the keys of
 * every bubble STILL ON SCREEN. Those bubbles are only removed from the live
 * array when they scroll out of view, so on the very next frame each visible
 * zone failed its dedupe check, spawned again, and the chart drew two discs on
 * one price. The pair then bobbed together and read as twice the aggression
 * that was actually there.
 *
 * It is a slow fuse — nothing is wrong until the 401st distinct zone of the
 * session — which is exactly why it survived: a chart opened for a minute never
 * reaches it, and a chart left open all day drifts into it with no error.
 *
 * THE RULE
 * --------
 * A key may be evicted only if no live bubble is holding it. The live set is
 * the floor, and it is naturally bounded by what fits on the canvas. Eviction
 * is a consequence of a bubble leaving, never of a counter tripping.
 *
 * Pure and side-effect free: takes the current keys and the live holders,
 * returns the set to keep. The caller assigns it.
 */

/** The single field this module needs from a bubble. */
export interface SpawnKeyed {
  readonly spawnKey: string;
}

/**
 * The size at which the cache is compacted. Not a cap on the result: if more
 * than this many bubbles are genuinely alive, every one of their keys is still
 * retained, because dropping a live key is the bug this module exists to stop.
 */
export const SPAWN_CACHE_COMPACT_AT = 400;

/**
 * @param keys  the current spawn-key cache
 * @param live  the bubbles currently in the array (the only legitimate holders)
 * @returns the cache to keep. Returns `keys` itself, unchanged, when no
 *          compaction is due — so the caller's assignment is a no-op and no
 *          allocation happens on the overwhelming majority of frames.
 */
export function compactSpawnKeys(
  keys: Set<string>,
  live: readonly SpawnKeyed[],
  compactAt: number = SPAWN_CACHE_COMPACT_AT,
): Set<string> {
  if (keys.size <= compactAt) return keys;
  const kept = new Set<string>();
  for (const b of live) {
    // Guarded rather than assumed: a bubble that never carried a key cannot
    // pin one, and `undefined` in a string set would re-admit its zone forever.
    if (typeof b.spawnKey === "string" && b.spawnKey.length > 0) kept.add(b.spawnKey);
  }
  return kept;
}
