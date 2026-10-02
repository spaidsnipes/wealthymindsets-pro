/**
 * PROCESS × OUTCOME (Garden 18 v2 §33/§38/§54) — PURE.
 *
 * The trader's own review of each broker episode (storyReview: eight HELD /
 * BROKE marks) set beside the broker's result. A reviewed trade with no BROKE
 * mark is GOOD PROCESS; any BROKE mark is BAD PROCESS; an unreviewed trade is
 * neither and is counted apart. The grade is the trader's, never inferred
 * from fills — a profitable mistake stays a mistake, a disciplined loss stays
 * disciplined.
 */
import type { Episode } from "./webullLedger";
import type { StoryReview } from "@/lib/journal/storyReview";

export interface Cell { readonly n: number; readonly net: number }
export interface ProcessOutcome {
  readonly reviewed: number;
  readonly unreviewed: number;
  readonly goodWin: Cell; readonly goodLoss: Cell; readonly badWin: Cell; readonly badLoss: Cell;
  /** Net of trades the trader marked BROKE on any dimension — the identifiable rule-deviation cost (§36). */
  readonly brokeNet: number;
  /** Per dimension: how often it was marked BROKE among reviewed trades. */
  readonly brokeBy: readonly { readonly dimension: string; readonly broke: number; readonly net: number }[];
}

export const episodeReviewKey = (e: Pick<Episode, "id">) => `webull-episode:${e.id}`;

export function processOutcome(episodes: readonly Episode[], reviews: Readonly<Record<string, StoryReview>>): ProcessOutcome {
  const add = (c: { n: number; net: number }, v: number) => { c.n++; c.net = Math.round((c.net + v) * 100) / 100; };
  const gw = { n: 0, net: 0 }, gl = { n: 0, net: 0 }, bw = { n: 0, net: 0 }, bl = { n: 0, net: 0 };
  const by = new Map<string, { broke: number; net: number }>();
  let reviewed = 0, unreviewed = 0;
  for (const e of episodes) {
    if (e.label !== "RECONSTRUCTED" || e.net == null) continue;
    const r = reviews[episodeReviewKey(e)];
    const marks = Object.entries(r?.marks ?? {});
    if (marks.length === 0) { unreviewed++; continue; }
    reviewed++;
    const broke = marks.filter(([, m]) => m === "BROKE").map(([d]) => d);
    const win = e.net > 0;
    add(broke.length ? (win ? bw : bl) : (win ? gw : gl), e.net);
    for (const d of broke) { const b = by.get(d) ?? { broke: 0, net: 0 }; b.broke++; b.net = Math.round((b.net + e.net) * 100) / 100; by.set(d, b); }
  }
  return {
    reviewed, unreviewed, goodWin: gw, goodLoss: gl, badWin: bw, badLoss: bl,
    brokeNet: Math.round((bw.net + bl.net) * 100) / 100,
    brokeBy: [...by.entries()].map(([dimension, v]) => ({ dimension, ...v })).sort((a, b) => b.broke - a.broke),
  };
}
