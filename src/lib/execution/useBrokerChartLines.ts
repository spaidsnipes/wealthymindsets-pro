"use client";

/**
 * tastytrade's working orders and position for ONE contract, selected from the SHARED broker readback
 * (brokerReadbackStore — one poll for the ticket and the chart strip) and published to the chart's
 * order-line store under the "broker" publisher. Garden 19 §23 slice 3.
 *
 * `fast` (default true: the ticket is the caller) asks the shared poll for its 3 s cadence. A failed
 * read keeps the last answer and the lines turn RECONCILING after READBACK_STALE_MS — never silently
 * removed, never shown as fresh. The lines are NOT cleared when this hook unmounts while another reader
 * still holds the store: closing the ticket does not blank the chart's broker lines.
 */

import { useEffect, useMemo } from "react";

import { selectBrokerOrderLines } from "./brokerOrderLines";
import { useBrokerReadback } from "./brokerReadbackStore";
import { publishChartOrderLines } from "./chartOrderLines";

export function useBrokerChartLines(opts: {
  readonly enabled: boolean;
  readonly chartSymbol: string;
  /** The executable contract (`/NQZ6`); null = nothing to read back yet. */
  readonly contract: string | null;
  readonly mark: number | null;
  readonly pointValue: number | null;
  readonly fast?: boolean;
}) {
  const { enabled, chartSymbol, contract, mark, pointValue } = opts;
  const { rb, nowMs } = useBrokerReadback(enabled && !!contract, opts.fast ?? true);
  const result = useMemo(() => (contract ? selectBrokerOrderLines(rb, contract, mark, pointValue, nowMs) : null), [rb, contract, mark, pointValue, nowMs]);

  useEffect(() => {
    if (enabled && result) publishChartOrderLines("broker", chartSymbol, result.lines);
  }, [chartSymbol, enabled, result]);
  // A symbol change clears the previous symbol's broker lines; an unmount on the same symbol keeps them
  // (they are broker truth as last read, and they age to RECONCILING through the next reader).
  useEffect(() => () => publishChartOrderLines("broker", chartSymbol, []), [chartSymbol]);

  return result;
}
