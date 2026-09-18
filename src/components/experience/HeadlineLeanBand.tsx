/**
 * WHICH WAY A HEADLINE LEANED — drawn outward from a centre, never as a bar.
 *
 * This replaces `SentimentBar`, which drew `width: ${score}%` in one of three
 * colours with the number printed beside it. Every part of that sentence is a
 * defect, and they are different defects:
 *
 *   width: ${score}%   a proportion, of a denominator that does not exist
 *   three colours      green for bullish — §9, "no green means safe"
 *   the number         §15, a score
 *
 * ── WHY IT GROWS FROM THE CENTRE ─────────────────────────────────────────────
 *
 * A left-anchored bar has an implied full — it asks "how far along the scale is
 * this", and there is no scale. What the house actually has is two opposing
 * TALLIES. So the centre is zero, bearish terms lay marks to the left and
 * bullish terms to the right, and the reading is the shape: which side is
 * longer, and by how much.
 *
 * Nothing is drawn where nothing was found. There are no unlit slots waiting to
 * be filled, because unlit slots are a denominator wearing a row's clothes —
 * six empty boxes per side would tell a reader the scale runs to six, and it
 * does not run to anything. The width IS the count.
 *
 * ── THE STATE THE OLD BAR COULD NOT DRAW ─────────────────────────────────────
 *
 * `let score = 50` meant a headline with no sentiment vocabulary rendered as a
 * HALF-FULL amber bar reading "Neutral" — and so did a headline saying both
 * "record inflows" and "crash warning". Nothing found and both found, drawn
 * identically, at the one moment the difference matters.
 *
 * Here they cannot collide. NO_VOCABULARY is the bare centre tick and nothing
 * else — unmistakably the house having found nothing. CONFLICTED is marks on
 * BOTH sides, which is unmistakably the house having found opposition. And a
 * headline that was never read draws no band at all, because the component
 * returns null for a null lean.
 *
 * ── §9, HERE ─────────────────────────────────────────────────────────────────
 *
 * Both sides are ivory. Bullish is not green and bearish is not red, because a
 * bullish headline is not safe and a bearish one is not a loss — they are two
 * directions a sentence leaned, and the house does not have a favourite. The
 * direction is read from WHICH SIDE, which is a fact about the picture that no
 * colourblind reader can be cut out of.
 *
 * ── §15, AND WHAT THE TOOLTIP IS FOR ─────────────────────────────────────────
 *
 * No number is printed on the row. The tooltip carries the exact tally AND the
 * disclaimer that it is a keyword match over the headline, not a prediction —
 * because the tally is only honest if the reader knows how little produced it.
 * The words are also what a screen reader gets, since the marks are decoration.
 */

import * as React from "react";
import { LEAN_SLOTS, type HeadlineLean } from "@/lib/experience/selectHeadlineLean";

/** A matched term. Ivory is what the house pays for something it observed. */
const TERM = "#ede6d3";
/** The zero. Present always, so the reader can see where the counting starts. */
const CENTRE = "rgba(138,130,113,0.55)";

const MARK_W = 4;
const MARK_H = 4;
const GAP = 2;
const CENTRE_W = 1;

/** Fixed so rows in a list align on their zero, whatever each one found. */
const SIDE_W = LEAN_SLOTS * (MARK_W + GAP);

export interface HeadlineLeanBandProps {
  /** Null means the headline was never read. Not "read and found nothing". */
  readonly lean: HeadlineLean | null;
  readonly testId: string;
}

/**
 * THE READING IN WORDS — for the tooltip, and for anything without eyes.
 *
 * Exported so the row can hide the marks from assistive technology and still
 * carry the whole reading. Built from the same fields in the same order as the
 * picture, so the two cannot disagree.
 *
 * It always ends by saying what the tally IS. The lists contain "lead",
 * "clear", "top", "signal" and "narrow", all of which appear innocently in
 * headlines, so a reader who takes this for a model output has been misled by
 * us rather than by the news.
 */
export function leanInWords(lean: HeadlineLean): string {
  // An empty side is OMITTED rather than printed as "0 bearish". A reader
  // scanning a headline for opposition should not find a number where there is
  // nothing — that is the same defect as the 50 baseline, one clause smaller.
  const sides = [
    [lean.bullish, "bullish"],
    [lean.bearish, "bearish"],
  ] as const;
  const tally =
    lean.matched === 0
      ? "No sentiment keywords matched"
      : `${sides
          .filter(([n]) => n > 0)
          .map(([n, word]) => `${n} ${word}`)
          .join(", ")} keyword${lean.matched === 1 ? "" : "s"} matched`;
  return `${tally} — a keyword tally over the headline, not a prediction.`;
}

/** Marks for one side, laid from the centre outward. */
function Side({
  count,
  side,
  testId,
}: {
  count: number;
  side: "bullish" | "bearish";
  testId: string;
}): React.ReactElement {
  // The reading may exceed what the row can draw. It clamps, says so in the
  // markup, and the tooltip still carries the true number — a picture that
  // quietly caps is a picture that lies about large readings only.
  const drawn = Math.min(count, LEAN_SLOTS);
  return (
    <span
      data-testid={`${testId}-${side}`}
      data-count={count}
      data-drawn={drawn}
      data-clamped={count > LEAN_SLOTS ? "true" : "false"}
      style={{
        display: "inline-flex",
        gap: GAP,
        width: SIDE_W,
        // Both sides count AWAY from the centre, so the left side lays its
        // marks right-to-left. Without this the bearish tally would read
        // inward and the two sides would not mirror.
        justifyContent: side === "bearish" ? "flex-end" : "flex-start",
      }}
    >
      {Array.from({ length: drawn }, (_, i) => (
        <span
          key={i}
          data-testid={`${testId}-mark`}
          data-side={side}
          style={{
            width: MARK_W,
            height: MARK_H,
            borderRadius: 1,
            // The ONLY colour in the instrument. Direction is position.
            background: TERM,
          }}
        />
      ))}
    </span>
  );
}

export function HeadlineLeanBand({
  lean,
  testId,
}: HeadlineLeanBandProps): React.ReactElement | null {
  // H1. The headline was never read; the house has nothing to say and says it.
  if (!lean) return null;

  const words = leanInWords(lean);

  return (
    <span
      data-testid={testId}
      data-direction={lean.direction}
      title={words}
      style={{ display: "inline-flex", alignItems: "center", gap: GAP }}
    >
      {/* The marks are decoration; the words below carry the whole reading. */}
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: GAP }}>
        <Side count={lean.bearish} side="bearish" testId={testId} />
        <span
          data-testid={`${testId}-centre`}
          style={{ width: CENTRE_W, height: MARK_H + 2, background: CENTRE }}
        />
        <Side count={lean.bullish} side="bullish" testId={testId} />
      </span>
      <span
        data-testid={`${testId}-sr`}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {words}
      </span>
    </span>
  );
}

export default HeadlineLeanBand;
