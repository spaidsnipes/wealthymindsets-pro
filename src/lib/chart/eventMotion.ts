/**
 * MOTION ONLY ON REAL EVENTS (Founder, Codex A-3, 2026-11-02: "When brick walls start to break … a mixture of the
 * real data and then the flow maybe to somehow activate the animations … big trade bubbles … or the walls").
 *
 * The animation is the Flow polish; the trigger is always a fact WM watched change while the chart was open:
 *  - a pressure wall's lifecycle moving into BREAKING or BROKEN (the walls owner's own word, not a guess);
 *  - a big trade first heard on the tape.
 * The first look at any scene primes silently (load, symbol / timeframe switch, history hydrate): nothing that was
 * already true when the trader arrived is staged as if it just happened. STILL / reduced motion turns every one off.
 * PURE: the caller owns the clock and the memory.
 */

/* ── Wall lifecycle transitions ─────────────────────────────────────────────────────────────── */

export const BREAK_BURST_MS = 1_400;
const BREAK_LIVES: ReadonlySet<string> = new Set(["BREAKING", "BROKEN"]);

export interface LifeEvent { readonly id: number | string; readonly from: string; readonly to: string; readonly atMs: number }
export interface LifeLedger {
  readonly key: string;
  readonly primed: boolean;
  readonly lives: ReadonlyMap<number | string, string>;
  readonly events: readonly LifeEvent[];
}
export const EMPTY_LIFE_LEDGER: LifeLedger = { key: "", primed: false, lives: new Map(), events: [] };

export function stepLifeTransitions(prev: LifeLedger, key: string, items: readonly { id: number | string; life: string }[], nowMs: number): LifeLedger {
  const lives = new Map(items.map(i => [i.id, i.life] as const));
  if (prev.key !== key || !prev.primed) return { key, primed: true, lives, events: [] };
  const events: LifeEvent[] = prev.events.filter(e => nowMs - e.atMs < BREAK_BURST_MS && lives.has(e.id));
  for (const it of items) {
    const was = prev.lives.get(it.id);
    if (was == null || was === it.life) continue;
    if (!BREAK_LIVES.has(it.life) || was === "BROKEN") continue;
    events.push({ id: it.id, from: was, to: it.life, atMs: nowMs });
  }
  return { key, primed: true, lives, events };
}

/** 0 → 1 across the burst; null outside it or with motion off. */
export function burstProgress(atMs: number, nowMs: number, motionOn: boolean, durMs = BREAK_BURST_MS): number | null {
  if (!motionOn) return null;
  const t = nowMs - atMs;
  if (t < 0 || t >= durMs) return null;
  return t / durMs;
}

export interface RubbleChunk { readonly dx: number; readonly dy: number; readonly size: number; readonly rot: number; readonly alpha: number }

/** Deterministic brick chunks thrown from the breach: spread sideways, rise a little, fall under gravity, fade. */
export function rubbleChunks(seed: number, p: number, n: number): RubbleChunk[] {
  const rnd = (a: number, b: number) => {
    let h = (Math.round(seed * 100) * 73856093) ^ (a * 19349663) ^ (b * 83492791);
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const out: RubbleChunk[] = [];
  for (let i = 0; i < n; i++) {
    const vx = (rnd(i, 1) - 0.5) * 70;          // px over the burst
    const vy = -(8 + rnd(i, 2) * 18);           // a short lift before the fall
    const g = 120;                               // px over the burst², gravity
    out.push({
      dx: vx * p,
      dy: vy * p + 0.5 * g * p * p,
      size: 3 + rnd(i, 3) * 5,
      rot: (rnd(i, 4) - 0.5) * 6 * p,
      alpha: Math.max(0, 1 - p) ** 1.2,
    });
  }
  return out;
}

/* ── First heard (big trades) ───────────────────────────────────────────────────────────────── */

export const LANDING_MS = 480;
const SEEN_CAP = 5_000;

export interface SeenLedger {
  readonly key: string;
  readonly primed: boolean;
  readonly seen: ReadonlyMap<string, number>;
  /** ms since first heard, or null for anything that was already there at the first look. */
  ageOf(id: string, nowMs: number): number | null;
}

function ledger(key: string, primed: boolean, seen: Map<string, number>): SeenLedger {
  return { key, primed, seen, ageOf: (id, nowMs) => { const t = seen.get(id); return t == null || !Number.isFinite(t) ? null : Math.max(0, nowMs - t); } };
}
export const EMPTY_SEEN_LEDGER: SeenLedger = ledger("", false, new Map());

export function stepFirstSeen(prev: SeenLedger, key: string, ids: Iterable<string>, nowMs: number): SeenLedger {
  const fresh = prev.key !== key || !prev.primed;
  // Remembered across frames even when a disc leaves the camera or the newest-N cap, so a pan never re-lands one.
  const seen = fresh ? new Map<string, number>() : new Map(prev.seen);
  for (const id of ids) if (!seen.has(id)) seen.set(id, fresh ? -Infinity : nowMs);
  while (seen.size > SEEN_CAP) seen.delete(seen.keys().next().value as string);
  return ledger(key, true, seen);
}

/** A disc lands: ease-out-back from 0.35 to exactly 1 over LANDING_MS. 1 when unknown, settled or motion is off. */
export function landingScale(ageMs: number | null, motionOn: boolean): number {
  if (!motionOn || ageMs == null || ageMs >= LANDING_MS) return 1;
  const t = Math.max(0, ageMs / LANDING_MS);
  const c1 = 1.70158, c3 = c1 + 1;
  const e = 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  return 0.35 + 0.65 * e;
}
