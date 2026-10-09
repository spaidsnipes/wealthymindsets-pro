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

import { isPublicFailureCode } from "@/lib/publicFailure";
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

/**
 * The route's own sentence, only when it is already in trader words. A vendor
 * name, an HTTP code or an exception string is plumbing (serving fabce3a read
 * "Nothing was studied: Error: Yahoo HTTP 404") — it is replaced, never shown.
 */
const PLUMBING = /\b(error|exception|http|https|fetch|undefined|null|stack|api|status|yahoo|finnhub|alpaca|tastytrade|webull|coinbase|kraken|deribit|cboe|oanda)\b|\b[1-5]\d\d\b/i;
export function traderWords(v: unknown): string | null {
  const t = plain(v);
  return t && !PLUMBING.test(t) ? t : null;
}

const noBars = (symbol: string, timeframe: string) =>
  `No ${timeframe} bars could be read for ${symbol} — it may not be a symbol we can chart, or it has no history at this timeframe.`;
const DID_NOT_LOAD = "The market history did not load just now — try again in a moment.";

/**
 * NOT FOUND IS NOT TRANSIENT (night shift 2026-10-07). An unknown symbol made
 * the route answer HTTP 500 with `{"error":"Error: Yahoo HTTP 404"}` — the
 * upstream's own "no such instrument" wrapped in a server error — and the
 * Backtest / Scanner refusal read "try again in a moment", advice that can
 * never work. The status the UPSTREAM gave is read from that plumbing string
 * (never shown): a 404 / 400 there, like one from our own route, means the
 * symbol or this timeframe has nothing to read. Only a genuine 5xx or network
 * failure keeps the retry sentence.
 */
export function upstreamSaysMissing(status: number, body: unknown): boolean {
  if (status === 404 || status === 400) return true;
  if (!body || typeof body !== "object") return false;
  const j = body as Record<string, unknown>;
  // The stable code (publicFailure, 2026-10-09) is read first; the old plumbing text below is still
  // accepted for one release, for a server or a browser that is one build behind.
  if (j.code === "UPSTREAM_NOT_FOUND") return true;
  if (isPublicFailureCode(j.code)) return false;
  const text = [j.error, j.reason, j.message].filter(v => typeof v === "string").join(" ");
  return /\bHTTP (404|400)\b|\bnot found\b|\bno data\b|\bdelisted\b/i.test(text);
}

/** Interpret one /api/yahoo candles body. Pure — exported for tests. */
export function readFvgBarBody(
  body: unknown,
  input: { readonly symbol: string; readonly timeframe: string; readonly nowMs: number },
): FvgBarFetch {
  if (!body || typeof body !== "object") return { ok: false, reason: DID_NOT_LOAD };
  const j = body as Record<string, unknown>;
  // A coded failure (publicFailure) is worded by its code below, never by the route's fragment.
  const said = isPublicFailureCode(j.code) ? null : traderWords(j.reason) ?? traderWords(j.message) ?? traderWords(j.error);
  if (j.ok === false) return { ok: false, reason: said ?? noBars(input.symbol, input.timeframe) };
  const candles = Array.isArray(j.candles) ? (j.candles as LegacyOhlcvTuple[]) : null;
  if (!candles) return { ok: false, reason: said ?? noBars(input.symbol, input.timeframe) };
  if (!candles.length) return { ok: false, reason: said ?? noBars(input.symbol, input.timeframe) };
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

/**
 * §58 PERFORMANCE LAW — one fetch per question. Readers that ask for the same
 * symbol / timeframe / depth at once (the Scanner strip and the Backtest study
 * in one session, a double click) share ONE request; a body that arrived in the
 * last FVG_BAR_REUSE_MS is reused (closed bars are re-cut against each caller's
 * own `nowMs`, so reuse never reads a bar as closed early). Refusals are not cached.
 */
export const FVG_BAR_REUSE_MS = 60_000;
const bodyCache = new Map<string, { readonly at: number; readonly body: Promise<{ ok: boolean; status: number; body: unknown }> }>();

/** Test seam: forget every shared body. */
export function clearFvgBarCache(): void { bodyCache.clear(); }

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
  const url = `/api/yahoo?${q.toString()}`;
  const hit = bodyCache.get(url);
  let shared: Promise<{ ok: boolean; status: number; body: unknown }>;
  if (hit && input.nowMs - hit.at < FVG_BAR_REUSE_MS && input.nowMs >= hit.at) {
    shared = hit.body;
  } else {
    // The shared request is not tied to one caller's abort signal; each caller
    // stops LISTENING on its own signal below.
    shared = f(url, { cache: "no-store" })
      .then(async res => ({ ok: res.ok, status: res.status, body: await res.json().catch(() => null) }));
    bodyCache.set(url, { at: input.nowMs, body: shared });
    shared.then(r => { if (!r.ok) bodyCache.delete(url); }, () => bodyCache.delete(url));
  }
  let got: { ok: boolean; status: number; body: unknown };
  try {
    got = await (input.signal
      ? Promise.race([shared, new Promise<never>((_, rej) => {
          if (input.signal!.aborted) rej(new Error("aborted"));
          input.signal!.addEventListener("abort", () => rej(new Error("aborted")), { once: true });
        })])
      : shared);
  } catch {
    return { ok: false, reason: input.signal?.aborted ? "The read was stopped." : DID_NOT_LOAD };
  }
  const body = got.body;
  if (!got.ok) {
    // A coded failure is worded HERE, by its code — the route's fragment is for a sentence of its own.
    const coded = body && typeof body === "object" && isPublicFailureCode((body as Record<string, unknown>).code);
    const said = !coded && body && typeof body === "object" ? traderWords((body as Record<string, unknown>).reason) ?? traderWords((body as Record<string, unknown>).error) : null;
    return { ok: false, reason: said ?? (upstreamSaysMissing(got.status, body) ? noBars(input.symbol, input.timeframe) : DID_NOT_LOAD) };
  }
  return readFvgBarBody(body, input);
}
