"use client";

/**
 * The CME future's signed prints for a spot pair's related-market line
 * (fxRelatedFlow.ts). Rides the ONE tastytrade stream (tastyQuoteStream) as a
 * prints-only consumer; no socket of its own. Owner-gated upstream: when the
 * contract cannot be resolved or the stream refuses, the state is UNSUPPORTED.
 */
import { useEffect, useState } from "react";
import { tastyLiveContractFor } from "@/lib/broker/tastyFrontMonth";
import { subscribeTastyEvents } from "@/lib/broker/tastyQuoteStream";
import { fxFuturesDoor } from "@/lib/chart/fxFuturesDoor";
import { pruneRelated, summarizeRelated, type RelatedFlowState, type RelatedPrint } from "@/lib/chart/fxRelatedFlow";

export function useFxRelatedFlow(spotSymbol: string): RelatedFlowState {
  const door = fxFuturesDoor(spotSymbol);
  const futures = door?.futures ?? null;
  const [state, setState] = useState<RelatedFlowState>(futures ? { kind: "CONNECTING" } : { kind: "NOT_SPOT_FX" });
  useEffect(() => {
    if (!futures) { setState({ kind: "NOT_SPOT_FX" }); return; }
    setState({ kind: "CONNECTING" });
    let disposed = false;
    let release: (() => void) | null = null;
    let prints: RelatedPrint[] = [];
    let live = false;
    const publish = () => {
      if (disposed || !live) return;
      prints = pruneRelated(prints, Date.now());
      setState({ kind: "LIVE", summary: summarizeRelated(prints) });
    };
    const timer = setInterval(publish, 2_000);
    tastyLiveContractFor(futures).then(contract => {
      if (disposed) return;
      if (!contract) { setState({ kind: "UNSUPPORTED" }); return; }
      release = subscribeTastyEvents([contract.streamer], (e, receivedAtMs) => {
        if (e.type !== "TimeAndSale" || e.symbol !== contract.streamer) return;
        const size = e.values.size;
        if (!(size != null && size > 0)) return;
        const raw = e.text.aggressorSide;
        const t = e.values.time;
        const atMs = t != null && t > 0 && t <= receivedAtMs + 5_000 ? t : receivedAtMs;
        prints.push({ atMs, size, side: raw === "BUY" ? "BUY" : raw === "SELL" ? "SELL" : "UNKNOWN" });
        if (prints.length > 20_000) prints = prints.slice(-10_000);
      }, stream => {
        if (disposed) return;
        if (stream === "NOT_OWNER" || stream === "NOT_CONNECTED") { live = false; setState({ kind: "UNSUPPORTED" }); }
        else if (stream === "LIVE") { if (!live) { live = true; publish(); } }
      }, true, false);
    }).catch(() => { if (!disposed) setState({ kind: "UNSUPPORTED" }); });
    return () => { disposed = true; clearInterval(timer); release?.(); };
  }, [futures]);
  return state;
}
