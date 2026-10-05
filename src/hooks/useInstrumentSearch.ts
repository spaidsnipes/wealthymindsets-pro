"use client";
import { useEffect, useState } from "react";
import { fetchInstrumentSearch, matchCanonicalInstruments, mergeInstrumentSearch, type InstrumentSearchHit } from "@/lib/marketData/instrumentSearch";

const SEARCH_DOWN = "The worldwide search did not answer just now — try again in a moment.";

/** One discovery request lifecycle for both chart and shell search. */
export function useInstrumentSearch(query: string) {
  const asked = query.trim();
  const [answer, setAnswer] = useState<{ query: string; hits: InstrumentSearchHit[]; pending: boolean; failure: string | null }>({ query: "", hits: [], pending: false, failure: null });
  useEffect(() => {
    if (!asked) return;
    const controller = new AbortController();
    setAnswer({ query: asked, hits: [], pending: true, failure: null });
    const timer = setTimeout(async () => {
      try {
        const hits = await fetchInstrumentSearch(asked, controller.signal);
        if (hits !== null) setAnswer({ query: asked, hits, pending: false, failure: null });
      } catch (error) {
        // A plain sentence for the trader (garden pass 2026-10-04: String(error)
        // printed "Error: …POLYGON_KEY is unset…" and raw TypeErrors to guests).
        if (!controller.signal.aborted) setAnswer({ query: asked, hits: [], pending: false, failure: SEARCH_DOWN });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [asked]);
  // Query-tagged state hides the old market immediately, before effect cleanup.
  const current = asked && answer.query === asked ? answer : null;
  return {
    results: mergeInstrumentSearch(asked, matchCanonicalInstruments(asked, 20), current?.hits ?? []),
    searching: Boolean(asked && (!current || current.pending)),
    failure: current?.failure ?? null,
  };
}
