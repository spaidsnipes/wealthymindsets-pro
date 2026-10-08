"use client";

/**
 * tastytrade's working orders and position for ONE contract, read back from
 * the broker (read routes only: /api/broker/tastytrade/orders, /positions)
 * every few seconds while mounted, and published to the chart's order-line
 * store under the "broker" publisher. Garden 19 §23 slice 3.
 *
 * A failed read keeps the last answer and the lines turn RECONCILING after
 * READBACK_STALE_MS — never silently removed, never shown as fresh.
 */

import { useEffect, useMemo, useState } from "react";

import { readTastytradeOrder, type TtOrderView } from "@/lib/broker/tastytradeOrderState";

import { READBACK_STALE_MS, readTastytradePosition, selectBrokerOrderLines, type BrokerPositionRow, type BrokerReadback } from "./brokerOrderLines";
import { publishChartOrderLines } from "./chartOrderLines";

const POLL_MS = 3_000;

export function useBrokerChartLines(opts: {
  readonly enabled: boolean;
  readonly chartSymbol: string;
  /** The executable contract (`/NQZ6`); null = nothing to read back yet. */
  readonly contract: string | null;
  readonly mark: number | null;
  readonly pointValue: number | null;
}) {
  const { enabled, chartSymbol, contract, mark, pointValue } = opts;
  const [rb, setRb] = useState<BrokerReadback>({ asOfMs: null, ok: false, orders: [], positions: [] });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !contract) return;
    let live = true;
    const read = async () => {
      try {
        const [o, p] = await Promise.all([
          fetch("/api/broker/tastytrade/orders", { cache: "no-store" }).then(r => r.json().catch(() => null)),
          fetch("/api/broker/tastytrade/positions", { cache: "no-store" }).then(r => r.json().catch(() => null)),
        ]);
        if (!live) return;
        const okBoth = o?.state === "OK" && p?.state === "OK";
        const orderAccounts: Record<string, { index: number; tail: string }> = {};
        const orders = o?.state === "OK" ? (o.accounts as { index?: unknown; tail?: unknown; orders: unknown[] }[]).flatMap(a => a.orders.map(x => {
          const v = x && typeof x === "object" && "state" in (x as object) ? (x as TtOrderView) : readTastytradeOrder(x);
          if (v && typeof a.index === "number" && typeof a.tail === "string") orderAccounts[v.id] = { index: a.index, tail: a.tail };
          return v;
        }).filter((x): x is TtOrderView => !!x)) : null;
        const positions = p?.state === "OK" ? (p.accounts as { positions?: unknown[] }[]).flatMap(a => (a.positions ?? []).map(readTastytradePosition).filter((x): x is BrokerPositionRow => !!x)) : null;
        const tails = o?.state === "OK" ? (o.accounts as { tail?: unknown }[]).map(a => (typeof a.tail === "string" ? a.tail : null)).filter((t): t is string => !!t) : [];
        setRb(prev => okBoth && orders && positions
          ? { asOfMs: Date.now(), ok: true, orders, positions, tails, orderAccounts }
          : { ...prev, ok: false });
      } catch {
        if (live) setRb(prev => ({ ...prev, ok: false }));
      }
      if (live) setNow(Date.now());
    };
    void read();
    const t = setInterval(() => void read(), POLL_MS);
    // The clock alone moves a fresh readback to STALE when reads stop answering.
    const tick = setInterval(() => setNow(Date.now()), READBACK_STALE_MS / 2);
    return () => { live = false; clearInterval(t); clearInterval(tick); };
  }, [enabled, contract]);

  const result = useMemo(() => (contract ? selectBrokerOrderLines(rb, contract, mark, pointValue, now) : null), [rb, contract, mark, pointValue, now]);

  useEffect(() => {
    publishChartOrderLines("broker", chartSymbol, enabled && result ? result.lines : []);
  }, [chartSymbol, enabled, result]);
  useEffect(() => () => publishChartOrderLines("broker", chartSymbol, []), [chartSymbol]);

  return result;
}
