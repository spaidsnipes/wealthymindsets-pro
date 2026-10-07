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

/** One Webull holding as the broker positions route receipts it. */
export interface BrokerCostLine {
  readonly instrumentType: "STOCK" | "OPTION" | "OTHER";
  readonly quantity: number;
  readonly costPrice: number;
  readonly option?: { readonly type: "CALL" | "PUT"; readonly strike: number; readonly expireDate: string };
}

/**
 * The words on one broker cost line. An option paints at its STRIKE, so the
 * premium is confessed in the words; a stock paints at its cost.
 */
export function brokerCostLineTitle(p: BrokerCostLine): string {
  return p.instrumentType === "OPTION" && p.option
    ? `WEBULL ${p.option.strike}${p.option.type === "CALL" ? "C" : "P"} ${p.option.expireDate.slice(5)} ×${p.quantity} · prem ${p.costPrice}`
    : `WEBULL COST ×${p.quantity}`;
}

/**
 * PRICE-LINE WORDS LIVE ON THE WM GLASS, NOT IN THE AXIS GUTTER (found on the
 * glass 2026-09-26, Garden 16 §17). lightweight-charts right-aligns a price
 * line's `title` against the price axis — exactly where the WM overlay paints
 * the profile body, the live-price bar and the WAIT tag. "PAPER" read; the
 * money half ("LONG 10 · +$21.10") sat under the WAIT tag, and "WEBULL COST
 * ×3" under the profile. The native line keeps its stroke and its axis price;
 * its words are placed by the overlay's keep-out owner, never on a candle,
 * never on a chip, never on the profile body — and a word with no clear spot
 * is WITHHELD with a receipt, not overprinted.
 */
export interface PriceLineWords {
  /** ORDER = a chart order line (chartOrderLines.ts), Garden 19 §23. */
  readonly kind: "PAPER" | "BROKER" | "ORDER";
  readonly price: number;
  readonly text: string;
  readonly ink: string;
}

/** The native line's own title: always empty — the words are the overlay's. */
export const PRICE_LINE_NATIVE_TITLE = "";

/**
 * The right end the words may reach on their row: left of the profile family
 * (its stack edge, or the Living body when it reaches further into the plot),
 * never past the plot's right edge. Pure, so the rule is testable.
 */
export function priceLineWordsRightEdge(g: {
  readonly plotRight: number;
  readonly profileStackLeft?: number | null;
  readonly livingBodyLeft?: number | null;
  readonly gap?: number;
}): number {
  const gap = g.gap ?? 8;
  const edges = [g.plotRight, g.profileStackLeft, g.livingBodyLeft].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  return Math.min(...edges) - gap;
}

/** The frame's receipt for one word: `PAPER@370:CLEAR`, `BROKER@366.5:WITHHELD`. */
export function priceLineWordsReceipt(
  placed: readonly { readonly kind: PriceLineWords["kind"]; readonly price: number; readonly mode: string }[],
): string {
  return placed.length ? placed.map(p => `${p.kind}@${p.price}:${p.mode}`).join(",") : "NONE";
}
