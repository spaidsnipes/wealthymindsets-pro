"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import {
  usePracticeHonestyLedger,
  practiceHonestyHasDisclosure,
} from "@/lib/practice/usePracticeHonestyLedger";
import { selectPracticeEasementStages } from "@/lib/practice/selectPracticeEasementStages";

/**
 * PracticeHonestyLayer — the REVIEW contextual layer of the decision room.
 *
 * WHY IT IS HERE AND NOT ON /paper
 * --------------------------------
 * Five modules already measure the ways the practice book was easier than a
 * real venue. Until this component, every one of those truths was visible
 * ONLY inside the legacy /paper page's tab chrome — which is precisely the
 * SCENE_FRAGMENTATION the current visual repair law names: truth living in a
 * mini-app instead of in the one room. The Visual Implementation Pack's
 * coverage matrix lists REVIEW / RECEIPT as an outright GAP. This is the room
 * consuming truth it already owned.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not a second /paper. There is no book here, no order list, no ticket,
 * no action. It renders SENTENCES a compiler produced and nothing else, and it
 * is a contextual DRAWER rather than permanent primary pixels, because the
 * repair law reserves the room's primary surface for MARKET and sends
 * secondary machinery to drawers.
 *
 * TRUTH DISCIPLINE
 * ----------------
 * · This component holds NO private read of the practice book. It consumes
 *   `usePracticeHonestyLedger`, which is the one reader for every surface that
 *   needs to know what the book was easier about. The hydration rules — read
 *   after mount only, clock captured once at read time and never called inside
 *   a render body, unread kept distinct from empty — live there, stated once,
 *   where the read is. Two compilations of one subject, free to disagree, is
 *   the second semantic brain the equipment grammar bans by name.
 * · Renders NOTHING when the ledger is empty AND nobody asked. A trader who
 *   has not practised is owed silence, not a disclosure about fills that never
 *   happened. See `disclosed` for the one case where silence becomes a lie.
 */
export interface PracticeHonestyLayerProps {
  /**
   * MY CONTAINER IS ALREADY THE DISCLOSURE — DO NOT CARRY A SECOND ONE.
   *
   * Two things change when this is true, and they are the same decision seen
   * from two sides.
   *
   * 1. NO `<details>`. This component's default home is inside a drawer in the
   *    room, where it must fold itself away. Its other home is behind an
   *    equipment door on the Workspace rail — and a `<details>` rendered inside
   *    a drawer the trader has already opened is drawer-inside-drawer burial,
   *    which the interaction directive bans by name. The trader pressed once;
   *    they do not press again to reach the thing they pressed for.
   *
   * 2. NO SILENT NULL. Folded away in the room, an empty ledger renders nothing
   *    and that is correct — nobody asked. Behind a door the trader has just
   *    opened, rendering nothing is a PAINTED DOOR: a control that answers a
   *    deliberate press with a blank. So when asked directly and the book has
   *    nothing to disclose, the component says so in a sentence.
   *
   * The two cases are not symmetric and must not be collapsed into one flag
   * meaning "open". Silence is the right answer to a question nobody asked and
   * the wrong answer to one somebody did.
   */
  readonly disclosed?: boolean;
  /**
   * Give the ledger its full professional depth. Every easement HEADING renders
   * at every width; this lifts the cap on the SENTENCES that explain each one.
   *
   * Orthogonal to `disclosed` on purpose, and the two must never be merged.
   * `disclosed` answers "has my container already opened me" — a structural
   * fact about who owns the fold. `unabridged` answers "how much room do I
   * have" — a fact about the screen. The equipment drawer is disclosed and
   * NOT unabridged; ENTER is both; the in-room fold is neither.
   */
  readonly unabridged?: boolean;
}

export function PracticeHonestyLayer({
  disclosed = false,
  unabridged = false,
}: PracticeHonestyLayerProps = {}) {
  // null = "not read yet" (server render + first client paint). Distinct from
  // an empty ledger, which means "read, and the book had nothing to disclose".
  // The read itself lives in the hook, because the room's equipment descriptor
  // needs the same ledger to label the door without compiling a second opinion.
  const ledger = usePracticeHonestyLedger();

  /**
   * Infinity, not a bigger number: "as many as I was handed" is the house rule.
   *
   * WHAT THIS CAP IS AND IS NOT. Each easement carries a HEADING naming the way
   * the book was easier, and SENTENCES explaining it. In the room's fold and in
   * the equipment drawer this component gets a narrow column, and five stacked
   * explanations there is a wall of prose nobody reads. Every heading always
   * renders — the trader is never left unaware that an easement EXISTS.
   * What ENTER buys is the explanation behind each one.
   */
  const sentenceCap = unabridged ? Number.POSITIVE_INFINITY : 1;

  if (!practiceHonestyHasDisclosure(ledger)) {
    // Nobody asked, and there is nothing to say. Silence is the whole answer.
    if (!disclosed) return null;
    // Somebody DID ask. Silence here would be a painted door.
    return (
      <div data-testid="practice-honesty-layer" data-practice-honesty-disclosed="1">
        <p
          data-testid="practice-honesty-empty"
          style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: WM.text.muted }}
        >
          {ledger == null
            ? "Reading your practice book…"
            : "Nothing to disclose yet — there are no practice fills for WM to be honest about."}
        </p>
      </div>
    );
  }

  /**
   * WHERE IN THE TRADE'S LIFE THE SOFTNESS LIVES — before a heading is read.
   *
   * A book easier in one way and a book easier in four rendered as the same
   * object here: a stack of headings, longer or shorter. The five-stage
   * ordering this ledger was built around was invisible. The strip projects the
   * SAME ledger onto its own grammar, so ENTRY-and-STOP reads differently from
   * FILL-and-REST at a glance.
   *
   * An unlit stage is labelled NOT RECORDED and never coloured as a pass —
   * several owners can only speak when the book gave them something to judge,
   * so "nothing here" and "clean here" are not the same claim and this strip
   * makes only the first.
   */
  const strip = selectPracticeEasementStages(ledger);

  const stageStrip = strip ? (
    <div data-testid="practice-easement-strip" data-recorded={strip.recordedCount}>
      <div style={{ display: "flex", gap: 3 }}>
        {strip.stages.map((stage) => (
          <div
            key={stage.id}
            data-testid="practice-easement-stage"
            data-stage={stage.id}
            data-recorded={stage.recorded ? "true" : "false"}
            title={stage.heading ?? `${stage.word} — no easement recorded`}
            style={{ flex: "1 1 0", minWidth: 0 }}
          >
            <div
              style={{
                height: 4,
                borderRadius: 1,
                background: stage.recorded ? WM.gold.mark : "transparent",
                boxShadow: stage.recorded ? "none" : `inset 0 0 0 1px ${WM.border.line}`,
              }}
            />
            <div
              style={{
                marginTop: 3,
                fontSize: 9,
                letterSpacing: 0.4,
                /* TINY law: 9px is the floor this codebase allows for a label
                   of two-to-six characters, and the strip never carries prose. */
                color: stage.recorded ? WM.text.body : WM.text.muted,
                fontWeight: stage.recorded ? 700 : 400,
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {stage.word}
            </div>
          </div>
        ))}
      </div>
      <p
        data-testid="practice-easement-strip-caption"
        style={{
          margin: `${WM.space.xs}px 0 0`,
          fontSize: 9,
          lineHeight: 1.5,
          color: WM.text.muted,
        }}
      >
        {strip.recordedCount} of {strip.stageCount} stages of the trade&apos;s life recorded an
        easement. The rest recorded none — which is not the same as WM having
        checked them and found them realistic.
      </p>
    </div>
  ) : null;

  const body = (
    <>
      {stageStrip}
      {ledger.easements.map((e) => (
        <section
          key={e.id}
          data-easement={e.id}
          style={{
            borderLeft: `1px solid ${WM.border.line}`,
            paddingLeft: WM.space.md,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: WM.gold.mark,
            }}
          >
            {e.heading}
          </p>
          {e.sentences.slice(0, sentenceCap).map((s) => (
            <p
              key={s}
              style={{
                margin: `${WM.space.xs}px 0 0`,
                fontSize: 11,
                lineHeight: 1.55,
                color: WM.text.body,
              }}
            >
              {s}
            </p>
          ))}
          {e.sentences.length > sentenceCap && (
            <p
              data-practice-honesty-sentences-withheld={e.sentences.length - sentenceCap}
              style={{
                margin: `${WM.space.xs}px 0 0`,
                fontSize: 9,
                lineHeight: 1.55,
                color: WM.text.muted,
                fontStyle: "italic",
              }}
            >
              +{e.sentences.length - sentenceCap} more on this easement
            </p>
          )}
        </section>
      ))}
      {/* WHY NO DOLLAR FIGURE APPEARS ON THE POSITION LINES.
          This room reads the SAVED book, whose `marketPx` is the price each
          position was filled at rather than a quote, and it has no price feed
          of its own. The compiler drops that field so no owner can print an
          entry price as a current value; this sentence is the other half of
          that refusal, because a number that silently vanishes is its own
          kind of lie. The string has a single author in `paperPositionMark`. */}
      {ledger.markCaveat != null && (
        <p
          data-testid="practice-honesty-mark-caveat"
          style={{
            margin: 0,
            fontSize: 10,
            lineHeight: 1.55,
            color: WM.text.muted,
          }}
        >
          {ledger.markCaveat}
        </p>
      )}
    </>
  );

  if (disclosed) {
    return (
      <div
        data-testid="practice-honesty-layer"
        data-practice-honesty-disclosed="1"
        style={{ display: "grid", gap: WM.space.md }}
      >
        {body}
      </div>
    );
  }

  return (
    <details data-testid="practice-honesty-layer" style={{ marginTop: WM.space.sm }}>
      <summary
        style={{
          // 44px is the tap-target floor this codebase already enforces on
          // every other summary control in the room.
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: WM.gold.mark,
          padding: "4px 0",
        }}
      >
        Practice honesty · {ledger.caption}
      </summary>
      <div style={{ marginTop: WM.space.sm, display: "grid", gap: WM.space.md }}>
        {body}
      </div>
    </details>
  );
}


export default PracticeHonestyLayer;
