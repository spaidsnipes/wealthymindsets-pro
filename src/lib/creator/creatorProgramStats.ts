/**
 * creatorProgramStats — what the creator program can HONESTLY say about itself
 * before it has launched.
 *
 * ── THE DEFECT ────────────────────────────────────────────────────────
 * /creator carried a four-tile strip under the comment
 * `/* ── Stats for social proof ───── *​/`:
 *
 *   Verified Creators   —
 *   Verified Payouts    —
 *   Verified Average    —
 *   Verified Countries  —
 *
 * It sits between two scrupulously honest sentences — the hero says
 * "Referral tracking, enrollment, billing, and payouts are not connected yet",
 * and the chip below says referral links "appear only after a real tracking
 * service is connected". The PROSE on this page is careful. The STATS STRIP
 * was not.
 *
 * ── WHY THIS IS WORSE THAN THE CHART-HEADER DASH ──────────────────────
 * On the chart header the LABEL was neutral — "change" asks a question and the
 * dash declined to answer it. Here THE LABEL IS ITSELF THE CLAIM. "Verified"
 * asserts that a verification happened. A dash beside it does not retract that
 * assertion; it implies a verified figure exists and is merely not shown.
 *
 * And the strip is explicitly labelled social proof — its whole purpose is to
 * persuade. A dash used as social proof is the purest form of this defect: it
 * is doing persuasive work with no fact underneath it.
 *
 * ── A DASH CAN OVERCLAIM *AND* UNDERCLAIM, AND THIS STRIP DID BOTH ────
 * The four tiles looked identical. They are four DIFFERENT epistemic states,
 * and one glyph was flattening all of them:
 *
 *   Creators   the roster is empty, so the true value is 0. 0 is a CHECKABLE
 *              claim a reader can hold us to; a dash hides a fact we have.
 *              Here the dash UNDERCLAIMED.
 *   Payouts    same — nothing has been paid, and $0 is true and checkable.
 *   Average    the mean of an empty set is NOT ZERO, it is UNDEFINED. Printing
 *              0 here would be a fabricated statistic. Here the dash was
 *              closer to right, but for a reason it never stated.
 *   Countries  the roster schema has NO COUNTRY FIELD. This is not zero and
 *              not undefined — it is NOT MEASURABLE. The tile asks a question
 *              the data cannot answer at all.
 *
 * "Absence is not zero" (H1) is the law this codebase already had. Its mirror
 * is equally true and was the part nobody had written down: WHERE THE COUNT IS
 * GENUINELY ZERO, A DASH IS ALSO A LIE — of omission rather than invention.
 *
 * PURE — no clock, no I/O, no React.
 */

/** A creator roster row. `country` is deliberately absent — see COUNTRIES below. */
export interface CreatorRosterRow {
  rank: number;
  handle: string;
  tier: string;
  earnings: string;
  subs: number;
  avatar: string;
}

export type StatKind =
  /** Counted, and the count is real — including when it is zero. */
  | "MEASURED"
  /** The operation is undefined on this data, not zero. */
  | "UNDEFINED"
  /** No field exists that could answer this. Not zero, not undefined. */
  | "NOT_TRACKED";

export interface CreatorStat {
  label: string;
  /** What the tile shows. Never a bare glyph. */
  value: string;
  kind: StatKind;
  /** WHY it reads the way it does. Carried on BOTH title and aria-label. */
  reason: string;
}

/**
 * The label must not assert more than the value can support. "Verified
 * Creators" beside a dash claims a verification exists; "Creators enrolled"
 * beside 0 claims only what is true and is checkable by anyone.
 */
export function creatorProgramStats(roster: readonly CreatorRosterRow[]): CreatorStat[] {
  const n = roster.length;

  const payoutsTotal = roster.reduce((sum, r) => {
    const parsed = Number(String(r.earnings).replace(/[^0-9.-]/g, ""));
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);

  return [
    {
      label: "Creators enrolled",
      value: String(n),
      kind: "MEASURED",
      reason:
        n === 0
          ? "Zero, and that is a measured fact — enrollment has not opened. This is not a missing number."
          : `${n} enrolled to date.`,
    },
    {
      label: "Payouts to date",
      value: `$${payoutsTotal.toLocaleString("en-US")}`,
      kind: "MEASURED",
      reason:
        payoutsTotal === 0
          ? "Zero, and that is a measured fact — billing and payouts are not connected yet."
          : "Sum of recorded payouts to date.",
    },
    {
      label: "Average payout",
      // The mean of an empty set is undefined. Printing 0 would be a
      // fabricated statistic — the exact error H1 exists to prevent.
      value: n === 0 ? "No basis" : `$${(payoutsTotal / n).toLocaleString("en-US")}`,
      kind: n === 0 ? "UNDEFINED" : "MEASURED",
      reason:
        n === 0
          ? "An average needs at least one payout to exist. With none, this is undefined — it is NOT zero, and WM will not print a zero it cannot defend."
          : "Mean payout across enrolled creators.",
    },
    {
      label: "Countries",
      // Distinct from both of the above: nothing in the roster records a
      // country, so this cannot be computed honestly at any roster size.
      value: "Not tracked",
      kind: "NOT_TRACKED",
      reason:
        "WM does not record creator country. This is not zero and not merely unknown — no field exists that could answer it, so no number will be shown.",
    },
  ];
}
