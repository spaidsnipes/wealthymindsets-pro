# WM-BROKER-QUOTE-P0-01 — Broker Quote Contract (M2)

**Bible §32 Broker & Execution Architecture.** **Adopted:** 2026-08-09.
**Status:** doc-only contract; implementation follows in a separate ticket.

## Problem

Two independent axes are currently entangled in `useWebSocket.ts`, `MainChart.tsx`, and the `/api/*/route.ts` proxies:

- **Instrument identity** — what is being priced (analytical vs executable symbol; futures continuous vs specific contract; crypto pair; equity ticker).
- **Provider** — who is telling us the price (Alpaca, Finnhub, Yahoo, Polygon, Coinbase, Binance, tastytrade, Tradovate, Kraken).

Symptoms: "same TSLA" showing three different prices across the same screen (WM-CHART live audit finding), silent provider substitution on `2m` (WM-CHART-P0-03), `NEXT_PUBLIC_*_KEY` leaks (WM-SEC-P0-03/05).

## Contract

Every quote (REST or WS) at the WM data boundary must be a `NormalizedQuote`:

```ts
type QualityState = "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "PROXY" | "REPLAY" | "UNAVAILABLE";
type AssetClass  = "equity" | "etf" | "future" | "option" | "crypto" | "forex" | "commodity" | "index";

interface NormalizedQuote {
  eventId:            string;   // ulid, monotonic per stream
  canonicalSymbol:    string;   // WM internal identity (e.g. "TSLA", "NQ1!", "BTC")
  providerSymbol:     string;   // provider-native identifier (e.g. "BINANCE:BTCUSDT")
  analyticalSymbol:   string;   // continuous / composite ("NQ1!")
  executableSymbol:   string | null; // specific contract if orderable ("NQZ26"); null if analytical only
  assetClass:         AssetClass;
  exchange:           string;   // MIC where possible (e.g. "XNAS", "CME")
  session:            "premarket" | "regular" | "postmarket" | "closed" | "24h";
  last:               number;
  bid:                number | null;
  ask:                number | null;
  mid:                number | null;
  previousClose:      number | null;
  change:             number | null;
  changePct:          number | null;
  eventTimestamp:     number;   // ms since epoch, provider-stamped
  receiveTimestamp:   number;   // ms since epoch, WM-stamped
  sequence:           number;   // per-stream monotonic
  sequenceState:      "in-order" | "gap" | "reordered";
  connectionState:    "connected" | "reconnecting" | "disconnected" | "degraded";
  qualityState:       QualityState;
  freshnessMs:        number;   // receiveTimestamp - eventTimestamp
  providerClass:      "primary" | "secondary" | "fallback" | "diagnostic";
  sourceProvenance:   {
    provider:   string;        // "alpaca" | "finnhub" | ... — INTERNAL only, never for UI
    endpoint:   string;        // exact URL / socket topic
    keyEnvVar:  string;        // e.g. "FINNHUB_KEY" (never the value)
  };
  replayState:        { active: false } | { active: true; tapeId: string; positionMs: number };
}
```

## Rules

1. **One normalizer per provider.** `src/lib/quotes/normalizers/<provider>.ts`. Every provider raw payload passes through exactly one normalizer; the rest of the app never sees the raw shape.
2. **Provider identity stays INTERNAL.** UI reads `qualityState` (`LIVE` / `DELAYED` / …), not `sourceProvenance.provider`. Only the Provenance Inspector (developer mode) reads `sourceProvenance`.
3. **Never silently substitute.** If a requested resolution is unavailable, return `qualityState: "UNAVAILABLE"` — never a different bar size with a matching label. WM-CHART-P0-03 makes this real for the interval layer.
4. **Provider fallback order is deterministic and disclosed.** Documented in `src/lib/quotes/fallbackOrder.ts` (equity: alpaca → finnhub → yahoo; futures: yahoo → tradovate; crypto: coinbase → binance.us → kraken).
5. **Analytical vs executable is a hard split.** A continuous futures symbol (`NQ1!`) is `analyticalSymbol` only; its `executableSymbol` is null. Order-ticket construction refuses to route an order to an `executableSymbol: null` symbol.

## Deliverables (this ticket = the contract only)

- `src/lib/quotes/types.ts` — the `NormalizedQuote` interface (from above).
- `src/lib/quotes/normalizers/index.ts` — normalizer registry.
- Per-provider normalizers: `alpaca.ts`, `finnhub.ts`, `yahoo.ts`, `polygon.ts`, `coinbase.ts`, `binance.ts`, `tradovate.ts`, `tastytrade.ts` — each ~150 lines including tests.
- `src/lib/quotes/fallbackOrder.ts` — dispatch order by asset class.
- Consumers migrated in a **separate follow-up** — WM-BROKER-QUOTE-P0-01-B. This ticket ships types + normalizers only, wired behind a feature flag `WM_QUOTE_V2` that defaults OFF until Sentinel signs off.

## Acceptance criteria

1. `tsc --noEmit` 0 errors after the types + normalizers land.
2. Every normalizer has a golden test with a captured live payload + the expected `NormalizedQuote` shape.
3. Sentinel spot-checks 5 payloads against the golden tests.
4. **No UI touches in this ticket.** The consumer migration ticket handles rollout.

## Doctrine alignment

- **JKD (Bible §4):** multiple providers absorbed, none copied; WM's `NormalizedQuote` is the composed truth.
- **KISS:** one interface, one normalizer per provider, one fallback list per class.
- **Truth:** silent substitution is the enemy; `qualityState: "UNAVAILABLE"` is a first-class citizen.
