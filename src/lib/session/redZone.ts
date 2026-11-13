/**
 * RED ZONE (MISSING-INVENTIONS #16, Founder 11-10 18:18: "the AI start catching on… this nigga is in his red zone").
 * OPT-IN, ON THIS DEVICE ONLY. v1 listens to LOUDNESS alone: the microphone's level is read in the browser and turned
 * into one number per half second; no audio is recorded, kept or sent, and no words are recognised (a speech service
 * would send his voice off the device). Face reading is not built.
 *
 * The detector learns his calm level for the first BASELINE_MS, then counts BURSTS — the level held above
 * BURST_X × baseline for at least BURST_MS. RED_BURSTS bursts inside RED_WINDOW_MS is the Red Zone: the screen offers
 * the Emergency Corner. PURE: the caller feeds (timeMs, level) samples.
 */
export const BASELINE_MS = 20_000;
export const BURST_X = 3;
export const BURST_MS = 1_500;
export const RED_BURSTS = 3;
export const RED_WINDOW_MS = 120_000;

export interface RedZoneState {
  readonly startMs: number | null;
  readonly baseline: number | null;
  readonly calmSum: number;
  readonly calmN: number;
  readonly aboveSinceMs: number | null;
  readonly inBurst: boolean;
  readonly bursts: readonly number[];
  readonly red: boolean;
}
export const RED_ZONE_START: RedZoneState = { startMs: null, baseline: null, calmSum: 0, calmN: 0, aboveSinceMs: null, inBurst: false, bursts: [], red: false };

export function feedRedZone(s: RedZoneState, tMs: number, level: number): RedZoneState {
  if (!Number.isFinite(level) || level < 0) return s;
  const startMs = s.startMs ?? tMs;
  if (s.baseline == null) {
    const calmSum = s.calmSum + level, calmN = s.calmN + 1;
    if (tMs - startMs >= BASELINE_MS && calmN >= 5) return { ...s, startMs, calmSum, calmN, baseline: Math.max(1e-4, calmSum / calmN) };
    return { ...s, startMs, calmSum, calmN };
  }
  const loud = level >= s.baseline * BURST_X;
  let { aboveSinceMs, inBurst, bursts } = s;
  if (loud) {
    aboveSinceMs = aboveSinceMs ?? tMs;
    if (!inBurst && tMs - aboveSinceMs >= BURST_MS) { inBurst = true; bursts = [...bursts, tMs]; }
  } else { aboveSinceMs = null; inBurst = false; }
  bursts = bursts.filter(b => tMs - b <= RED_WINDOW_MS);
  return { ...s, aboveSinceMs, inBurst, bursts, red: bursts.length >= RED_BURSTS };
}
