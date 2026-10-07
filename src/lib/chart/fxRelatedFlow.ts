/**
 * CME RELATED-MARKET EVIDENCE FOR A SPOT PAIR (FX lane, 2026-10-06).
 *
 * Drive canon (Broker/API Detanglement §1E/§4E/§6): "EURUSD spot, OANDA
 * EUR_USD, CME 6E … cannot be treated as equivalent"; real signed flow for
 * EUR exists only on the CME future and may be shown as RELATED-MARKET
 * evidence with provenance — never as spot volume, never as "global FX".
 *
 * So this is a LINE OF WORDS beside the spot chart, never a bar, histogram
 * or profile on it: the CME future's exchange-signed prints over the last few
 * minutes, named as the future's, with the words "related market, not spot".
 * Only prints whose exchange aggressor side is BUY or SELL are counted; an
 * unsided print is counted apart and never guessed. Owner-only upstream (the
 * tastytrade stream); anyone else gets the plain unsupported line.
 *
 * PURE.
 */
import { fxFuturesDoor } from "./fxFuturesDoor";

export const RELATED_FLOW_WINDOW_MS = 5 * 60_000;

export interface RelatedPrint { readonly atMs: number; readonly size: number; readonly side: "BUY" | "SELL" | "UNKNOWN" }

export interface RelatedFlowSummary {
  readonly buy: number;
  readonly sell: number;
  readonly delta: number;
  readonly prints: number;
  readonly unsided: number;
}

/** "6E" from "6E1!" — the CME product root the line names. */
export function relatedRoot(spotSymbol: string): string | null {
  const door = fxFuturesDoor(spotSymbol);
  return door ? door.futures.replace(/1!$/, "") : null;
}

/** Keep only prints inside the window ending at `nowMs` (the array is newest-last). */
export function pruneRelated(prints: readonly RelatedPrint[], nowMs: number, windowMs = RELATED_FLOW_WINDOW_MS): RelatedPrint[] {
  const cut = nowMs - windowMs;
  let i = 0;
  while (i < prints.length && prints[i].atMs < cut) i++;
  return prints.slice(i);
}

export function summarizeRelated(prints: readonly RelatedPrint[]): RelatedFlowSummary {
  let buy = 0, sell = 0, unsided = 0;
  for (const p of prints) {
    if (!(p.size > 0)) continue;
    if (p.side === "BUY") buy += p.size;
    else if (p.side === "SELL") sell += p.size;
    else unsided++;
  }
  return { buy, sell, delta: buy - sell, prints: prints.length, unsided };
}

export type RelatedFlowState =
  | { readonly kind: "NOT_SPOT_FX" }
  | { readonly kind: "UNSUPPORTED" }          // not the owner / tastytrade not connected
  | { readonly kind: "CONNECTING" }
  | { readonly kind: "LIVE"; readonly summary: RelatedFlowSummary };

/** The one line the chart prints. Null when the symbol has no catalogued CME future. */
export function relatedFlowLine(spotSymbol: string, state: RelatedFlowState): string | null {
  const root = relatedRoot(spotSymbol);
  if (!root || state.kind === "NOT_SPOT_FX") return null;
  const name = `CME ${root} futures · signed flow (related market, not spot)`;
  if (state.kind === "UNSUPPORTED") return `${name} · not available here — needs the owner's tastytrade connection`;
  if (state.kind === "CONNECTING") return `${name} · connecting`;
  const s = state.summary;
  if (s.buy + s.sell === 0) return `${name} · last 5 min: no signed prints${s.unsided ? ` (${s.unsided} unsided)` : ""}`;
  const d = s.delta > 0 ? `+${s.delta}` : String(s.delta);
  return `${name} · last 5 min: buy ${s.buy} · sell ${s.sell} · Δ ${d} contracts${s.unsided ? ` · ${s.unsided} unsided` : ""}`;
}
