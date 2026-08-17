"use client";
import * as React from "react";
import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";

/**
 * HeroTruth — the ONE dominant first-second message on /command-deck.
 *
 * Founder Aug-14 correction: "Right now determine what the Command Deck's
 * dominant first-second message should be from actual available canonical
 * data."
 *
 * Renders SYMBOL / TIMEFRAME / PRICE with a large truthful qualityState
 * verdict as the hero. Zero fabrication — when state is null the panel
 * says exactly that.
 *
 * 1/3/1 rule: this panel commits to the 1-second layer. STORY / DLAR /
 * DATA / WHY handle the 3s + drill-through layers.
 */

const QUALITY_STYLES: Record<
  "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "PROXY" | "REPLAY" | "UNAVAILABLE" | "UNKNOWN",
  { color: string; glyph: string; label: string; halo: string }
> = {
  LIVE:        { color: "#5cb85c", glyph: "●", label: "Live",         halo: "rgba(92,184,92,0.15)" },
  DELAYED:     { color: "#c9a55c", glyph: "◐", label: "Delayed",      halo: "rgba(201,165,92,0.15)" },
  STALE:       { color: "#c05a4a", glyph: "!", label: "Stale",        halo: "rgba(192,90,74,0.15)" },
  PARTIAL:     { color: "#c9a55c", glyph: "◐", label: "Partial",      halo: "rgba(201,165,92,0.10)" },
  PROXY:       { color: "#8a8271", glyph: "≈", label: "Proxy",        halo: "rgba(139,106,41,0.15)" },
  REPLAY:      { color: "#8a8271", glyph: "⟲", label: "Replay",       halo: "rgba(139,106,41,0.15)" },
  UNAVAILABLE: { color: "#55503f", glyph: "—", label: "Unavailable",  halo: "rgba(85,80,63,0.15)" },
  UNKNOWN:     { color: "#55503f", glyph: "?", label: "Not yet observed", halo: "rgba(85,80,63,0.15)" },
};

export interface HeroTruthProps {
  symbol: string;
  timeframe: string;
  state: CanonicalMarketState | null;
  /** Optional dominant one-second market verdict (e.g. 'BALANCE',
   *  'EXPANSION', 'UNKNOWN'). When absent, only the quality state
   *  badge is shown. Never fabricated — pass 'UNKNOWN' honestly
   *  when the underlying engine cannot resolve a chapter. */
  marketState?: string | null;
  marketStateResolution?: "RESOLVED" | "PARTIAL" | "UNKNOWN";
  className?: string;
}

function formatPrice(p: number): string {
  if (p >= 10_000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

export function HeroTruth({ symbol, timeframe, state, marketState, marketStateResolution, className }: HeroTruthProps) {
  const qualityKey: keyof typeof QUALITY_STYLES = state?.qualityState ?? "UNKNOWN";
  const style = QUALITY_STYLES[qualityKey];
  const price = state?.price.last ?? null;
  const eventAt = state?.price.eventAt ?? null;
  // Never call Date.now() during render — it produces different values
  // on SSR (server clock) vs client hydration (browser clock) → React
  // #418 hydration mismatch on every route that renders HeroTruth. If
  // capturedAt is missing, treat freshness as unknown; the CanonicalMarketState
  // consumer will supply capturedAt as soon as it has a snapshot.
  const capturedAt = state?.capturedAt ?? null;
  const freshnessMs = eventAt && capturedAt ? Math.max(0, capturedAt - eventAt) : null;

  return (
    <section
      role="banner"
      aria-label={`${symbol} ${timeframe} — market state ${style.label}`}
      className={["wm-hero-truth", className ?? ""].join(" ")}
      style={{
        border: `1px solid ${style.color}55`,
        borderRadius: 14,
        padding: "22px 24px",
        background: `linear-gradient(180deg, ${style.halo}, rgba(11,11,13,0.9))`,
        boxShadow: `0 0 60px -30px ${style.color}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
          Command Deck
        </span>
        <span style={{ fontSize: 10, color: "#55503f" }}>·</span>
        <span style={{ fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase", color: "#8a8271" }}>
          hero truth
        </span>
      </div>

      {/* MARKET STATE hero — the founder-defined one-second verdict.
          Renders when the Story engine has produced a chapter (RESOLVED
          or PARTIAL). When UNKNOWN, we still render honestly so the
          trader sees the system's genuine state — not a fabricated
          BALANCE. When the caller passes no marketState at all we skip
          this block entirely and let SYMBOL take the dominant role
          (the pre-Aug-16 behavior). */}
      {marketState && (
        <div style={{ marginBottom: 6, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              // Fluid across device classes: ~28px on a 390px phone, scaling to
              // 44px on desktop. Chapter names like TREND_EXPANSION /
              // OPENING_AUCTION overflowed a phone at a fixed 44px.
              fontSize: "clamp(26px, 7.5vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: 0.6,
              color:
                marketStateResolution === "UNKNOWN" ? "#55503f" :
                marketStateResolution === "PARTIAL" ? "#c9a55c" :
                                                       "#ede6d3",
              textTransform: "uppercase",
              fontWeight: 400,
              display: "inline-block",
              maxWidth: "100%",
              overflowWrap: "anywhere",
            }}
            aria-label={`Market state ${marketState}${marketStateResolution ? ` (${marketStateResolution.toLowerCase()})` : ""}`}
          >
            {marketState}
          </span>
          {marketStateResolution && marketStateResolution !== "RESOLVED" && (
            <span style={{ marginLeft: 10, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8271" }}>
              {marketStateResolution.toLowerCase()}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap", minWidth: 0 }}>
        <span
          style={{
            fontSize: "clamp(24px, 6vw, 32px)",
            fontWeight: 800,
            letterSpacing: 0.4,
            color: "#ede6d3",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {symbol}
        </span>
        <span
          style={{
            fontSize: 12,
            letterSpacing: 0.28,
            textTransform: "uppercase",
            color: "#8a8271",
            fontWeight: 700,
          }}
        >
          {timeframe}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden="true"
            style={{ color: style.color, fontSize: 18, fontWeight: 700 }}
          >
            {style.glyph}
          </span>
          <span
            style={{
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: style.color,
              fontWeight: 800,
            }}
          >
            {style.label}
          </span>
        </span>
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        {price != null ? (
          <span
            style={{
              fontSize: "clamp(40px, 12vw, 60px)",
              fontWeight: 400,
              color: "#ede6d3",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.02,
              letterSpacing: -0.5,
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: `0 2px 40px ${style.color}30`,
            }}
            aria-label={`Price ${price}`}
          >
            {formatPrice(price)}
          </span>
        ) : (
          <span
            style={{
              fontSize: "clamp(40px, 12vw, 60px)",
              fontWeight: 400,
              color: "#55503f",
              lineHeight: 1.02,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
            aria-label="Price not yet observed"
          >
            ?
          </span>
        )}
        {freshnessMs != null && (
          <span
            style={{
              fontSize: 10,
              color: "#8a8271",
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            price age {freshnessMs < 1000 ? `${freshnessMs}ms` : `${(freshnessMs / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Truth strip — what canonical evidence exists RIGHT NOW */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(139,106,41,0.2)", display: "flex", gap: 20, flexWrap: "wrap", fontSize: 10, color: "#8a8271", letterSpacing: 0.24 }}>
        <span>
          <span style={{ color: "#55503f" }}>session</span>{" "}
          <span style={{ color: "#ede6d3" }}>{state?.session ?? "unknown"}</span>
        </span>
        <span>
          <span style={{ color: "#55503f" }}>coverage</span>{" "}
          <span style={{ color: "#ede6d3" }}>{state?.coverage.length ?? 0} channel{state?.coverage.length === 1 ? "" : "s"}</span>
        </span>
        <span>
          <span style={{ color: "#55503f" }}>unknowns</span>{" "}
          <span style={{ color: "#c9a55c" }}>{state?.unknowns.length ?? 0}</span>
        </span>
        {state?.contradictions && state.contradictions.length > 0 && (
          <span>
            <span style={{ color: "#55503f" }}>contradictions</span>{" "}
            <span style={{ color: "#c05a4a" }}>{state.contradictions.length}</span>
          </span>
        )}
        {!state && (
          <span style={{ color: "#c9a55c", fontStyle: "italic" }}>
            Awaiting the first canonical observation — the deck is subscribed to {symbol} and will populate as ticks arrive.
          </span>
        )}
      </div>
    </section>
  );
}

export default HeroTruth;
