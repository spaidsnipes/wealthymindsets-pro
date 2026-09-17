import type { BarOverBarChange } from "./deriveLastBarClose";
import { CHANGE_UNAVAILABLE_TEXT, CHANGE_UNAVAILABLE_TITLE } from "./changeAbsence";

/**
 * chartHeaderChangeFact — what the /charts header is entitled to print where
 * the CHANGE goes. The exact sibling of `chartHeaderPriceFact`, and written
 * second on purpose: that module repaired the price slot and left this one
 * saying nothing, in the same row, on the same evidence.
 *
 * ── THE DEFECT, MEASURED LIVE ─────────────────────────────────────────
 * /charts, TSLA 15m, 2026-09-17T02:53Z. Both header rows, in one DOM read:
 *
 *     358.13 LAST 15m BAR CLOSE  —  (change unavailable)
 *
 * with `title` = "Change unavailable — no verified reference close from the
 * current quote provider."
 *
 * Every word of that sentence is true, and it is true about a scope the reader
 * is not told is a scope. THE CURRENT QUOTE PROVIDER has no reference close.
 * The CHART does — roughly 400 verified candles were loaded in the same
 * component at that instant, and `chartHeaderPriceFact` had already read them
 * to produce the number three words to the left. The change cell looked in one
 * place, found nothing, and reported the absence as total.
 *
 * ── THE RULE THAT MAKES THE REPAIR SAFE ───────────────────────────────
 * A BAR-OVER-BAR DELTA MAY NEVER WEAR A SESSION CHANGE'S CLOTHES.
 *
 * This is the same rule `chartHeaderPriceFact` states for the price slot, and
 * here it bites harder. A trader reads a signed number beside a price as
 * "today". A 15-minute bar-over-bar delta rendered in that slot unlabelled
 * would not merely be imprecise — it would be a different quantity, often an
 * order of magnitude smaller, presented as the one they asked for. Silence is
 * better than that, which is why the dash was defensible and why replacing it
 * requires the label, not just the number.
 *
 * So, exactly as in the price slot:
 *   - the provenance travels WITH the number ("vs prior 15m bar"), so the
 *     figure is never alone in the row;
 *   - it is a distinct `kind`, so colour and weight are chosen from declared
 *     provenance rather than from "is the number present";
 *   - `measured` stays true, because it IS a measurement — of a different
 *     question than the session-change slot asks.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ────────────────────────────────
 *   - Not a session change, and not an approximation of one. No relationship
 *     between the two is asserted or implied.
 *   - Not a direction for the day. A green bar-over-bar tick inside a red
 *     session is ordinary, and this cell says nothing about the session.
 *   - Not freshness. The bar is stamped with its timeframe so the reader can
 *     price its age; this module owns no clock and makes no claim about now.
 *   - When neither channel has anything, the cell keeps the existing sentence
 *     VERBATIM from `changeAbsence` rather than composing a new one — a second
 *     wording of one absence is the vacuous-agreement shape that module was
 *     written to prevent.
 *
 * PURE — no clock, no I/O, no React.
 */

/** The provenance of the number in the header's change slot. */
export type HeaderChangeKind = "SESSION_CHANGE" | "BAR_OVER_BAR" | "NONE";

export interface HeaderChangeFact {
  readonly text: string;
  /** True when this cell is showing an actual reading of something. */
  readonly measured: boolean;
  /** The ONLY thing colour and weight may be derived from. */
  readonly kind: HeaderChangeKind;
  /** Signed direction, or 0. Null when nothing was measured. */
  readonly direction: 1 | 0 | -1 | null;
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * A NONZERO MOVE MAY NEVER PRINT AS ZERO.
 *
 * Two decimals is right for a $358 equity and wrong for a sub-$1 instrument:
 * MainChart's own price row already carries `dp = base < 10 ? 4 : 2` for
 * exactly this reason. Formatting a real 0.0004 move as "+0.00" would state a
 * flat bar that did not happen — a fabricated observation, produced by the
 * formatter rather than the data, which is the hardest kind to notice.
 *
 * So precision is widened until the rendered digits distinguish the value from
 * zero, capped at 8 (past which the number is noise, and the cap can only ever
 * be reached by a move too small to render honestly at any width).
 * An EXACTLY zero change is left at two decimals — it is genuinely flat, and
 * "+0.00000000" would read as a precision claim nobody made.
 */
function signed(n: number, minDecimals = 2): string {
  let dp = Math.max(2, Math.min(8, Math.trunc(minDecimals) || 2));
  while (dp < 8 && n !== 0 && Math.abs(Number(n.toFixed(dp))) === 0) dp += 1;
  return `${n >= 0 ? "+" : ""}${n.toFixed(dp)}`;
}

function dirOf(n: number): 1 | 0 | -1 {
  // Three-state, never calling an exactly-zero change "up". This is the same
  // rule the chrome header applied inline before this module existed, moved
  // here so both render sites read one copy of it.
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * @param sessionChange The provider's session change, when it was OBSERVED.
 *   Pass null whenever the existing guard would have suppressed — this module
 *   does not re-derive that decision, it only says what to render once it is
 *   made. One owner for "is there a session change", as before.
 * @param barOverBar What the loaded candles can prove on their own.
 * @param minDecimals The caller's own price precision (MainChart's price row
 *   carries `dp = base < 10 ? 4 : 2`). Passed in rather than inferred because
 *   this module sees a delta, not an instrument, and cannot tell a 0.05 move on
 *   a $0.30 coin from a 0.05 move on a $358 equity. Only ever WIDENS: the
 *   never-print-a-real-move-as-zero rule below still applies on top of it.
 */
export function chartHeaderChangeFact(
  sessionChange: { readonly chg: number; readonly pct: number } | null | undefined,
  barOverBar: BarOverBarChange | null | undefined,
  minDecimals = 2,
): HeaderChangeFact {
  if (
    sessionChange &&
    finite(sessionChange.chg) &&
    finite(sessionChange.pct)
  ) {
    return {
      text: `${signed(sessionChange.chg, minDecimals)} (${signed(sessionChange.pct)}%)`,
      measured: true,
      kind: "SESSION_CHANGE",
      direction: dirOf(sessionChange.pct),
      reason:
        "Session change as reported against a verified reference close from the current quote provider.",
    };
  }

  if (
    barOverBar &&
    finite(barOverBar.chg) &&
    finite(barOverBar.pct) &&
    typeof barOverBar.timeframe === "string" &&
    barOverBar.timeframe.trim() !== ""
  ) {
    const tf = barOverBar.timeframe.trim();
    return {
      // The scope travels WITH the number. Without "vs prior <tf> bar" this is
      // a fabricated session change, which is strictly worse than the dash.
      text: `${signed(barOverBar.chg, minDecimals)} (${signed(barOverBar.pct)}%) vs prior ${tf} bar`,
      measured: true,
      kind: "BAR_OVER_BAR",
      direction: dirOf(barOverBar.pct),
      reason:
        `${CHANGE_UNAVAILABLE_TITLE} What WM does have is two bars that have PROVABLY CLOSED on this chart: the last ${tf} candle closed at ` +
        `${barOverBar.close.toFixed(2)}, the one before it at ${barOverBar.referenceClose.toFixed(2)}. ` +
        `This cell reports the move BETWEEN THOSE TWO BARS and nothing else. ` +
        `IT IS NOT THE SESSION CHANGE — a session change is measured against the prior session's close, which WM cannot name here without a market calendar it does not have. ` +
        `WM will not render a bar-over-bar delta in a session change's clothes, so the scope is printed beside the number rather than left to be assumed.`,
    };
  }

  return {
    text: CHANGE_UNAVAILABLE_TEXT,
    measured: false,
    kind: "NONE",
    direction: null,
    reason:
      `${CHANGE_UNAVAILABLE_TITLE} WM also cannot derive a bar-over-bar move: that needs TWO candles that have each provably finished their interval, and this chart does not currently have them — either too few bars are loaded, or only one of them has closed. ` +
      "This is an absence of both channels, not a change of zero and not a refusal to say.",
  };
}
