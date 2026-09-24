/**
 * PROFILE DNA — the profile's fingerprint, in numbers. P-110 organism #5.
 *
 * Child: PROFILE DNA. Parent family: F09 Profiles. Class: CHART LANGUAGE
 * (annotation of the Living Profile). House surface: /charts, printed under
 * the Living Profile histogram it describes. Plate: WM_H_P110_PROFILE_ORGANISM
 * ("5 · DNA · Behavioral & statistical code"); Registry F.5 "fingerprint
 * numbers · uncertainty · sample size / evidence honesty · never prophecy".
 *
 * ── WHAT IT IS, AND WHAT IT REFUSES TO BE ────────────────────────────────────
 *
 * A trader glancing at a profile reads its SHAPE before any level: a P (value
 * built high — buyers accepted higher prices), a b (value built low), a D
 * (balanced), or an elongated distribution (a trend that never paused long
 * enough to build value). DNA puts that reading into four stated numbers so it
 * is the same reading every time, on every surface.
 *
 * It is DESCRIPTION, never prophecy. A P-shape says where value was built; it
 * does not say price will go up. No field here is a probability, a score, or
 * a direction.
 *
 * ── THE NUMBERS ──────────────────────────────────────────────────────────────
 *
 *   pocPosition  — where the POC sits in the traded range, 0 = low, 1 = high.
 *   valueWidth   — (VAH − VAL) ÷ range. Wide = little agreement on value.
 *   massCentre   — volume-weighted mean price position, 0..1.
 *   rows / bars  — the sample, always printed beside the shape.
 *
 * Thresholds are stated constants, not tuned magic: shape is ELONGATED when
 * value spans ≥ 60% of the range; otherwise P / b when the POC sits in the
 * top / bottom 38%; otherwise D.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

export const PROFILE_DNA_VERSION = 1;
/** Below this many traded rows a shape is the sample's range, not a fingerprint. */
export const MIN_DNA_ROWS = 12;
export const ELONGATED_VALUE_WIDTH = 0.6;
export const SHAPE_EDGE = 0.38;

export type ProfileShape = "P" | "b" | "D" | "ELONGATED";
export type ProfileDnaReason = "MEASURED" | "NO_PROFILE" | "THIN_SAMPLE" | "FLAT_RANGE";

export interface ProfileDnaInput {
  readonly curve: readonly { readonly price: number; readonly volume: number }[];
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  /** How many bars the profile was built from. Printed, never inferred. */
  readonly bars: number;
  readonly estimated: boolean;
}

export interface ProfileDnaVM {
  readonly version: number;
  readonly measured: boolean;
  readonly reason: ProfileDnaReason;
  readonly shape: ProfileShape | null;
  readonly pocPosition: number | null;
  readonly valueWidth: number | null;
  readonly massCentre: number | null;
  readonly rows: number;
  readonly bars: number;
  readonly estimated: boolean;
  /** The strip the canvas prints verbatim. Empty when not measured. */
  readonly strip: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function selectProfileDna(input: ProfileDnaInput | null | undefined): ProfileDnaVM {
  const none = (reason: Exclude<ProfileDnaReason, "MEASURED">, rows = 0): ProfileDnaVM => ({
    version: PROFILE_DNA_VERSION,
    measured: false,
    reason,
    shape: null,
    pocPosition: null,
    valueWidth: null,
    massCentre: null,
    rows,
    bars: input?.bars ?? 0,
    estimated: input?.estimated ?? true,
    strip: "",
  });

  if (!input || input.poc == null || input.vah == null || input.val == null) return none("NO_PROFILE");
  const traded = input.curve.filter(p => Number.isFinite(p.price) && p.volume > 0);
  if (traded.length === 0) return none("NO_PROFILE");
  if (traded.length < MIN_DNA_ROWS) return none("THIN_SAMPLE", traded.length);

  let lo = Infinity;
  let hi = -Infinity;
  let vol = 0;
  let weighted = 0;
  for (const p of traded) {
    if (p.price < lo) lo = p.price;
    if (p.price > hi) hi = p.price;
    vol += p.volume;
    weighted += p.price * p.volume;
  }
  const range = hi - lo;
  if (!(range > 0) || !(vol > 0)) return none("FLAT_RANGE", traded.length);

  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const pocPosition = clamp((input.poc - lo) / range);
  const valueWidth = clamp((input.vah - input.val) / range);
  const massCentre = clamp((weighted / vol - lo) / range);

  const shape: ProfileShape =
    valueWidth >= ELONGATED_VALUE_WIDTH ? "ELONGATED"
      : pocPosition >= 1 - SHAPE_EDGE ? "P"
        : pocPosition <= SHAPE_EDGE ? "b"
          : "D";

  const est = input.estimated ? " · EST" : "";
  const strip =
    `DNA ${shape} · VALUE ${pct(valueWidth)} OF RANGE · POC AT ${pct(pocPosition)} · ` +
    `${traded.length} ROWS${input.estimated ? ` / ${input.bars} BARS` : ""}${est}`;

  return {
    version: PROFILE_DNA_VERSION,
    measured: true,
    reason: "MEASURED",
    shape,
    pocPosition,
    valueWidth,
    massCentre,
    rows: traded.length,
    bars: input.bars,
    estimated: input.estimated,
    strip,
  };
}

export default selectProfileDna;
