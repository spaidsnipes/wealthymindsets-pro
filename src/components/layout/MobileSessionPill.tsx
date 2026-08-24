"use client";

/**
 * MobileSessionPill — mobile-only session/state chip in the shell header.
 *
 * On ≤639px the full ticker tape is hidden (globals.css .wm-shell-ticker),
 * which silently removes the trader's primary "is the market alive right
 * now" signal from the phone header. That's Market-Truth-by-omission.
 *
 * This compact chip fills that gap with a canonical-owner read:
 *   · ACTIVE SYMBOL (from SymbolContext) — the room-shared identity.
 *   · TRADES observed for that symbol across all tape sources
 *     (sessionSymbolStore — same owner /nectar, /profile Nectar tab,
 *     and CommandContextRibbon consume; no duplicate identity).
 *   · A colored dot: green when live tape has fresh trades within the
 *     last 30s; amber when observed but stale; muted when nothing
 *     observed yet.
 *
 * Never fabricates a price. Never claims LIVE without evidence of a
 * recent trade for THIS symbol. Tap → /charts, the public market workspace.
 *
 * Desktop hides via CSS (>= 640px display: none) so nothing changes on
 * larger viewports — this is Mobile Realm surface, not shrunk desktop.
 */

import * as React from "react";
import Link from "next/link";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import {
  canonicalAssetClass,
  canonicalMarketStateIdentity,
  selectCanonicalFuturesSessionTruth,
} from "@/lib/marketData/canonicalIdentity";

const FRESH_WINDOW_MS = 30_000; // "live" = fresh trade within 30s

interface SymbolReading {
  hydrated: boolean;
  trades: number;
  channels: number;
  lastTradeMs: number | null;
}

function useActiveSymbolReading(symbol: string): SymbolReading {
  const [tick, force] = React.useReducer((n: number) => n + 1, 0);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true); }, []);
  React.useEffect(() => subscribeSessionSymbolStore(() => force()), []);
  // Also re-derive every 5s so the freshness dot ages honestly even
  // without a new tape event.
  React.useEffect(() => {
    const h = setInterval(() => force(), 5_000);
    return () => clearInterval(h);
  }, []);
  return React.useMemo(() => {
    if (!hydrated) return { hydrated: false, trades: 0, channels: 0, lastTradeMs: null };
    const upper = symbol.toUpperCase();
    const rows = getKnownSessionSymbols().filter(s => s.symbol.toUpperCase() === upper && s.slot.stats.tradeCount > 0);
    const trades = rows.reduce((sum, r) => sum + r.slot.stats.tradeCount, 0);
    // Real freshness now — lastTradeAtMs is the wall-clock ms of the
    // most recent trade recorded in that slot (added to the canonical
    // store this shift). Falls back to horizon start for slots that
    // hydrated from older persisted schema before the field existed.
    const lastTradeMs = rows.reduce<number | null>((acc, r) => {
      const t = r.slot.lastTradeAtMs
        ?? (r.slot.horizon?.startedAtSec != null ? r.slot.horizon.startedAtSec * 1000 : null);
      if (t == null) return acc;
      return acc == null ? t : Math.max(acc, t);
    }, null);
    return { hydrated: true, trades, channels: rows.length, lastTradeMs };
  }, [symbol, tick, hydrated]);
}

export function MobileSessionPill(): React.ReactElement | null {
  const { activeSymbol } = useActiveSymbol();
  const symbol = (activeSymbol || "").toUpperCase() || "TSLA";
  const reading = useActiveSymbolReading(symbol);

  // Canonical session identity — RTH / ETH / OVERNIGHT / CLOSED. Same
  // helper the Command Deck ribbon and every chart-state publisher uses;
  // never assemble literals.
  const identity = React.useMemo(
    () => canonicalMarketStateIdentity({ symbol, timeframe: "1m", extHours: false }),
    [symbol],
  );
  const session = identity.session.toUpperCase();

  if (!reading.hydrated) return null;

  const now = Date.now();
  const observed = reading.trades > 0;
  const fresh = observed && reading.lastTradeMs != null && now - reading.lastTradeMs < FRESH_WINDOW_MS;

  const dotColor = !observed ? "#8a8271" : fresh ? "#00E88A" : "#F5A623";
  const dotShadow = fresh ? "0 0 3px #00E88A" : "none";

  const status = !observed ? "no trades yet" : fresh ? "live tape" : "observed";
  const detail = observed
    ? `${reading.trades.toLocaleString("en-US")} trade${reading.trades === 1 ? "" : "s"} observed`
    : "browser-local memory empty";
  const assetClass = canonicalAssetClass(symbol);
  const futuresTruth = assetClass === "futures"
    ? selectCanonicalFuturesSessionTruth({
        instrumentId: identity.instrumentId,
        assetClass,
        requestedFilter: identity.session === "EXTENDED" ? "EXTENDED" : "RTH",
        observedActivityAt: reading.lastTradeMs,
        evaluatedAt: now,
      })
    : null;
  const sessionToken = futuresTruth ? "SESSION ?" : session;
  const accessibleStatus = futuresTruth
    ? `${futuresTruth.activity === "OBSERVED" ? "futures activity observed" : "futures activity unknown"}; session classification unknown`
    : `session ${session}, ${status}`;

  return (
    <Link
      href="/charts"
      aria-label={`${symbol} — ${accessibleStatus}, ${detail}. Open chart.`}
      title={`${symbol} · ${sessionToken}\n${accessibleStatus} — ${detail}`}
      className="wm-mobile-session-pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 32,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(139,106,41,0.35)",
        background: "rgba(212,175,55,0.06)",
        color: "#ede6d3",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        textDecoration: "none",
        textTransform: "uppercase",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: dotColor, boxShadow: dotShadow,
        }}
      />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{symbol}</span>
      <span
        style={{
          color: "#c9a55c",
          fontWeight: 500,
          letterSpacing: 0.3,
          fontSize: 8,
          padding: "1px 4px",
          borderRadius: 3,
          border: "1px solid rgba(201,165,92,0.32)",
          background: "rgba(201,165,92,0.06)",
          lineHeight: 1.1,
        }}
        aria-hidden="true"
      >
        {sessionToken}
      </span>
      {observed && (
        <span style={{ color: "#8a8271", fontWeight: 500, letterSpacing: 0.3 }}>
          · {reading.trades > 999 ? `${Math.round(reading.trades / 1000)}k` : reading.trades}
        </span>
      )}
    </Link>
  );
}

export default MobileSessionPill;
