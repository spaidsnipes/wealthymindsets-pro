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
import type { PatternEvidence } from "./behaviorTags";

export type StudyMatch = { readonly kind: "dim"; readonly dimId: string; readonly key: string } | { readonly kind: "tag"; readonly tagId: PatternEvidence["id"] };

export interface StudyItem {
  /** Which trades this item is about — the rehearse filter (§64). */
  readonly match: StudyMatch;
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

const PATTERN_ROUTES: Readonly<Record<PatternEvidence["id"], { readonly capability: string; readonly lesson: { readonly id: string; readonly title: string } | null }>> = {
  THIRD_PLUS_ATTEMPT: { capability: "Authorization — a second attempt only with fresh authorization", lesson: { id: "clc-5", title: "Best Opportunity / Smallest Risk Setup Framework" } },
  RAPID_REENTRY: { capability: "Authorization — a new entry needs a new read, not the last one", lesson: { id: "clc-1", title: "The CLC Rule Explained — Foundation of Smart Entries" } },
  NO_BRACKET_AT_ENTRY: { capability: "Risk — protection defined before entry", lesson: { id: "clc-5", title: "Best Opportunity / Smallest Risk Setup Framework" } },
  ABOVE_USUAL_SIZE: { capability: "Risk — size changes only by plan", lesson: { id: "clc-5", title: "Best Opportunity / Smallest Risk Setup Framework" } },
};

export function studyNext(edge: LedgerEdge, limit = 3, patterns: readonly PatternEvidence[] = []): StudyItem[] {
  const candidates: StudyItem[] = [];
  // Supported fill patterns that cost more per trade than trades without them.
  for (const p of patterns) {
    if (p.evidence !== "SUPPORTED" || p.withoutExpectancy == null || p.expectancy >= p.withoutExpectancy || p.expectancy >= 0) continue;
    const r = PATTERN_ROUTES[p.id];
    const gap = Math.round((p.expectancy - p.withoutExpectancy) * 100) / 100;
    candidates.push({ match: { kind: "tag", tagId: p.id }, dimension: "Pattern from your fills", capability: r.capability, lesson: r.lesson,
      bucket: { key: p.label, n: p.n, wins: p.contradicting, losses: p.supporting, net: Math.round(p.expectancy * p.n * 100) / 100, expectancy: p.expectancy, winRate: p.contradicting / p.n, vsOverall: gap, evidence: "SUPPORTED" } });
  }
  for (const d of edge.dimensions) {
    const route = ROUTES[d.id];
    if (!route) continue;
    for (const b of d.buckets) {
      if (b.evidence !== "SUPPORTED" || b.vsOverall >= 0 || b.expectancy >= 0) continue;
      candidates.push({ match: { kind: "dim", dimId: d.id, key: b.key }, dimension: d.title, bucket: b, capability: route.capability, lesson: route.lesson });
    }
  }
  // Worst total drag first: per-trade gap × how often it happens.
  return candidates.sort((a, b) => a.bucket.vsOverall * a.bucket.n - b.bucket.vsOverall * b.bucket.n).slice(0, limit);
}

export function lessonHref(id: string): string {
  return `/education?lesson=${encodeURIComponent(id)}`;
}
