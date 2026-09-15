/**
 * paperPositionsExport — the saved paper book, as a file that tells the truth.
 *
 * WHY THIS EXISTS
 * ---------------
 * `/profile` built its CSV inline, in the page, from the persisted book:
 *
 *     ["Symbol","Side","Qty","AvgPx","MarketPx","UnrealizedPnL"]
 *     ...positions.map(p => [p.symbol, ..., p.avgPx, p.marketPx, p.unrealPnl])
 *
 * Both of the last two columns were untrue, and each for a reason this codebase
 * has already written down once:
 *
 * 1. `MarketPx` was the FILL price. `paperTrade.applyFill` has five persisted
 *    writers and every one says `marketPx: fillPx`. The saved field is the price
 *    the position was last filled at. Calling that column "MarketPx" asserts a
 *    current market value that was never observed. This is the same defect
 *    `paperPositionMark` was written to kill — `?? pos.avgPx`, "when there is no
 *    price, mark at entry" — in its third surface.
 *
 * 2. `UnrealizedPnL` was ALWAYS EXACTLY ZERO. `unrealPnl` has exactly one
 *    writer in the whole codebase — `unrealPnl: 0`, at position open — and
 *    nothing ever updates it. So every row of every export ever produced
 *    reported the position as precisely breakeven, no matter what the market
 *    did. That is H1 at its purest: absence rendered as zero, and zero asserts
 *    a measured breakeven.
 *
 * WHY A FILE IS WORSE THAN A SCREEN
 * ---------------------------------
 * A wrong screen is corrected by a reload. A wrong file leaves the product. It
 * can be filed, mailed, imported into a spreadsheet, or read back months later
 * by someone who cannot ask the app what it meant — and by then the zero looks
 * like a measurement. So the export is the LAST place an unjustified number
 * belongs, and the one place the justification has to travel WITH the data.
 *
 * WHAT THIS DOES
 * --------------
 * · Emits only columns the saved book can actually justify: `AvgPx` (the
 *   average entry) and `FillPx` (the last fill). `FillPx` is the honest name
 *   for the field formerly exported as `MarketPx` — the same bytes, correctly
 *   labelled. Nothing is renamed to hide anything; it is renamed to stop
 *   claiming something.
 * · Emits NO market value and NO unrealized P&L, because this module has no
 *   quote feed and the stored P&L is a placeholder.
 * · Ships `PERSISTED_EXPORT_CAVEAT` inside the file, after the data, so the
 *   absence is explained to whoever opens it. A number that silently vanishes
 *   is its own kind of lie; in a file, it is a lie with a long life.
 *
 * LABEL-NOT-MODEL: nothing is computed, interpolated or estimated here. There
 * is no "approximate value", no last-good-price, no zero. The figure is
 * withheld and the withholding is stated.
 *
 * PURE — no I/O, no clock, no DOM. The caller owns the Blob and the download.
 */

import { PERSISTED_EXPORT_CAVEAT } from "./paperPositionMark";

/**
 * The only fields of a persisted position this exporter reads.
 *
 * `marketPx` is accepted because it is what the saved row carries, and is
 * deliberately re-labelled rather than passed through under its stored name.
 * `unrealPnl` is NOT in this type at all — a field that is always 0 has nothing
 * to contribute, and leaving it out of the input makes it impossible for a
 * future edit to reach for it by accident.
 */
export interface ExportablePaperPosition {
  readonly symbol: string;
  readonly qty: number;
  readonly avgPx: number;
  readonly marketPx?: number;
}

/** Column order is part of the contract; a Sentinel asserts it. */
export const PAPER_POSITION_EXPORT_HEADERS = [
  "Symbol",
  "Side",
  "Qty",
  "AvgPx",
  "FillPx",
] as const;

/**
 * RFC-4180 escaping. A symbol containing a comma or quote must not be able to
 * shift every following column by one — a corrupted row is a wrong number.
 */
function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build the CSV, or return null when there is nothing to export.
 *
 * Null rather than an empty file: a header-only CSV downloaded alongside a
 * success message is a false success — the trader believes they saved their
 * book and they saved nothing. The caller must refuse and say so.
 */
export function paperPositionsToCsv(
  positions: readonly ExportablePaperPosition[] | null | undefined,
): string | null {
  const rows = (positions ?? []).filter((p) => p != null);
  if (rows.length === 0) return null;

  const lines: string[] = [PAPER_POSITION_EXPORT_HEADERS.join(",")];

  for (const p of rows) {
    lines.push(
      [
        esc(p.symbol),
        // Direction is derived from the sign of qty, which is a fact about the
        // stored row, not an interpretation of it.
        esc(p.qty >= 0 ? "LONG" : "SHORT"),
        esc(Math.abs(p.qty)),
        esc(p.avgPx),
        // Blank, never 0, when the book has no fill price. H1.
        esc(typeof p.marketPx === "number" && Number.isFinite(p.marketPx) ? p.marketPx : ""),
      ].join(","),
    );
  }

  // Blank line first so a parser reading the data section stops cleanly, then
  // the caveat as comment lines. The note is deliberately INSIDE the file
  // rather than only in a toast, because the toast does not survive the
  // download and the reader of this file may never have seen it.
  lines.push("");
  for (const s of PERSISTED_EXPORT_CAVEAT) lines.push(`# ${s}`);

  return lines.join("\n");
}
