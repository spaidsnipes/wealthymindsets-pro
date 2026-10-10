"use client";

/**
 * The listed contract months for the chart's futures product — tastytrade's own instrument read
 * (GET /api/broker/tastytrade/chain?futures=ROOT), parsed by readFuturesContracts. READ ONLY.
 * Owner only (the route is owner-gated); a guest or a failed read gets an empty list and a reason,
 * never a computed month.
 */

import { useEffect, useState } from "react";

import { readFuturesContracts, type FutureContract } from "@/lib/broker/tastytradeFuturesChain";

const cache = new Map<string, Promise<{ months: readonly FutureContract[]; why: string | null }>>();

function load(root: string) {
  let p = cache.get(root);
  if (!p) {
    p = fetch(`/api/broker/tastytrade/chain?futures=${encodeURIComponent(root)}`, { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        if (j?.state !== "OK") { cache.delete(root); return { months: [] as readonly FutureContract[], why: "tastytrade did not list this product's months (not connected or not on your account)." }; }
        const months = readFuturesContracts(j.data);
        return { months, why: months.length ? null : "tastytrade listed no open months for this product." };
      })
      .catch(() => { cache.delete(root); return { months: [] as readonly FutureContract[], why: "The months read did not return." }; });
    cache.set(root, p);
  }
  return p;
}

export function useFuturesMonths(root: string | null, enabled: boolean): { months: readonly FutureContract[]; why: string | null; loading: boolean } {
  const [s, setS] = useState<{ key: string | null; months: readonly FutureContract[]; why: string | null }>({ key: null, months: [], why: null });
  useEffect(() => {
    if (!root || !enabled) return;
    let live = true;
    void load(root).then(r => { if (live) setS({ key: root, ...r }); });
    return () => { live = false; };
  }, [root, enabled]);
  if (!root || !enabled) return { months: [], why: null, loading: false };
  return s.key === root ? { months: s.months, why: s.why, loading: false } : { months: [], why: null, loading: true };
}
