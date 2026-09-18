/**
 * HOW MUCH OF THE BOARD IS LIT — one instrument, two sizes.
 *
 * Eight canonical dimensions resolve, half-resolve, or do not resolve. The
 * compiler already sorts them: `partitionDimensionStandings` walks
 * `MARKET_STATE_DIMENSION_KEYS` and assigns every key to exactly one of
 * RESOLVED / MEASURED / MISSING. That partition is TOTAL and DISJOINT, which is
 * the entire licence for drawing it as a row — a denominator that cannot reach
 * full is not a denominator, and a denominator that can be double-counted is a
 * lie waiting for the right board.
 *
 * ── WHY IT IS A COMPONENT AND NOT A COPY ─────────────────────────────────────
 *
 * It began inside `MarketCanvasPanel`. `CanvasSummaryPill` needs the same
 * reading in a header, and the pill was showing it as WORDS — "8 unresolved · 1
 * measured" — beside a panel drawing it as geometry. One fact in two registers,
 * which is how two surfaces start disagreeing: this pill once read "7
 * unresolved" on live TSLA while the panel beside it said "RESOLVED (4)", 11 of
 * 8, because PARTIAL was counted in both.
 *
 * The prep band next door taught the rest of it. Copying a picture drifts
 * exactly the way copying a number drifts, and four pixels apart is small
 * enough that nobody writes an assertion for it.
 *
 * ── WHAT THE CALLER CANNOT GET WRONG ─────────────────────────────────────────
 *
 * It takes the VM, not three arrays. The ORDER — resolved, then measured, then
 * unresolved — is a law: the row reads left-to-right from what the house knows
 * toward what it does not, and a caller who passed them in another order would
 * draw a shuffled board that still looked plausible. There is no argument for
 * the order to be wrong in, now.
 *
 * FILL, HEIGHT, GAP and the WORDS are the component's. `scale` chooses between
 * two host contexts that genuinely differ — a panel with room for a heading,
 * and a 10px chip row that has none — and both sizes are defined here so the
 * two can never drift.
 *
 * ── THE LAWS IT CARRIES ──────────────────────────────────────────────────────
 *
 * THE DENOMINATOR MAY NOT SHRINK. Every mark is `flex: 1 1 0`. A dimension the
 * house has not resolved holds its full width and loses its light. The row is
 * the same length on a dark board and a lit one; only the light differs.
 *
 * §9 — the three standings differ by FILL, never by hue. There is no green mark
 * for a resolved dimension, because resolved is not safe. It only means the
 * board is lit there.
 *
 * §15 — it adds nothing up and prints no percentage. The marks ARE the count.
 * Two of eight is not 25% ready.
 *
 * LABEL-NOT-MODEL — a mark carries its STANDING and never its NAME. The first
 * cut hung the dimension name on each mark's `title`, which quietly defeated
 * the panel's own row cap: the ledger declines to draw more than six rows and
 * says "+3 more", and a ninth name arriving in a tooltip makes that disclosure
 * false about the markup it is printed in. The band answers HOW MUCH, and is
 * not a second index of WHICH.
 *
 * §Silence Is A Feature — no dimensions at all draws nothing. An empty row is a
 * denominator of zero wearing a row's clothes.
 */

import * as React from "react";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

export const STANDING = {
  /** A FINDING. Ivory is what the house pays for something it actually knows. */
  RESOLVED: { fill: "#ede6d3", word: "resolved" },
  /**
   * A reading exists and is not decision-grade. Dimmer ivory rather than a
   * separate colour: the light reached this dimension, it just did not arrive
   * at full strength. Calling it a third colour would make it a third KIND of
   * thing, and it is the same kind, half-lit.
   */
  MEASURED: { fill: "rgba(237,230,211,0.40)", word: "measured, not decision-grade" },
  /**
   * ABSENCE. Present in the row, holding its place, carrying no light.
   *
   * The word is "unresolved", not "missing", because that is what the panel's
   * heading says and this band is readable only by its adjacency to that
   * heading. The KEY stays MISSING because that is the compiler's name for the
   * bucket, and renaming a compiler's vocabulary to match a label is how two
   * surfaces start disagreeing about which bucket they are in.
   */
  MISSING: { fill: "rgba(138,130,113,0.22)", word: "unresolved" },
} as const;

export type Standing = keyof typeof STANDING;

/** The two host contexts, and everything that differs between them. */
const SCALE = {
  /** Inside MarketCanvasPanel — room for a heading, read at rest. */
  panel: { height: 6, gap: 3, heading: true, marginBottom: 10, width: undefined },
  /** Inside a 10px chip row — no heading, and it must not grow the row. */
  pill: { height: 3, gap: 2, heading: false, marginBottom: 0, width: 44 },
} as const;

export interface DimensionStandingBandProps {
  /** The compiled partition. Total and disjoint — that is what licenses a row. */
  readonly vm: Pick<MarketCanvasVM, "resolved" | "measured" | "missing">;
  /** Names the surface. `${testId}` on the row, `${testId}-mark` on each mark. */
  readonly testId: string;
  readonly scale?: keyof typeof SCALE;
}

/**
 * THE READING IN WORDS — for a tooltip, an aria-label, or anything that cannot
 * see a picture.
 *
 * Exported because the pill hides the band from assistive technology and must
 * carry the whole reading some other way. Built from the same compiled arrays
 * in the same order, so the words and the geometry cannot disagree.
 *
 * Empty buckets are omitted rather than printed as zero — "0 unresolved" is a
 * fact nobody needs and a line every board would carry.
 */
export function standingInWords(vm: DimensionStandingBandProps["vm"]): string {
  const parts = ORDER.filter(([, names]) => names(vm).length > 0).map(
    ([standing, names]) => `${names(vm).length} ${STANDING[standing].word}`,
  );
  return parts.join(", ");
}

/**
 * The order is a law, not a caller's choice: left-to-right from what the house
 * knows toward what it does not.
 */
const ORDER = [
  ["RESOLVED", (v: DimensionStandingBandProps["vm"]) => v.resolved],
  ["MEASURED", (v: DimensionStandingBandProps["vm"]) => v.measured],
  ["MISSING", (v: DimensionStandingBandProps["vm"]) => v.missing],
] as const satisfies readonly (readonly [
  Standing,
  (v: DimensionStandingBandProps["vm"]) => readonly string[],
])[];

export function DimensionStandingBand({
  vm,
  testId,
  scale = "panel",
}: DimensionStandingBandProps): React.ReactElement | null {
  const s = SCALE[scale];

  // One mark per name the compiler sorted, and then the name is dropped.
  // `.length` is read nowhere; nothing here adds anything up.
  const marks = ORDER.flatMap(([standing, names]) => names(vm).map(() => standing));

  // §Silence Is A Feature. No snapshot means no dimensions, and an empty band
  // is a denominator of zero drawn as if it were a row.
  if (marks.length === 0) return null;

  return (
    <div
      data-testid={testId}
      style={{
        marginBottom: s.marginBottom,
        ...(scale === "pill" ? { display: "inline-block", width: s.width } : null),
      }}
    >
      {s.heading && (
        <div
          style={{
            fontSize: 9,
            letterSpacing: 0.5,
            color: "#8a8271",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Dimension standing
        </div>
      )}
      <div style={{ display: "flex", gap: s.gap }}>
        {marks.map((standing, i) => (
          <div
            key={`${standing}-${i}`}
            data-testid={`${testId}-mark`}
            data-standing={standing}
            // The panel is read at rest and a hover is useful there. In a chip
            // row the pill owns one tooltip for the whole control, and eight
            // more inside it would fight it.
            title={s.heading ? STANDING[standing].word : undefined}
            style={{
              // The denominator may not shrink to flatter the numerator.
              flex: "1 1 0",
              height: s.height,
              borderRadius: 1,
              // The ONLY thing that varies. Never the geometry.
              background: STANDING[standing].fill,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default DimensionStandingBand;
