/**
 * WM-CHART-P0-05b — Custom Big Trades quantity validation.
 *
 * Extracted so the CustomBubbleQtyInput component can be unit-tested without
 * mounting React. The reject-not-clamp rule is a data-truth commitment
 * (per Founder directive §5): a user-typed number outside the allowed range
 * is refused with a visible error, never silently coerced to the nearest
 * preset — silent coercion is the same class as silent timeframe downgrade.
 */

export const BUBBLE_MIN = 1;
export const BUBBLE_MAX = 5000;
export const BUBBLE_PRESETS: ReadonlySet<number> = new Set([0, 25, 50, 75, 100, 150, 200]);

export type BubbleQtyValidation =
  | { kind: "empty" }
  | { kind: "valid"; value: number; isCustom: boolean; matchesCurrent: boolean }
  | { kind: "invalid"; reason: "not-integer" | "out-of-range" };

export function validateBubbleQtyInput(raw: string, currentMaxN: number): BubbleQtyValidation {
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "empty" };

  // Strict decimal-integer only: `Number()` would silently accept "1e2", "0x64",
  // whitespace, and infinities — none of which a user typing a bubble count
  // means. Match the string the user sees.
  if (!/^-?\d+$/.test(trimmed)) return { kind: "invalid", reason: "not-integer" };
  const n = Number(trimmed);
  if (!Number.isInteger(n)) return { kind: "invalid", reason: "not-integer" };
  if (n < BUBBLE_MIN || n > BUBBLE_MAX) return { kind: "invalid", reason: "out-of-range" };

  return {
    kind: "valid",
    value: n,
    isCustom: !BUBBLE_PRESETS.has(n),
    matchesCurrent: n === currentMaxN,
  };
}

export function isCustomActive(maxN: number): boolean {
  return maxN > 0 && !BUBBLE_PRESETS.has(maxN);
}
