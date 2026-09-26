"use client";
import * as React from "react";
import {
  describeLegacyFuturesMoney,
  selectContractChip,
  type RecordedMoneyInput,
} from "@/lib/journal/computePnl";

/**
 * JOURNAL MONEY MARKS — the two places a journal row or total says what money
 * it is in (Garden 16 §17, review 2026-09-26).
 *
 * Pulled out of /journal's page so the words a trader reads are rendered and
 * asserted in a test, not only described in a comment. Both read the one
 * money owner (`computePnl.ts`); neither decides anything itself.
 */

/**
 * The list-row contract chip. An option row keeps its "OPT" chip; a futures
 * row gets "FUT ES" (and says when its stored money is 1x); a share row has
 * no chip, as it never had.
 */
export function JournalContractChip({ entry, testId }: { entry: RecordedMoneyInput; testId?: string }) {
  const chip = selectContractChip(entry);
  if (!chip) return null;
  // §9: a futures chip is an identity mark, not a verdict — neutral blue for
  // a priced contract; a row whose money is off (1x or unpriced) is dim, never
  // red: nothing was lost, the record is simply not in its contract's money.
  const tone = chip.flagged
    ? "border-wm-border bg-wm-surface text-wm-text-dim"
    : chip.basis === "option"
    ? "border-wm-purple/40 bg-wm-purple/10 text-wm-purple"
    : "border-wm-blue/40 bg-wm-blue/10 text-wm-blue";
  return (
    <span
      data-testid={testId}
      data-contract-basis={chip.basis}
      title={chip.words}
      aria-label={chip.words}
      className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold border ${tone}`}
    >
      {chip.text}
    </span>
  );
}

/**
 * The totals note: how many futures entries in THESE records were saved at
 * $1 per point. Renders nothing when there are none. Readable text with
 * role="note" — never only a tooltip.
 */
export function LegacyFuturesMoneyNote({
  records,
  testId,
  className,
}: {
  records: readonly RecordedMoneyInput[];
  testId?: string;
  className?: string;
}) {
  const { note } = describeLegacyFuturesMoney(records);
  if (note === null) return null;
  return (
    <p role="note" data-testid={testId} className={className ?? "text-[10px] text-wm-text-dim leading-relaxed"}>
      {note}
    </p>
  );
}
