/**
 * ONE MORNING, ONE BAND — THE PICTURE GETS AN OWNER TOO.
 *
 * `selectPrepChecklistBand` already ended the arithmetic drift: three rooms
 * asked one owner how many items the trader ticked. But the PICTURE was still
 * copied by hand into two of them, and a copied picture drifts exactly the way
 * a copied number does. It had already started: the deck drew the band 76px
 * wide with a caption at 0.3 letter-spacing, the journal drew the same band
 * 72px wide at 0.2. Nobody decided that. It is just what two hands produce.
 *
 * Four pixels is not the defect. The defect is that the two rooms show the SAME
 * FACT and a trader moving between them is reading two slightly different
 * instruments — and the next divergence will be the fill, or the mark height,
 * or a room quietly deciding that a full band deserves a colour.
 *
 * ── WHAT THIS COMPONENT OWNS, AND WHY IT IS NOT A PROP ───────────────────────
 *
 * WIDTH, MARK HEIGHT, GAP, FILL, CAPTION TYPOGRAPHY. None of these are props.
 * A `width` prop would make the drift a configuration rather than a mistake,
 * which is worse: it would look deliberate in review. If a room genuinely needs
 * a different band one day, that is a conversation about the instrument, and it
 * belongs in this file where both rooms will see it.
 *
 * ── WHAT THE ROOM STILL CHOOSES ──────────────────────────────────────────────
 *
 * `inline` — the deck stacks the band above its caption inside a flex column;
 * the journal sits in a run of text and must not break it. That is a genuine
 * difference in HOST CONTEXT, not a difference of opinion about the band.
 *
 * `testId` — the two rooms were already named apart (`prep-checklist-*`,
 * `journal-prep-*`) and the existing Sentinels address them by those names. A
 * shared id would have made "the deck draws it" and "the journal draws it"
 * indistinguishable to every guard that watches them.
 *
 * `caption` — a FUNCTION of the compiled band, never a string. The deck reads
 * "7 of 11 checked", the journal "checklist 7 of 11", because the journal's
 * strip has no nearby heading to say what is being counted. Passing a function
 * rather than text means a room receives `done` and `total` ALREADY COMPILED
 * and can still never perform arithmetic of its own — there is nothing to
 * divide, and no null to mishandle, because the component does not call the
 * caption when there is no band.
 *
 * ── THE LAWS IT CARRIES, INHERITED FROM THE OWNER ────────────────────────────
 *
 * H1 — `band === null` draws NOTHING. The selector returns null for an
 * unreadable prep, an absent prep and an empty list, precisely so that "we
 * could not look" is never rendered as "you did nothing". A band of unlit marks
 * in that case would be the cardinal defect, drawn in geometry.
 *
 * LABEL-NOT-MODEL — a mark carries no id, no label, no name. The system knows
 * HOW MANY items were ticked and never WHICH. It follows that this band may not
 * be drawn beside a named item list, which is why `/morning-prep` — the one
 * room that shows the trader's actual rows — does not use it.
 *
 * THE DENOMINATOR MAY NOT SHRINK. Every mark is `flex: 1 1 0`. An item still
 * owed keeps its full width and loses its light. Exactly one thing is
 * conditional, and it is the FILL.
 *
 * §9 — no green at any state. A full checklist is not a safe trade and the
 * house has no standing to congratulate anyone for one. The journal used to
 * turn this figure sage green on the last tick; that is the grammar being
 * refused here permanently, by having only one colour to turn.
 *
 * §15 — no verdict, no percentage. Three of eleven is not 27% prepared.
 *
 * The band is `aria-hidden`, so the caption is not a caption: it carries the
 * WHOLE reading for a screen reader. A band with no caption would be a picture
 * nobody non-visual can read, which is why `caption` is required.
 */

import * as React from "react";
import type { PrepChecklistBand as PrepChecklistBandVM } from "@/lib/experience/selectPrepChecklistBand";

/** Ivory — a FINDING. What the trader did. */
const CHECKED = "#ede6d3";
/** Muted, and still full width. What the trader has not done yet. */
const UNCHECKED = "rgba(138,130,113,0.22)";
/** The house's absence/quiet colour. Never brass: the house is not raising its
 *  voice at the trader about the trader. */
const COUNT = "#8a8271";

/** One instrument, one size, in every room that shows it. */
const BAND_WIDTH = 76;
const MARK_HEIGHT = 4;
const MARK_GAP = 2;

export interface PrepChecklistBandProps {
  /** The compiled band, or `null` — which draws nothing at all. */
  readonly band: PrepChecklistBandVM | null;
  /** Names the room. `${testId}-band`, `-mark`, `-count`. */
  readonly testId: string;
  /** The whole reading, in words, from figures already compiled. */
  readonly caption: (band: PrepChecklistBandVM) => string;
  /** True inside a run of text, where a block element would break the line. */
  readonly inline?: boolean;
}

export function PrepChecklistBand({
  band,
  testId,
  caption,
  inline = false,
}: PrepChecklistBandProps): React.ReactElement | null {
  // H1. Nothing observed draws nothing — not a row of empty marks.
  if (!band) return null;

  const Box = inline ? "span" : "div";

  return (
    <>
      <Box
        data-testid={`${testId}-band`}
        data-done={band.done}
        data-total={band.total}
        aria-hidden="true"
        style={{
          display: inline ? "inline-flex" : "flex",
          gap: MARK_GAP,
          width: BAND_WIDTH,
        }}
      >
        {band.marks.map((mark, i) => (
          <span
            key={i}
            data-testid={`${testId}-mark`}
            data-checked={mark.checked ? "true" : "false"}
            style={{
              // The denominator may not shrink to flatter the numerator.
              flex: "1 1 0",
              minWidth: 0,
              height: MARK_HEIGHT,
              borderRadius: 1,
              // The ONLY conditional. Nothing about the geometry may ask.
              background: mark.checked ? CHECKED : UNCHECKED,
            }}
          />
        ))}
      </Box>
      <Box
        data-testid={`${testId}-count`}
        style={{ fontSize: 10, color: COUNT, letterSpacing: 0.3 }}
      >
        {caption(band)}
      </Box>
    </>
  );
}

export default PrepChecklistBand;
