"use client";

/**
 * THE HONESTY PLAQUE — "ONE MARKET FIDELITY."
 *
 * Visual source: WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow.jpg (2026-09-18).
 * Contract source: `src/lib/marketData/marketFidelityAlgebra.ts`, from
 * SUPPORT — Truth Resolver Fidelity + MarketObject Attachments §1.
 *
 * ── WHAT THE MOCKUP'S TITLE IS ARGUING WITH ──────────────────────────────────
 *
 * "Fidelity five, NOT A RAINBOW." The failure it names is a surface that earns
 * its honesty score by wearing it: five little coloured badges along a masthead,
 * one per subsystem, each technically true and collectively unreadable. A
 * trader glancing at five chips does not compose them — they see decoration and
 * they stop looking, which is worse than no plaque at all, because the house
 * can now say it disclosed.
 *
 * So the plaque states ONE word. The composition is the algebra's job, not the
 * reader's. Which of the five reasons produced it is real and is kept, but it
 * is kept BEHIND a disclosure, because a reason promoted to a badge becomes a
 * second fidelity competing with the first.
 *
 * ── asOf IS NOT OPTIONAL, AND THAT IS ENFORCED UPSTREAM ──────────────────────
 *
 * The algebra's docblock puts it exactly: "fidelity without asOf is a mood."
 * DEGRADED with no timestamp cannot be acted on, cannot be aged out, and
 * cannot be distinguished from DEGRADED-an-hour-ago. `readMarketFidelity`
 * refuses to build a reading without a finite one, so this component cannot be
 * handed a mood — it takes a `MarketFidelityReading` or it takes null.
 *
 * ── AND WHY THE TREATMENT IS PRINTED IN WORDS ────────────────────────────────
 *
 * The mockup's foot rail reads CHART INTEGRITY · WOUNDED. That is
 * `paintTreatment()` made visible, and printing it matters because the
 * treatment is otherwise expressed only as opacity. A dimmed chart and a chart
 * on a dim monitor are the same picture. The word is the part that cannot be
 * mistaken for the room's lighting.
 */

import { traderClock } from "@/components/time/traderClock";
import * as React from "react";

import {
  canPaint,
  paintTreatment,
  type MarketFidelityReading,
} from "@/lib/marketData/marketFidelityAlgebra";
// The word map moved out to the selector that the decision rail's fold handle
// also reads. It is the SAME sentence in two places on one screen — the chip on
// the closed handle, and this foot rail one click below it — so it must have
// one spelling. A private copy here is how a rename lands on only one of them.
import { INTEGRITY_WORD } from "@/lib/marketData/viewModels/selectFoldEscalation";
// What the plaque grades, in trader words — one owner (2026-10-09). The plaque
// sat beside a MARKET cell reading LIVE and said UNMEASURED, or INDICATIVE with
// "No reason recorded": true sentences that read as a contradiction because the
// plaque never named its subject.
import {
  CANVAS_FIDELITY_LABEL,
  CANVAS_FIDELITY_MEANING,
  CANVAS_UNGRADED_UNKNOWN,
  CANVAS_UNGRADED_WORDS,
  FIDELITY_REASON_WORDS,
  NO_FAULT_ON_FILE,
} from "@/lib/marketData/canvasFidelityWords";
import type { CanvasUngraded } from "@/lib/marketData/readCanvasHonesty";

/* ── PALETTE ───────────────────────────────────────────────────────────────── */

const BRASS = "#c9a55c";
const IVORY = "#ede6d3";
const PARCHMENT = "#c2b892";
const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

/* INTEGRITY_WORD — what the treatment means in words, for the foot rail — now
   lives in selectFoldEscalation and is imported above. NONE is not "fine" and
   not "broken": it is the state where the house declines to paint at all, and
   the rail says so rather than leaving the slot empty. An empty integrity slot
   reads as integrity. */

export interface MarketHonestyPlaqueProps {
  /**
   * The composed reading, or null when the house has not established one.
   * Null is a real state and is rendered — see below.
   */
  readonly reading: MarketFidelityReading | null;
  /**
   * Why there is no reading (only read when `reading` is null): which question
   * is still open. Without it the plaque says only that the chart is not graded.
   */
  readonly ungraded?: CanvasUngraded | null;
  /** Rendered pre-expanded when the surface has room. Never auto-expands. */
  readonly showRaw?: boolean;
  /** Formats asOf. Injected so this component holds no clock of its own. */
  readonly formatAsOf?: (asOf: number) => string;
}

// Local time with its zone (traderClock, F2 2026-10-07); was a bare UTC clock.
const defaultFormatAsOf = (asOf: number): string => traderClock(asOf);

/** What the chart does with a STALE price — true of the glass, not a paint claim. */
export const STALE_CANVAS_WORDS = "Last verified bars shown · no live price";

export function MarketHonestyPlaque({
  reading,
  ungraded = null,
  showRaw = false,
  formatAsOf = defaultFormatAsOf,
}: MarketHonestyPlaqueProps): React.ReactElement {
  /**
   * NO READING IS NOT A CLEAN BILL.
   *
   * The tempting default is to render nothing when the house has not composed
   * a fidelity, which makes an unmeasured canvas look exactly like a certified
   * one. UNMEASURED is one of the honest states the Harvest directive lists,
   * and it is the one most likely to be dropped, because dropping it is what
   * "render only when you have something" does by accident.
   */
  if (!reading) {
    return (
      <section
        data-testid="honesty-plaque"
        data-fidelity="UNMEASURED"
        style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: "8px 12px" }}
      >
        <div data-testid="honesty-plaque-subject" style={{ fontSize: 10, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>
          Honesty plaque · {CANVAS_FIDELITY_LABEL}
        </div>
        <div
          data-testid="honesty-plaque-fidelity"
          style={{ fontSize: 18, letterSpacing: 1.2, color: MUTED, fontStyle: "italic" }}
        >
          UNMEASURED
        </div>
        {/* WHICH QUESTION IS OPEN. "Unmeasured" beside a feed reading LIVE read
            as the house contradicting itself; the cause is what was missing. */}
        <div data-testid="honesty-plaque-ungraded" data-ungraded={ungraded ?? "UNKNOWN"} style={{ fontSize: 11, color: MUTED }}>
          {ungraded ? CANVAS_UNGRADED_WORDS[ungraded] : CANVAS_UNGRADED_UNKNOWN}
        </div>
      </section>
    );
  }

  const treatment = paintTreatment(reading);

  return (
    <section
      data-testid="honesty-plaque"
      data-fidelity={reading.fidelity}
      data-treatment={treatment}
      style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: "8px 12px" }}
    >
      <div data-testid="honesty-plaque-subject" style={{ fontSize: 10, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>
        Honesty plaque · {CANVAS_FIDELITY_LABEL}
      </div>

      {/* THE ONE WORD. Not five chips. */}
      <div
        data-testid="honesty-plaque-fidelity"
        style={{ fontSize: 18, letterSpacing: 1.2, color: IVORY }}
      >
        {reading.fidelity}
      </div>

      {/* WHAT THE WORD MEANS HERE, and what is missing — so INDICATIVE beside a
          MARKET cell reading LIVE is two facts, not a disagreement. */}
      <div data-testid="honesty-plaque-meaning" style={{ fontSize: 11, color: PARCHMENT, lineHeight: 1.35 }}>
        {CANVAS_FIDELITY_MEANING[reading.fidelity]}
      </div>

      {/* Mandatory, and adjacent — a fidelity and its moment are one claim, and
          separating them across the masthead is how the moment gets dropped in
          a later layout pass. */}
      <div
        data-testid="honesty-plaque-asof"
        style={{ fontSize: 11, color: PARCHMENT, fontVariantNumeric: "tabular-nums" }}
      >
        asOf {formatAsOf(reading.asOf)}
      </div>

      {/* REASONS, BEHIND A DOOR. A reason promoted to a badge becomes a second
          fidelity competing with the first — which is the rainbow the mockup's
          title is arguing against. `<details>` keeps them one press away and
          reversible, which the canon requires of evidence, without letting them
          bid for the glance. */}
      {reading.reasons.length > 0 ? (
        <details open={showRaw} data-testid="honesty-plaque-raw">
          <summary style={{ fontSize: 10, letterSpacing: 0.8, color: BRASS, cursor: "pointer" }}>
            {reading.reasons.length} reason{reading.reasons.length === 1 ? "" : "s"} on file
          </summary>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
            {reading.reasons.map((r) => (
              <li
                key={r}
                data-testid={`honesty-reason-${r}`}
                style={{ fontSize: 11, color: PARCHMENT, listStyle: "none" }}
              >
                {FIDELITY_REASON_WORDS[r]}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        // LOOKED AND FOUND NOTHING. An absent disclosure and an empty one are
        // different claims, and this is the second.
        <div data-testid="honesty-plaque-no-reasons" style={{ fontSize: 10, color: MUTED }}>
          {NO_FAULT_ON_FILE}
        </div>
      )}

      {/* THE FOOT RAIL — treatment in words, because a dimmed chart and a dim
          monitor are the same picture. */}
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: `1px solid ${HAIR}`,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 10,
          letterSpacing: 0.6,
          color: MUTED,
          textTransform: "uppercase",
        }}
      >
        <span data-testid="chart-integrity" data-integrity={INTEGRITY_WORD[treatment]}>
          Chart integrity · {INTEGRITY_WORD[treatment]}
        </span>
        {/* Stated, rather than left implied by the treatment word, because
            "may this be painted at all" is a different question from "how". */}
        <span data-testid="honesty-plaque-paintable">
          {/* A STALE price is not withheld from the glass: the chart paints the
              last verified bars and no live price. Say exactly that. */}
          {canPaint(reading) ? "Canvas paints" : STALE_CANVAS_WORDS}
        </span>
      </div>
    </section>
  );
}

export default MarketHonestyPlaque;
