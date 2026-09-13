"use client";

import * as React from "react";

import { formatOptionNumber } from "@/lib/optionCellFormat";
import { readOptionsResponse, optionContractObservationTiming, type OptionsSourceReceipt } from "@/lib/optionsChainRead";
import type { OptionContract } from "@/lib/optionContractResponse";
import {
  selectExpressionShortlist,
  shortlistJobLabel,
  type ShortlistJob,
  type ShortlistSlot,
} from "@/lib/expressionShortlist";

/**
 * DeckExpressionShortlist — Founder Build Order §5 Step 4 on the deck.
 *
 * ── Why this file exists ──────────────────────────────────────────────────────
 *
 * The Founder's CURRENT (Build Order 2026-09-12): "Gate 3 Option Expression
 * transformation slice on current main/local candidate. Trace the real current
 * option-data producer into canonical option truth and the attached browser
 * Option Expression consumer. Preserve provider/feed/entitlement/asOf/quote-role
 * truth end to end; render INDICATIVE as INDICATIVE and treat OPRA as current
 * ENTITLEMENT_BLOCKED."
 *
 * Alpaca's option-chain endpoint returned TSLA INDICATIVE snapshots with
 * BID/ASK/LAST/IV/Greeks on the Founder's fresh probe. OPRA was blocked. Until
 * this atom, no route in WM Pro consumed that INDICATIVE truth in the default
 * Founder scene — the whole /api/market-data/alpaca/options + normalizer +
 * receipt vocabulary chain existed, was tested, and had ONE consumer
 * (ChartsDashboard's OptionsChain panel on /charts). The default room had no
 * option in it at all.
 *
 * ── What this renders and does not ──────────────────────────────────────────
 *
 * Step 4 SHORTLIST: FAST / BALANCED / MORE TIME — three JOBS, never a BEST.
 * Each tile is a compact reference of the selected contract with the fields
 * §7 permits: quote roles BID/ASK/LAST + expiration + strike. Absence is
 * NAMED — a slot that has no honest contract to fill says which reason.
 * Fidelity is stated in words as "reference · INDICATIVE" — never wearing an
 * EXECUTABLE/LIVE-CERTIFIED costume (Founder §7/§8, Gate 3 law).
 *
 * ── What it does NOT do ─────────────────────────────────────────────────────
 *
 * - No prophecy: no BEST CONTRACT label anywhere (§8 ban).
 * - No green safe badges (§9 ban).
 * - No decision birth here — clicking a tile SELECTS the contract for
 *   attention; birthing the expression intent is downstream (OptionExpression
 *   Intent already exists and requires the whole permission-crossing chain).
 * - No modeled premium: the reference is what the provider printed, or the
 *   absence sentence.
 */

interface FetchState {
  readonly symbol: string;
  readonly kind: "IDLE" | "LOADING" | "READY" | "EMPTY" | "UNAVAILABLE";
  readonly chain?: readonly OptionContract[];
  readonly receipt?: OptionsSourceReceipt;
  readonly reason?: string;
}

export function hasReviewedOptionsReceipt(receipt: OptionsSourceReceipt): boolean {
  return receipt.source !== "unknown"
    && receipt.fidelity !== "UNKNOWN"
    && Boolean(receipt.providerPath)
    && Boolean(receipt.rightsPolicyId);
}

export interface DeckExpressionShortlistProps {
  /** The underlying — always the room, never the derivative. */
  readonly symbol: string;
  /** Spot from canonical market state, or null. */
  readonly spot: number | null;
  /**
   * Direction of the underlying thesis. When null, the shortlist collapses
   * to three "direction UNKNOWN" cells rather than picking a side.
   */
  readonly direction: "long" | "short" | null;
  /** Test-injectable fetch. Default = window.fetch. */
  readonly fetcher?: (url: string) => Promise<Response>;
  /** Called when the trader clicks a shortlisted tile. */
  readonly onSelect?: (slot: ShortlistSlot, receipt: OptionsSourceReceipt) => void;
}

export function DeckExpressionShortlist({
  symbol,
  spot,
  direction,
  fetcher,
  onSelect,
}: DeckExpressionShortlistProps): React.ReactElement {
  const [fetchedState, setState] = React.useState<FetchState>({ kind: "IDLE", symbol });
  // Fence the first render of a new underlying, before passive cleanup runs.
  const state: FetchState = fetchedState.symbol === symbol
    ? fetchedState : { kind: "LOADING", symbol };
  const [nowMs, setNowMs] = React.useState(Number.NaN);
  React.useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    setState({ kind: "LOADING", symbol });
    const url = `/api/market-data/alpaca/options?sym=${encodeURIComponent(symbol)}`;
    const doFetch = fetcher ?? ((u: string) => fetch(u, { cache: "no-store", credentials: "include" }));
    doFetch(url)
      .then(async (r) => {
        if (cancelled) return;
        const result = await readOptionsResponse(r, symbol);
        // A symbol change can happen while the response body is being read.
        if (cancelled) return;
        if (result.ok) {
          if (!hasReviewedOptionsReceipt(result.receipt)) {
            setState({ kind: "UNAVAILABLE", symbol, reason: "PROVENANCE UNKNOWN" });
            return;
          }
          setState({ kind: "READY", symbol, chain: result.contracts, receipt: result.receipt });
        } else {
          // The read owner classified the failure by edge; we surface the
          // edge string as the reason so the trader sees WHICH boundary
          // (AUTH BLOCKED, RATE LIMITED, INVALID RESPONSE, NO EVENTS…)
          // rather than a generic "unavailable."
          setState({ kind: "UNAVAILABLE", symbol, reason: result.failure.edge });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: "UNAVAILABLE", symbol, reason: "NETWORK ERROR" });
      });
    return () => { cancelled = true; };
  }, [symbol, fetcher]);

  const shortlist: readonly ShortlistSlot[] = React.useMemo(() => {
    if (state.kind !== "READY" || !state.chain) return [];
    return selectExpressionShortlist({ chain: state.chain, spot, direction });
  }, [state, spot, direction]);

  return (
    <section
      data-testid="deck-expression-shortlist"
      aria-label={`Option expression shortlist for ${symbol}`}
      style={{
        border: "1px solid rgba(139,106,41,0.25)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(11,11,13,0.55)",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          Expression · shortlist
        </span>
        <span style={{ fontSize: 9, letterSpacing: 0.3, color: "#8a8271" }}>
          {symbol} · {direction === null ? "direction UNKNOWN" : direction} · reference · {state.receipt?.fidelity ?? "UNKNOWN"}
        </span>
      </header>

      {state.kind === "LOADING" && (
        <div data-testid="deck-expression-loading"
             style={{ padding: 24, textAlign: "center", color: "#8a8271", fontSize: 11 }}>
          Reading Alpaca INDICATIVE chain…
        </div>
      )}

      {state.kind === "UNAVAILABLE" && (
        <div data-testid="deck-expression-unavailable"
             style={{ padding: 16, color: "#c05a4a", fontSize: 11, letterSpacing: 0.2 }}>
          Expression shortlist unavailable — {state.reason ?? "provider did not answer"}.
        </div>
      )}

      {state.kind === "IDLE" && (
        <div style={{ minHeight: 96 }} data-testid="deck-expression-idle" />
      )}

      {state.kind === "READY" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {shortlist.map((slot) => (
            <ShortlistTile
              key={slot.job}
              slot={slot}
              nowMs={nowMs}
              onClick={
                slot.contract && state.receipt && onSelect
                  ? () => onSelect?.(slot, state.receipt as OptionsSourceReceipt)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* A historical OPRA probe is not evidence of this request's failure. */}
      {state.kind === "READY" && (
        <p style={{ marginTop: 10, fontSize: 9, letterSpacing: 0.2, color: "#8a8271", lineHeight: 1.5 }}>
          Source {state.receipt?.source ?? "unknown"} · coverage {state.receipt?.coverage ?? "UNKNOWN"} · newest provider observation {state.receipt?.newestProviderTimestamp ?? "not observed"}.
          {" "}Reference only, not an executable fill. Each contract is a different job.
        </p>
      )}
    </section>
  );
}

/**
 * ShortlistTile — one JOB / one contract or one named absence.
 *
 * Rendering discipline: absence renders as an equal-sized tile with the same
 * job header and a reason sentence. A shortlist that quietly hides its empty
 * slots teaches the trader that "three tiles rendered" means "three
 * contracts existed," which is not always true. Silence at this size is the
 * failure mode.
 */
function ShortlistTile({ slot, onClick, nowMs }: { slot: ShortlistSlot; onClick?: () => void; nowMs: number }): React.ReactElement {
  const c = slot.contract;
  const timing = c ? optionContractObservationTiming(c, nowMs) : null;
  const label = shortlistJobLabel(slot.job);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!c || !onClick || !timing?.reviewable}
      data-testid={`shortlist-tile-${slot.job.toLowerCase()}`}
      style={{
        textAlign: "left",
        padding: 10,
        borderRadius: 8,
        border: "1px solid rgba(139,106,41,0.35)",
        background: c ? "rgba(11,11,13,0.75)" : "rgba(11,11,13,0.35)",
        color: c ? "#ede6d3" : "#8a8271",
        cursor: c && onClick ? "pointer" : "default",
        minHeight: 96,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
        {label}
      </span>
      {c ? (
        <>
          <span style={{ fontSize: 12, fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: 0.2 }}>
            {c.symbol} · {" "}
            {c.strike} {c.contractType.toUpperCase()} · {c.expirationDate}
          </span>
          <span style={{ fontSize: 9 }}>
            Quote {c.quoteTimestamp ?? "not observed"} · {timing?.quote.label} · {timing?.quote.timing}.
            {" "}Trade {c.tradeTimestamp ?? "not observed"} · {timing?.trade.label} · {timing?.trade.timing}.
          </span>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#8a8271", letterSpacing: 0.2 }}>
            bid {formatOptionNumber(c.bid ?? null, 2)} · ask {formatOptionNumber(c.ask ?? null, 2)} · last {formatOptionNumber(c.last ?? null, 2)}
          </span>
        </>
      ) : (
        <span style={{ fontSize: 10, fontStyle: "italic", color: "#8a8271" }}>
          {slot.reason}
        </span>
      )}
    </button>
  );
}

export default DeckExpressionShortlist;
