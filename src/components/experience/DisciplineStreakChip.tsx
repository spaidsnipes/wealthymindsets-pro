/**
 * A DISCIPLINE STREAK, STATED — and never congratulated.
 *
 * Two routes drew this number and both drew it in green: /morning-prep put the
 * clean-day count in `#88F5D3` on a teal wash, and /journal put both the DAYS
 * and FOCUS chips in `wm-green`. §9 says "No green shield. No green means
 * safe," and this is the worst place in the product to say it, because the
 * subject is not the market — it is the trader.
 *
 * ── WHY GREEN IS A LIE HERE SPECIFICALLY ─────────────────────────────────────
 *
 * A clean streak is not a safe trade. `selectRuleAdherenceStreak` counts
 * consecutive days with no BROKE_RULES entry, and its own docblock records that
 * a day with NO ENTRIES AT ALL counts as clean — canon, "a no-trade day can
 * still be successful." So the longest streak in the book can be a fortnight of
 * not trading. Painting that green tells a trader they are doing well, on
 * evidence that is equally consistent with their having done nothing, at the
 * exact moment before the bell when they are deciding whether to size up.
 *
 * The same argument that took the green off the Decision Receipt applies with
 * less ambiguity, not more: there, green said a profitable trade was a good
 * one; here it says an uneventful fortnight was a disciplined one.
 *
 * A streak count is a FINDING. It takes ivory, like every other thing the house
 * observed and is willing to state. The figure carries the reading; a colour
 * would be the house adding a verdict the figure does not contain.
 *
 * ── ONE OWNER FOR "IS THERE A STREAK" ────────────────────────────────────────
 *
 * The routes also disagreed about when the number exists at all. /journal went
 * silent below 2 clean days and below 3 focused trades; /morning-prep showed
 * both from 1. The same book, read the same morning, said "you have a streak"
 * on one screen and nothing on the other — and silence in this house means "we
 * looked and there is nothing", so one of the two was lying about a finding.
 *
 * `streakIsWorthShowing` is now the only answer to that question and both
 * routes ask it. TWO is the floor: a streak of one is a day, and calling a day
 * a streak is the same manufactured encouragement §14 exists to forbid.
 *
 * ── WHY THIS IS A COMPONENT AND NOT A WIDENED SENTINEL ───────────────────────
 *
 * `noGreenInTheRoom` is scoped to `src/components/experience/` and could not
 * see either route. The obvious repair — point it at `src/app/` — is the one
 * `selectPrepChecklistBand.enforcement.test.ts` already records as a mistake: a
 * proximity or whole-file colour guard aimed at a route false-fires on
 * unrelated elements, and "a guard that makes a route rename its own palette to
 * satisfy a rule about the prep count has started distorting the thing it
 * protects." /journal legitimately carries green elsewhere.
 *
 * So the chip MOVES into the room instead, the way `PrepChecklistBand` did.
 * Here a whole-file palette sweep is sound because the whole file is the chip,
 * and the Sentinel next door now covers it for free — permanently, and without
 * anyone having to remember.
 */

import * as React from "react";

/** FINDING. The count is something the house observed, so it is stated in ivory. */
const FIGURE = "#ede6d3";
/** The label, and the quieter "best" figure — parchment, one step back. */
const LABEL = "#c2b892";
/** ABSENCE / supporting text. */
const MUTED = "#8a8271";

/**
 * The floor, owned here so two surfaces cannot pick different ones.
 *
 * A streak of one is not a streak. Rendering it would put a badge on a trader's
 * first ordinary morning, which is precisely the "fabricated pride" the
 * original /morning-prep docblock says it exists to avoid — it just picked a
 * threshold that did not honour its own sentence.
 */
export const STREAK_FLOOR = 2;

export function streakIsWorthShowing(current: number): boolean {
  return Number.isFinite(current) && current >= STREAK_FLOOR;
}

export type DisciplineStreakKind = "CLEAN_DAYS" | "FOCUS";

const KIND: Record<DisciplineStreakKind, { readonly label: string; readonly unit: string }> = {
  /**
   * Deliberately NOT "clean". The selector counts days with no BROKE_RULES
   * entry, and a day with no entries at all qualifies — "clean" would be the
   * house characterising an absence of evidence as a good result.
   */
  CLEAN_DAYS: { label: "Days without a broken rule", unit: "days" },
  FOCUS: { label: "Trades that followed their plan", unit: "trades" },
};

export interface DisciplineStreakChipProps {
  readonly kind: DisciplineStreakKind;
  readonly current: number;
  readonly best: number;
  /**
   * How many days the streak was measured OVER. Optional because only /journal
   * has it — but when it is present it is shown, because a streak of 4 out of 5
   * days measured and a streak of 4 out of 200 are different facts.
   */
  readonly measured?: number;
  readonly testId: string;
}

export function DisciplineStreakChip({
  kind,
  current,
  best,
  measured,
  testId,
}: DisciplineStreakChipProps): React.ReactElement | null {
  // §14. No streak, no chip. Not a zero, and not a greyed-out badge saying the
  // streak is zero — a trader with nothing to show is not shown a place where
  // something would go.
  if (!streakIsWorthShowing(current)) return null;

  const { label, unit } = KIND[kind];
  const words =
    `${current} consecutive ${unit} — best ${best}` +
    (measured != null ? `, over ${measured} days measured` : "") +
    `. A count of what happened, not a grade.`;

  return (
    <span
      data-testid={testId}
      data-kind={kind}
      data-current={current}
      data-best={best}
      title={words}
      className="inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
      style={{
        // One hairline and a wash of the same ivory. No hue channel is spent,
        // so nothing here can be read as approval.
        background: "rgba(237,230,211,0.06)",
        border: "1px solid rgba(237,230,211,0.16)",
      }}
    >
      <span style={{ color: LABEL, letterSpacing: "0.10em" }}>
        {kind === "CLEAN_DAYS" ? "DAYS" : "FOCUS"}
      </span>
      <span style={{ color: FIGURE, fontWeight: 700 }} data-testid={`${testId}-figure`}>
        {current}
      </span>
      {/* The best is shown only when it is actually better. Repeating the same
          number twice invites a reader to compare a figure with itself. */}
      {best > current && (
        <span style={{ color: MUTED }} data-testid={`${testId}-best`}>
          best {best}
        </span>
      )}
      <span className="sr-only">{label}. {words}</span>
    </span>
  );
}

export default DisciplineStreakChip;
