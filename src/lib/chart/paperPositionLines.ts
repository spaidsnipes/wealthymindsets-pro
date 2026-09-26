/**
 * PAPER POSITION LINES — what /charts may draw for the trader's open PAPER
 * positions on the symbol on the glass, and the words on each line.
 * Garden 16 §17: "A chart can look right and still be financially wrong."
 *
 * Found in source (2026-09-26, MainChart paper-position effect, audit at
 * 3ff5cd7) — four defects on one line:
 *
 *   1. MONEY AT 1x. The label was `(lp - avgPx) * qty`. One ES1! contract up
 *      10 points read "LONG 1 · +$10"; it is worth $500. /paper itself had
 *      been multiplied for weeks — the chart was the door left open.
 *   2. NO WORD PAPER. The Webull line on the same glass says "WEBULL COST ×N";
 *      the paper line said only "LONG 1 · +$10", so simulated money sat next
 *      to broker truth with nothing telling them apart.
 *   3. ITS OWN PARSER. It read `JSON.parse(localStorage.wm_paper_state)
 *      .positions` raw, so a book /paper puts behind RECOVERY REQUIRED (a
 *      record it could not read) still drew whatever positions parsed —
 *      including ones /paper refuses to show or total.
 *   4. ITS OWN SYMBOL RULE. A private strip of USD/USDT/USDC/PERP drew the
 *      book's USD "BTC" on a BTCUSDT chart (marked at the USDT market's
 *      price) and never matched "/ES" to the book's "ES1!".
 *
 * Each fact now has its one owner: the book is read through `PaperSnapshot`
 * (parsePaperSnapshot / loadPaperSnapshot) and its recovery barrier, the
 * point value through `contractMultiplier`, the symbol match through
 * `sameInstrument`, and money words through `formatUsd`.
 *
 * PURE. The component draws what this returns and nothing else.
 */

import {
  contractMultiplier,
  isPaperBookRecoveryRequired,
  type PaperSnapshot,
} from "@/lib/paperTrade";
import { sameInstrument } from "@/lib/marketData/symbolAssetClass";
import { formatUsd } from "@/lib/marketData/contractEconomics";

export interface PaperPositionLine {
  /** The book's own symbol for the position (e.g. "ES1!"). */
  readonly symbol: string;
  /** Signed: + long, − short. */
  readonly qty: number;
  readonly avgPx: number;
  /** Dollars per full point for ONE unit, from `contractMultiplier`. */
  readonly pointValue: number;
}

export type PaperPositionLinePlan =
  | { readonly status: "DRAWN"; readonly lines: readonly PaperPositionLine[]; readonly receipt: string }
  | { readonly status: "NONE"; readonly lines: readonly []; readonly receipt: "NONE" }
  | {
      readonly status: "RECOVERY_REQUIRED";
      readonly lines: readonly [];
      /** Said on the glass while the Positions layer is on. */
      readonly words: string;
      readonly receipt: "RECOVERY_REQUIRED";
    };

/**
 * /paper's own barrier words ("BOOK RECOVERY REQUIRED"), prefixed PAPER so
 * they cannot be read as the broker's book, plus what the chart did about it.
 */
export const PAPER_BOOK_RECOVERY_WORDS =
  "PAPER BOOK RECOVERY REQUIRED · paper positions are not drawn until the book is recovered on Paper";

export function selectPaperPositionLines(snapshot: PaperSnapshot, chartSymbol: string): PaperPositionLinePlan {
  if (isPaperBookRecoveryRequired(snapshot.integrity)) {
    return { status: "RECOVERY_REQUIRED", lines: [], words: PAPER_BOOK_RECOVERY_WORDS, receipt: "RECOVERY_REQUIRED" };
  }
  const lines: PaperPositionLine[] = snapshot.state.positions
    .filter(p => p.qty !== 0 && sameInstrument(p.symbol, chartSymbol))
    .map(p => ({ symbol: p.symbol, qty: p.qty, avgPx: p.avgPx, pointValue: contractMultiplier(p.symbol) }));
  if (lines.length === 0) return { status: "NONE", lines: [], receipt: "NONE" };
  return {
    status: "DRAWN",
    lines,
    receipt: `DRAWN:${lines.map(l => `${l.symbol}x${l.qty}@${l.avgPx}:pv=${l.pointValue}`).join(",")}`,
  };
}

/**
 * The words on one paper line. `up` is null when there is no price to mark
 * against — a missing price is not a loss of the whole entry value, which is
 * what `(0 - avgPx) * qty` used to print.
 */
export function paperPositionLineTitle(
  line: Pick<PaperPositionLine, "qty" | "avgPx" | "pointValue">,
  lastPx: number,
): { readonly up: boolean | null; readonly text: string } {
  const side = line.qty > 0 ? "LONG" : "SHORT";
  const head = `PAPER ${side} ${Math.abs(line.qty)}`;
  if (!(Number.isFinite(lastPx) && lastPx > 0)) return { up: null, text: `${head} · P&L UNKNOWN (no price)` };
  const pnl = (lastPx - line.avgPx) * line.qty * line.pointValue;
  const up = pnl >= 0;
  return { up, text: `${head} · ${up ? "+" : "-"}${formatUsd(Math.abs(pnl))}` };
}
