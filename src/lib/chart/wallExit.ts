/**
 * A PRESSURE WALL THAT LEAVES SHOWS ITS EXIT (Garden 16 §20, Sheriff batch 4,
 * 2026-10-08: NQ1! `WALL@31250:DEFENDED:2` was on the glass at 07:44 and simply
 * gone by 07:49 — no BREAKING, no BROKEN, no scar — while price moved away).
 *
 * A wall can stop being a wall for two different reasons, and only one of them
 * is the market's: price traded through it (the owner's own lifecycle already
 * says BREAKING / BROKEN while it is still listed), or it dropped out of the
 * compilation — the heard window moved, or its share fell under the floor.
 * This ledger remembers the walls of the last compilation and names every one
 * that is no longer listed, for WALL_EXIT_SHOW_MS, with the state it left in.
 * Pure: the caller owns the clock and the memory.
 */

export interface WallSeen {
  readonly strike: number;
  readonly life: string;
}

export interface WallExit {
  readonly strike: number;
  /** The lifecycle word it carried when last listed. */
  readonly lastLife: string;
  /** When it was first found missing (ms). */
  readonly leftAtMs: number;
}

export interface WallExitLedger {
  /** The instrument this memory belongs to; a different key forgets everything. */
  readonly key: string;
  readonly walls: readonly WallSeen[];
  readonly exits: readonly WallExit[];
}

/** How long a departed wall keeps its exit mark. */
export const WALL_EXIT_SHOW_MS = 15 * 60_000;

export const EMPTY_WALL_LEDGER: WallExitLedger = { key: "", walls: [], exits: [] };

export function stepWallExits(prev: WallExitLedger, key: string, now: readonly WallSeen[], nowMs: number): WallExitLedger {
  if (prev.key !== key) return { key, walls: now.map(w => ({ strike: w.strike, life: w.life })), exits: [] };
  const listed = new Set(now.map(w => w.strike));
  const exits: WallExit[] = [];
  // Still-fresh exits stay, unless the wall came back.
  for (const e of prev.exits) if (!listed.has(e.strike) && nowMs - e.leftAtMs < WALL_EXIT_SHOW_MS) exits.push(e);
  for (const w of prev.walls) {
    if (listed.has(w.strike) || exits.some(e => e.strike === w.strike)) continue;
    exits.push({ strike: w.strike, lastLife: w.life, leftAtMs: nowMs });
  }
  return { key, walls: now.map(w => ({ strike: w.strike, life: w.life })), exits };
}

/** The words on the glass for one exit. */
export function wallExitWords(e: WallExit, fmt: (p: number) => string): string {
  return `WALL ${fmt(e.strike)} · NO LONGER LISTED · WAS ${e.lastLife === "WEAKENING" ? "WEAKENED" : e.lastLife}`;
}
