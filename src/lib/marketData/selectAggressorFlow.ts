/**
 * selectAggressorFlow — pure aggressor-flow computation over a tick
 * stream. Extracts SmartMoneyPanel's inline math into a canonical,
 * testable, reusable selector.
 *
 * Given the recent per-trade ticks (with `side` = buy/sell and `size`),
 * returns:
 *
 *   askVol   — total aggressor-buy volume (buyer lifted the ask)
 *   bidVol   — total aggressor-sell volume (seller hit the bid)
 *   cvd      — cumulative volume delta = askVol - bidVol (signed)
 *   vwap     — volume-weighted average price (falls back to livePrice)
 *   hasFlow  — real aggressor volume was observed (askVol+bidVol > 0)
 *   haveData — at least one valid tick was seen
 *   imbRatio — ratio of dominant side to weaker side, ×100
 *   askDom   — askVol ≥ bidVol
 *
 * PURE — no I/O, no clock. Ticks with size ≤ 0 / price ≤ 0 /
 * missing / non-trade are filtered out (canon §Silence: never
 * fabricate volume).
 *
 * ─────────────────────────────────────────────────────────────────────
 * HOW DO WE KNOW THESE SIDES? (2026-09-11)
 *
 * This selector used to answer "how much was bought" and refuse to answer
 * "how do you know". Both halves of the tape disagree about the second
 * question, and the difference is not cosmetic:
 *
 *   coinbase / binance  aggressorMethod: "MAKER_SIDE_INVERTED"  conf 1
 *   webull / moomoo     aggressorMethod: "PROVIDER"             conf 1
 *   alpaca relay        aggressorMethod: "TICK_RULE"            conf 0.5
 *
 * The alpaca relay does not receive an aggressor flag at all. It INFERS one
 * by comparing each print to the prior price (`alpacaRelay.ts:51`), and says
 * so honestly on the event: `aggressorMethod: "TICK_RULE"`,
 * `aggressorConfidence: 0.5`, `fidelityClass: "PROXY"`. Alpaca is also the
 * ONLY provider serving live equity trades today — every other broker is
 * blocked on a credential, and `/api/athos/market-data/capabilities` reports
 * AGGRESSOR_SIDE as UNAVAILABLE.
 *
 * So on a live US equity chart, EVERY "AGGRESSIVE BUY" number was a coin-flip
 * heuristic rendered in the same font, the same colour and the same words as a
 * provider-stamped aggressor from Coinbase. `CanonicalMarketEvent` published
 * the distinction; `AggressorTick` narrowed a rich fact to a bare
 * `"buy" | "sell"`; and no rendering surface read `aggressorMethod` anywhere
 * in `src/`. The certainty was manufactured at the SEAM, by omission.
 *
 * That is the shift's defect class wearing new clothes — a consumer restating
 * what an owner publishes, minus the qualifier that made it true. §5 SYSTEM
 * TRUTH LAW; LIVING-PIXEL LAW (the LABEL is part of the pixel).
 *
 * `provenance` is now part of the answer, computed WEAKEST-LINK: a blend of
 * one provider-stamped print and one tick-rule guess is not "mostly known",
 * it is MIXED, and the trader is told so.
 *
 * A tick whose `side` is neither "buy" nor "sell" no longer lands in `bidVol`.
 * The old `else` branch turned "we do not know" into seller-initiated volume —
 * fabricating the very thing the module header promises never to fabricate.
 * Such a tick still counts toward VWAP and `haveData`, because it IS a real
 * print; it simply carries no aggressor, and drags `provenance` down with it.
 */

import type { AggressorMethod } from "./marketEvent";

/**
 * How the aggressor side of a flow was established.
 *
 *   PROVIDER     every contributing print carried a side the venue asserted
 *                (or a maker flag that inverts to one deterministically)
 *   INFERRED     every side was reconstructed by heuristic — tick rule or
 *                quote test. Directionally useful, not ground truth.
 *   MIXED        both kinds contributed. Weakest-link: this is NOT "PROVIDER
 *                with a bit of noise", it is a number no single method backs.
 *   UNDISCLOSED  nothing said how it knows, or there was no flow at all.
 */
export type AggressorProvenance = "PROVIDER" | "INFERRED" | "MIXED" | "UNDISCLOSED";

/**
 * Which methods are assertions by the venue, and which are reconstructions.
 *
 * MAKER_SIDE_INVERTED counts as PROVIDER on purpose: the venue states which
 * party was the maker, and the aggressor is the other one BY DEFINITION. That
 * is a deterministic restatement of provider data, not a guess about it.
 */
function provenanceOf(method: AggressorMethod | undefined): AggressorProvenance {
  if (method === "PROVIDER" || method === "MAKER_SIDE_INVERTED") return "PROVIDER";
  if (method === "TICK_RULE" || method === "QUOTE_TEST") return "INFERRED";
  return "UNDISCLOSED";
}

export interface AggressorTick {
  readonly side?: "buy" | "sell" | null | undefined;
  readonly size?: number | null | undefined;
  readonly price?: number | null | undefined;
  readonly trade?: boolean;
  /**
   * Canonical provenance, when the producing adapter has migrated to the
   * Nectar event contract. Read for `aggressorMethod` only — this selector
   * stays pure and never inspects identity or timestamps.
   */
  readonly marketEvent?: { readonly aggressorMethod?: AggressorMethod } | null;
}

export interface AggressorFlowSnapshot {
  readonly haveData: boolean;
  readonly hasFlow: boolean;
  readonly askVol: number;
  readonly bidVol: number;
  readonly cvd: number;
  readonly vwap: number;
  readonly imbRatio: number;
  /**
   * True when one aggressor side has zero volume, making the real ratio
   * unbounded. `imbRatio` carries a 300 sentinel in this case — display
   * layers must render "one-sided" rather than a fabricated "300:100".
   */
  readonly oneSided: boolean;
  readonly askDom: boolean;
  /**
   * How the sides behind `askVol` / `bidVol` / `cvd` were established.
   * Display layers MUST disclose anything other than "PROVIDER": a tick-rule
   * reconstruction may not wear the same chrome as a venue-asserted aggressor.
   */
  readonly provenance: AggressorProvenance;
}

/**
 * Compute the snapshot. Empty / all-invalid ticks return a zeroed
 * snapshot with vwap set to `livePrice` fallback.
 */
export function selectAggressorFlow(
  ticks: readonly AggressorTick[] | null | undefined,
  livePrice: number = 0,
): AggressorFlowSnapshot {
  const empty: AggressorFlowSnapshot = {
    haveData: false,
    hasFlow: false,
    askVol: 0,
    bidVol: 0,
    cvd: 0,
    vwap: livePrice > 0 ? livePrice : 0,
    imbRatio: 100,
    oneSided: false,
    askDom: true,
    provenance: "UNDISCLOSED",
  };
  if (!ticks || !Array.isArray(ticks) || ticks.length === 0) return empty;

  let askVol = 0;
  let bidVol = 0;
  let pv = 0;
  let vol = 0;
  let sawTick = false;
  let sawProvider = false;
  let sawInferred = false;
  let sawUndisclosed = false;

  for (const t of ticks) {
    if (!t || t.trade !== true) continue;
    const size = Number(t.size) || 0;
    const price = Number(t.price) || 0;
    if (size <= 0 || price <= 0) continue;
    sawTick = true;
    // VWAP is a price/volume fact and owes nothing to the aggressor question,
    // so an unsided print still belongs here.
    pv += price * size;
    vol += size;
    // An absent or unrecognised side is NOT a sell. It contributes no aggressor
    // volume at all, and it tells the trader the tape is not fully disclosed.
    if (t.side !== "buy" && t.side !== "sell") {
      sawUndisclosed = true;
      continue;
    }
    if (t.side === "buy") askVol += size;
    else bidVol += size;
    const p = provenanceOf(t.marketEvent?.aggressorMethod);
    if (p === "PROVIDER") sawProvider = true;
    else if (p === "INFERRED") sawInferred = true;
    else sawUndisclosed = true;
  }

  // Weakest-link, and deliberately not a majority vote: "most of these prints
  // came from the venue" is not a claim the weakest print supports.
  const kinds = (sawProvider ? 1 : 0) + (sawInferred ? 1 : 0) + (sawUndisclosed ? 1 : 0);
  const provenance: AggressorProvenance =
    kinds === 0 ? "UNDISCLOSED"
    : kinds > 1 ? "MIXED"
    : sawProvider ? "PROVIDER"
    : sawInferred ? "INFERRED"
    : "UNDISCLOSED";

  const cvd = askVol - bidVol;
  const vwap = vol > 0 ? pv / vol : livePrice > 0 ? livePrice : 0;
  const hi = Math.max(askVol, bidVol);
  const lo = Math.min(askVol, bidVol);
  // When the weaker side has zero volume the true ratio is UNBOUNDED, not 3:1.
  // `imbRatio` keeps its historical 300 sentinel so existing numeric consumers
  // (dominance thresholds) behave unchanged, but `oneSided` is the honest
  // signal: display layers MUST NOT paint 300 as a measured "300:100" ratio —
  // that number has no owner in the tape (LIVING-PIXEL LAW).
  const oneSided = lo === 0 && hi > 0;
  const imbRatio = lo > 0 ? (hi / lo) * 100 : hi > 0 ? 300 : 100;

  return {
    haveData: sawTick,
    hasFlow: askVol + bidVol > 0,
    askVol,
    bidVol,
    cvd,
    vwap,
    imbRatio,
    oneSided,
    askDom: askVol >= bidVol,
    provenance,
  };
}
