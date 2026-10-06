"use client";

/**
 * OPTIONS FLOW ON BTC / ETH (ATHOS §6 · P-03, 2026-10-06): Deribit's public
 * option trades of the last 20 hours, through /api/market-data/deribit/options
 * (view=trades), compiled by the same owner the tastytrade lane uses. Polled
 * once a minute while Brick Walls is on; nothing stored.
 */
import { useEffect, useState } from "react";
import { deribitCurrencyFor } from "@/lib/marketData/deribitOptions";
import { selectOptionFlowEvents, type OptionFlowVM, type OptionLeg, type OptionPrint } from "@/lib/marketData/viewModels/selectOptionFlowEvents";

const POLL_MS = 60_000;

export function useDeribitOptionFlow(symbol: string, enabled: boolean): OptionFlowVM | null {
  const currency = enabled ? deribitCurrencyFor(symbol) : null;
  const [vm, setVm] = useState<OptionFlowVM | null>(null);
  useEffect(() => {
    setVm(null);
    if (!currency) return;
    let alive = true;
    const load = () => fetch(`/api/market-data/deribit/options?symbol=${currency}&view=trades`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { prints?: OptionPrint[]; legs?: Record<string, OptionLeg> } | null) => {
        if (!alive || !j?.prints || !j.legs) return;
        setVm(selectOptionFlowEvents(j.prints, new Map(Object.entries(j.legs))));
      })
      .catch(() => { /* the lane stays as it was; the next poll retries */ });
    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => { alive = false; window.clearInterval(id); };
  }, [currency]);
  return vm;
}
