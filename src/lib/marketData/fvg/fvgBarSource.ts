/**
 * FVG BAR SOURCE — the one fetch an FVG reader (Backtest Lab, Scanner) uses to
 * get CANONICAL bars from the same bar route the chart and the backtester
 * already read (/api/yahoo `type=candles`, which publishes `barIdentities`).
 *
 * It returns closed canonical bars or a REFUSAL with a plain reason — never a
 * guessed bar. The route's own words (`reason`, `error`) are kept, trimmed.
 *
 * IO lives here and only here; everything it hands back goes through the pure
 * `fvgWireBars.ts`.
 */

import type { CanonicalBar, CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { closedFvgBars, rejoinCanonicalBars } from "./fvgWireBars";

export type FvgBarFetch =
  | {
      readonly ok: true;
      readonly bars: readonly CanonicalBar[];
      readonly unpaired: number;
      readonly forming: number;
      /** The route's provenance words, when it sent them (e.g. REST_BACKFILL / DERIVED). */
      readonly provenance: string | null;
      readonly fidelity: string | null;
    }
  | { readonly ok: false; readonly reason: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function plain(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim().slice(0, 160) : null;
}

/** Interpret one /api/yahoo candles body. Pure — exported for tests. */
export function readFvgBarBody(
  body: unknown,
  input: { readonly symbol: string; readonly timeframe: string; readonly nowMs: number },
): FvgBarFetch {
  if (!body || typeof body !== "object") return { ok: false, reason: "The bar route sent no readable answer." };
  const j = body as Record<string, unknown>;
  const said = plain(j.error) ?? plain(j.reason) ?? plain(j.message);
  if (j.ok === false) return { ok: false, reason: said ?? "The bar route said these bars are unavailable." };
  const candles = Array.isArray(j.candles) ? (j.candles as LegacyOhlcvTuple[]) : null;
  if (!candles) return { ok: false, reason: said ?? "The bar route sent no bars." };
  if (!candles.length) return { ok: false, reason: said ?? `No ${input.timeframe} bars are available for ${input.symbol}.` };
  const identities = Array.isArray(j.barIdentities) ? (j.barIdentities as CanonicalBarIdentity[]) : null;
  if (!identities) {
    return { ok: false, reason: "These bars arrived without their canonical identity, so no FVG object can be named from them." };
  }
  const joined = rejoinCanonicalBars({ candles, identities, symbolId: input.symbol, timeframe: input.timeframe });
  const { closed, forming, noClock } = closedFvgBars(joined.bars, input.timeframe, input.nowMs);
  if (noClock) return { ok: false, reason: `The ${input.timeframe} timeframe has no bar clock, so a bar's close time cannot be stated.` };
  return {
    ok: true,
    bars: closed,
    unpaired: joined.unpaired,
    forming,
    provenance: plain(j.barProvenance),
    fidelity: plain(j.barFidelity),
  };
}

/** Fetch closed canonical bars for one symbol/timeframe. */
export async function fetchFvgBars(input: {
  readonly symbol: string;
  readonly timeframe: string;
  readonly bars: number;
  readonly nowMs: number;
  readonly extendedHours?: boolean;
  readonly fetcher?: FetchLike;
  readonly signal?: AbortSignal;
}): Promise<FvgBarFetch> {
  const q = new URLSearchParams({ sym: input.symbol, type: "candles", tf: input.timeframe, bars: String(input.bars) });
  if (input.extendedHours) q.set("ext", "1");
  const f: FetchLike = input.fetcher ?? ((u, i) => fetch(u, i));
  let res: Response;
  try {
    res = await f(`/api/yahoo?${q.toString()}`, { cache: "no-store", signal: input.signal });
  } catch {
    return { ok: false, reason: "The market history did not load just now." };
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const said = body && typeof body === "object" ? plain((body as Record<string, unknown>).reason) ?? plain((body as Record<string, unknown>).error) : null;
    return { ok: false, reason: said ?? `The bar route answered ${res.status}, so no bars were read.` };
  }
  return readFvgBarBody(body, input);
}
