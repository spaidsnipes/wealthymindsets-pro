/**
 * PERSONAL EDGE → ACADEMY (Garden 18 v2 §65/§66) — PURE.
 *
 * The conditions where the trader's own evidence is strongest AND most
 * negative (SUPPORTED groups only, worst first against their own overall
 * expectancy) are routed to the Academy lesson that teaches the nearest
 * capability. Only lessons the Academy actually holds are named (ids from the
 * /education catalogue); a condition with no lesson says so — no lesson is
 * invented, and no knowledge is left without a consumer.
 */
import type { EdgeBucket, LedgerEdge } from "@/lib/broker/ledgerEdge";

export interface StudyItem {
  readonly dimension: string;
  readonly bucket: EdgeBucket;
  readonly capability: string;
  readonly lesson: { readonly id: string; readonly title: string } | null;
}

/** Dimension → the capability it exercises and the nearest real lesson. */
const ROUTES: Readonly<Record<string, { readonly capability: string; readonly lesson: { readonly id: string; readonly title: string } | null }>> = {
  time: { capability: "Location — entering where the plan says, not when the clock says", lesson: { id: "clc-3", title: "Location: Demand Zones, PDL, VWAP, Structure" } },
  attempt: { capability: "Authorization — one A-setup, a second only with fresh authorization", lesson: { id: "clc-5", title: "Best Opportunity / Smallest Risk Setup Framework" } },
  hold: { capability: "Management — exit by plan once the thesis is done", lesson: { id: "clc-6", title: "CLC in Action: Live Trade Walkthroughs" } },
  dte: { capability: "Expression — choosing a contract that fits the idea and the risk", lesson: null },
  right: { capability: "Context — reading which side the regime supports", lesson: { id: "clc-2", title: "Context: Reading Market Regime (Trend vs Range vs Reversal)" } },
  entryType: { capability: "Execution — spread and fill quality at entry", lesson: { id: "of-4", title: "Bid, Ask, and Spread Dynamics" } },
  bracket: { capability: "Risk — protection defined before entry", lesson: { id: "clc-5", title: "Best Opportunity / Smallest Risk Setup Framework" } },
  weekday: { capability: "Preparation — day-specific context", lesson: null },
};

export function studyNext(edge: LedgerEdge, limit = 3): StudyItem[] {
  const candidates: StudyItem[] = [];
  for (const d of edge.dimensions) {
    const route = ROUTES[d.id];
    if (!route) continue;
    for (const b of d.buckets) {
      if (b.evidence !== "SUPPORTED" || b.vsOverall >= 0 || b.expectancy >= 0) continue;
      candidates.push({ dimension: d.title, bucket: b, capability: route.capability, lesson: route.lesson });
    }
  }
  // Worst total drag first: per-trade gap × how often it happens.
  return candidates.sort((a, b) => a.bucket.vsOverall * a.bucket.n - b.bucket.vsOverall * b.bucket.n).slice(0, limit);
}

export function lessonHref(id: string): string {
  return `/education?lesson=${encodeURIComponent(id)}`;
}
