/**
 * REALIZED R, STATED ONCE — and never coloured by its sign.
 *
 * The house draws this number in three places. In September 2026 one of them
 * was repaired and the other two were not, and nobody noticed for a month,
 * because nothing connected them:
 *
 *   DecisionReceiptPanel   `realizedR >= 0 ? "#9db88a" : "#e07b5c"`   repaired
 *   /journal list chip     `realizedR >= 0 ? "text-wm-green" : ...`   NOT
 *   /journal detail figure `realizedR >= 0 ? "text-wm-green" : ...`   NOT
 *
 * That is the same shape as every other defect this house keeps finding: ONE
 * fact, drawn through several doors, so a repair at one door leaves the others
 * standing. The cure is the same too — one owner, and the callers are never
 * handed the decision.
 *
 * ── THE COLOUR ───────────────────────────────────────────────────────────────
 *
 * §9: "No green shield. No green means safe." A profitable trade is not a good
 * trade. The fact the house actually judges is printed beside this figure — by
 * rule, or discretionary — and on /journal that fact sat in muted grey while
 * the P&L held the loud channel. A loss taken BY RULE is the receipt working;
 * a win taken discretionarily is a rule that broke and got away with it.
 *
 * So the figure is ivory at every sign. The sign is already in the glyph and
 * does not need a second, louder channel with a verdict attached.
 *
 * ── THE SIGN ─────────────────────────────────────────────────────────────────
 *
 * `>= 0` prefixed a `+` to a SCRATCH, filing a flat trade under the favourable
 * outcome for free. That is H1's shape — a nothing drawn as a something — in
 * the place a trader reads fastest. It survives any colour repair, which is why
 * it is the thing most likely to be left behind by one: `> 0`.
 *
 * ── WHY IT LIVES HERE ────────────────────────────────────────────────────────
 *
 * `noGreenInTheRoom.sentinel.test.ts` is scoped to this directory. A figure
 * about a trader's realised capital belongs in the decision room on the merits,
 * and living here means the §9 sweep covers it permanently rather than until
 * the next person forgets.
 */

import * as React from "react";

/** FINDING. What the house observed, at every sign. */
const FIGURE = "#ede6d3";

export type RealizedRScale = "CHIP" | "FIGURE";

export interface RealizedRFigureProps {
  /** Realized R. Non-finite is not a reading and draws nothing. */
  readonly realizedR: number | null | undefined;
  /** CHIP for a scan row, FIGURE for a detail pane. Size only — never colour. */
  readonly scale?: RealizedRScale;
  readonly testId: string;
}

/**
 * THE SIGN, OWNED.
 *
 * Exported so a test can walk the boundary directly, and so nothing downstream
 * re-derives it with a different comparator — which is exactly how the three
 * call sites came to disagree.
 */
export function signedR(realizedR: number): string {
  // `> 0`, not `>= 0`. A scratch is not a gain.
  return `${realizedR > 0 ? "+" : ""}${realizedR.toFixed(2)}R`;
}

export function RealizedRFigure({
  realizedR,
  scale = "CHIP",
  testId,
}: RealizedRFigureProps): React.ReactElement | null {
  // H1. No reading is not a reading of zero. A record that pre-dates the Proof
  // Lane fields has no realised R, and must not be drawn as a flat trade.
  if (typeof realizedR !== "number" || !Number.isFinite(realizedR)) return null;

  const chip = scale === "CHIP";
  return (
    <span
      data-testid={testId}
      data-realized-r={realizedR}
      data-scale={scale}
      title="Realized R. A count of the outcome — whether it was taken by rule is the separate fact beside it."
      className={
        chip
          ? "px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border"
          : "text-sm font-mono font-bold mt-0.5"
      }
      style={{
        color: FIGURE,
        // The chip keeps a hairline so it still reads as a chip beside its
        // neighbours. It is the same hairline at every sign, so nothing about
        // the container moves with the number either.
        ...(chip
          ? {
              border: "1px solid rgba(237,230,211,0.16)",
              background: "rgba(237,230,211,0.06)",
            }
          : {}),
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {signedR(realizedR)}
    </span>
  );
}

export default RealizedRFigure;
