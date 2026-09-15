/**
 * tradeRowDirection — the LONG/SHORT badge on the /profile recent-trades table.
 *
 * ── THE DEFECT: A DEFAULT IS A CLAIM ─────────────────────────────────────
 *
 * /profile built each row with
 *
 *     dir: t.direction ?? "LONG",              // journal rows
 *     dir: (t.side ?? "LONG").toUpperCase(),   // paper rows
 *
 * A record that does not say which way the trader went was rendered as a
 * trade that went LONG. Nothing in the data supports that. `??` reads like a
 * formatting nicety and is in fact A FABRICATED ASSERTION ABOUT WHAT THE
 * TRADER DID — the same shape as the `avgLoss = losses > 0 ? … : 1` sentinel
 * on this very page (fixed in ff348dd), where a stand-in for a missing value
 * was silently promoted into a printed fact.
 *
 * ── AND THE RENDER MADE IT LOUD ──────────────────────────────────────────
 *
 * The badge is painted
 *
 *     t.dir === "LONG" ? "bg-wm-green/15 text-wm-green" : "bg-wm-red/15 …"
 *
 * so the invented LONG also arrived in the WIN colour. Two claims from one
 * absent field.
 *
 * That ternary is ALSO why the naive repair fails. It is BINARY over a fact
 * with THREE states, so merely passing the unknown through would not produce
 * "no claim" — it would fall to the else branch and render a RED badge, which
 * asserts SHORT. Deleting the fabrication without fixing the render just swaps
 * which lie is told. The tone must therefore be decided HERE, beside the text.
 *
 * ── WHAT COUNTS AS KNOWN ─────────────────────────────────────────────────
 *
 * Only a value that actually names a direction. Journal writes "LONG"/"SHORT";
 * the paper book writes "buy"/"sell" in `side`. Both vocabularies are accepted
 * because both are real writers of this table, and nothing else is guessed:
 * an empty string, whitespace, a number, null, or any unrecognised word is
 * UNKNOWN. Failing closed is the whole point — a direction we cannot read is
 * not a direction we may print.
 *
 * PURE — no clock, no I/O, no React.
 */

export type TradeDirection = "LONG" | "SHORT" | "UNKNOWN";

/**
 * Pure. Never throws, never guesses.
 *
 * NOTE the deliberate absence of a default branch that picks a side. The
 * function's whole job is to be willing to return UNKNOWN.
 */
export function classifyTradeDirection(raw: unknown): TradeDirection {
  if (typeof raw !== "string") return "UNKNOWN";
  const v = raw.trim().toUpperCase();
  if (v === "LONG" || v === "BUY") return "LONG";
  if (v === "SHORT" || v === "SELL") return "SHORT";
  return "UNKNOWN";
}

export interface TradeDirectionBadge {
  /** What the badge says. Never a bare glyph. */
  readonly text: string;
  /**
   * The COLOUR IS A SEPARATE CLAIM from the text — the lesson of the /paper
   * account strip. A direction WM cannot read earns no directional colour.
   */
  readonly tone: "LONG" | "SHORT" | "UNKNOWN";
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
}

export function tradeDirectionBadge(direction: TradeDirection): TradeDirectionBadge {
  if (direction === "LONG") {
    return {
      text: "LONG",
      tone: "LONG",
      reason: "This trade was recorded as a long position — the record says so explicitly.",
    };
  }
  if (direction === "SHORT") {
    return {
      text: "SHORT",
      tone: "SHORT",
      reason: "This trade was recorded as a short position — the record says so explicitly.",
    };
  }
  return {
    // Said in a word. "—" here would be indistinguishable from the missing
    // entry and exit prices in the same row, which are different absences.
    text: "UNKNOWN",
    tone: "UNKNOWN",
    reason:
      "This stored trade does not record which way it was taken, so WM cannot say whether it was long or short. It is NOT assumed to be long. The P&L beside it is still whatever was recorded; only the direction is missing.",
  };
}
