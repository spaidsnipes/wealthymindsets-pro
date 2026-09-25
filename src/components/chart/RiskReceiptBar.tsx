"use client";
/**
 * TEAR RECEIPT — H-1001's one press. Sits under the Reading lenses in Chart
 * tools. Tearing freezes the plan bracketed on price against the DECISION_ID
 * born on this camera (see `riskReceipt.ts`); the receipt then rides the
 * chart beside the brackets. A second tear for the same decision is refused
 * and the first asOf stands.
 */
import React from "react";
import type { RiskOnPriceVM } from "@/lib/marketData/viewModels/selectRiskOnPrice";
import type { RiskReceipt } from "@/lib/traderMemory/riskReceipt";
import { WebullOrderPreviewRow } from "./WebullOrderPreviewRow";

export function RiskReceiptBar({
  risk,
  decisionId,
  receipt,
  note,
  onTear,
  symbol,
}: {
  risk: Pick<RiskOnPriceVM, "drawn" | "reason" | "side" | "entry" | "stop"> | null;
  decisionId: string | null;
  receipt: RiskReceipt | null;
  note: string | null;
  onTear: () => void;
  /** The chart's symbol. When given, the plan can be priced at Webull (preview only). */
  symbol?: string;
}) {
  const why = receipt
    ? `Torn ${new Date(receipt.asOf).toISOString()} · frozen`
    : !decisionId
      ? "No DECISION_ID on this camera — nothing to tear from"
      : !risk?.drawn
        ? "No plan on price — draw a Long / Short Position with a stop"
        : `${risk.side} ${risk.entry?.toFixed(2)} · stop ${risk.stop?.toFixed(2)} · ready to tear`;
  return (
    <div data-testid="risk-receipt-bar" className="mt-2 rounded-lg border border-wm-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wm-text-dim">
          Receipt · {why}
        </span>
        <button
          type="button"
          onClick={onTear}
          disabled={!!receipt || !decisionId || !risk?.drawn}
          data-testid="risk-receipt-tear"
          className="min-h-8 shrink-0 rounded border border-wm-border px-2 text-[11px] font-semibold text-wm-text hover:text-wm-gold disabled:opacity-40"
        >
          Tear receipt
        </button>
      </div>
      {note ? <p className="mt-1 text-[11px] text-wm-text-dim">{note}</p> : null}
      {symbol ? (
        <WebullOrderPreviewRow
          symbol={symbol}
          side={risk?.drawn ? risk.side ?? null : null}
          entry={risk?.drawn ? risk.entry ?? null : null}
          decisionId={decisionId}
        />
      ) : null}
    </div>
  );
}
