/**
 * WHAT A STAGED STOP / TARGET LINE SAYS BESIDE ITS PRICE — Founder P0 2026-10-10:
 * "show distance in ticks/pips/points and money from the ticket's own numbers
 * (the chart computes no money)" and "invalid placement says the real reason
 * … from the ticket's own validation — never a UI collision disguised as a
 * restriction".
 *
 * The TICKET calls this with its own entry, tick, side and its own wrong-side
 * verdicts, and publishes the answer on the line; the chart only prints it.
 * Distance: futures in points and ticks; stocks and crypto in price units (no
 * currency sign — the money is the separate total) and percent. A line on the wrong side of the entry carries the ticket's reason
 * and NO money — a dollar figure beside a stop the ticket would refuse reads as
 * a risk the trader has, which is not true. PURE.
 */

export type DraftLineFamily = "FUTURE" | "STOCK" | "CRYPTO";

/** The ticket's own refusal, in the words its risk line uses (ticketLayout.compactRiskLine / reviewGate). */
export const STOP_WRONG_SIDE_REASON = "stop is on the wrong side of the entry — the ticket refuses it";
export const TARGET_WRONG_SIDE_REASON = "target is on the wrong side of the entry — no reward at this price";

export interface DraftLineFactsInput {
  readonly role: "STOP" | "TARGET";
  readonly family: DraftLineFamily;
  /** The ticket's reference entry (limit / trigger); null = the fill is unknown. */
  readonly entry: number | null;
  readonly price: number;
  /** The contract's tick on file; null = not known (no tick count is claimed). */
  readonly tick: number | null;
  /** The ticket's display decimals. */
  readonly dp: number;
  /** The ticket's own verdict for this line (stopWrongSide / targetWrongSide). */
  readonly wrongSide: boolean;
}
export interface DraftLineFacts {
  /** "−34.50 pts · 138 ticks" / "+$0.45 · +0.12%"; null when the entry is unknown or the line is invalid. */
  readonly distance: string | null;
  /** The ticket's reason this placement is refused / pointless; null when it stands. */
  readonly invalid: string | null;
}

const signed = (n: number, s: string) => `${n < 0 ? "−" : "+"}${s}`;

export function draftLineFacts(x: DraftLineFactsInput): DraftLineFacts {
  if (x.wrongSide) return { distance: null, invalid: x.role === "STOP" ? STOP_WRONG_SIDE_REASON : TARGET_WRONG_SIDE_REASON };
  if (x.entry == null || !Number.isFinite(x.entry) || !Number.isFinite(x.price) || x.entry <= 0) return { distance: null, invalid: null };
  const d = x.price - x.entry;
  const abs = Math.abs(d);
  const dp = Math.max(0, Math.min(8, x.dp));
  if (x.family === "FUTURE") {
    const ticks = x.tick != null && x.tick > 0 ? Math.round(abs / x.tick) : null;
    const t = ticks != null ? ` · ${ticks} tick${ticks === 1 ? "" : "s"}` : "";
    return { distance: `${signed(d, abs.toFixed(dp))} pts${t}`, invalid: null };
  }
  const pct = (abs / x.entry) * 100;
  // Price units, no "$": the money after it is the ticket's total for the size, and a per-share "$1.30"
  // beside a total "$1.30" read as one number said twice (serving a60366c, SPY ×1).
  return { distance: `${signed(d, abs.toFixed(dp))} · ${signed(d, `${pct.toFixed(2)}%`)}`, invalid: null };
}
