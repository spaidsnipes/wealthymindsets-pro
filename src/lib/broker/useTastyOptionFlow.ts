"use client";

/**
 * OPTIONS FLOW — the signed prints of the futures-option contracts Brick Walls
 * already streams, heard on the ONE shared socket (tape=true adds TimeAndSale
 * for those symbols; no second stream). Bounded: the newest MAX_PRINTS prints,
 * recompiled at most every FLUSH_MS. The meaning lives in
 * selectOptionFlowEvents (P-03); this hook only listens.
 */
import { useEffect, useMemo, useState } from "react";
import { subscribeTastyEvents } from "@/lib/broker/tastyQuoteStream";
import { fetchTastyTimeAndSales } from "@/lib/broker/tastyHistory";
import type { ContractEvent } from "@/lib/broker/tastyContractQuote";
import type { Leg } from "@/lib/broker/useTastyFuturesPositioning";
import { selectOptionFlowEvents, type OptionLeg, type OptionPrint, type OptionFlowVM } from "@/lib/marketData/viewModels/selectOptionFlowEvents";

const MAX_PRINTS = 20_000;
const FLUSH_MS = 1000;
// Back to the last regular session on a stock chart read overnight; each
// contract's snapshot is still the provider's own (~1,000 prints).
const HISTORY_MS = 20 * 3600_000;

export function useTastyOptionFlow(legs: readonly Leg[] | null | undefined, enabled: boolean): OptionFlowVM | null {
  const key = enabled && legs?.length ? legs.map(l => l.streamer).sort().join("|") : "";
  const legMap = useMemo(() => {
    const m = new Map<string, OptionLeg>();
    for (const l of legs ?? []) m.set(l.streamer, { contract: l.contract, type: l.type, strike: l.strike, expiration: l.expiration, multiplier: l.multiplier });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const [vm, setVm] = useState<OptionFlowVM | null>(null);
  useEffect(() => {
    setVm(null);
    if (!key) return;
    const prints: OptionPrint[] = [];
    let dirty = false;
    const take = (e: ContractEvent) => {
      if (e.type !== "TimeAndSale") return;
      const v = e.values;
      const side = e.text.aggressorSide;
      if (v.time == null || v.price == null || v.size == null) return;
      prints.push({
        streamer: e.symbol, timeMs: v.time, sequence: v.sequence ?? null, price: v.price, size: v.size,
        aggressor: side === "BUY" || side === "SELL" || side === "UNDEFINED" ? side : null,
        bid: v.bidPrice ?? null, ask: v.askPrice ?? null,
      });
      if (prints.length > MAX_PRINTS) prints.splice(0, prints.length - MAX_PRINTS);
      dirty = true;
    };
    // Prints only: the quote / Greeks streams of these contracts would repaint
    // panels several times a second for nothing this lane reads (Founder,
    // 2026-10-05: nothing on the chart may cost the candles their smoothness).
    const release = subscribeTastyEvents(key.split("|"), take, undefined, true, false);
    // The session so far (HISTORY_MS back), one short-lived connection; the
    // selector folds a print heard both ways once (contract, time, sequence).
    const ctrl = new AbortController();
    void fetchTastyTimeAndSales(key.split("|"), Date.now() - HISTORY_MS, { signal: ctrl.signal, timeoutMs: 12_000, maxEvents: MAX_PRINTS })
      .then(h => { if (h && !ctrl.signal.aborted) { for (const e of h.events) take(e); prints.sort((a, b) => a.timeMs - b.timeMs); } });
    const id = window.setInterval(() => {
      if (!dirty) return;
      dirty = false;
      setVm(selectOptionFlowEvents(prints, legMap));
    }, FLUSH_MS);
    setVm(selectOptionFlowEvents([], legMap));
    return () => { ctrl.abort(); window.clearInterval(id); release(); };
  }, [key, legMap]);
  return vm;
}
