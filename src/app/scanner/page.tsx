"use client";
// `strengthDisclosure` is deliberately NOT imported here. The page used to call
// it at two render sites with `as number` casts; the sentence is now emitted by
// `classifyScan` from the same branch that computes the grade, so the page only
// renders `r.disclosure`. Re-adding this import would re-open the cast door.
import { fetchYahooQuoteBody } from "@/lib/marketData/yahooQuoteRounds";

/**
 * Scanner — Real-time multi-filter market scanner
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, SlidersHorizontal, RefreshCw, TrendingUp, TrendingDown,
  Zap, AlertCircle, Bell, Star, BarChart2, Activity,
  Filter, ChevronDown, ChevronUp, Pause, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import WmWordmark from "@/components/brand/WmWordmark";
import { YahooCandleConsumer } from "@/lib/yahooCandleConsumer";
import { yahooQuoteObserved, yahooQuoteRefusal } from "@/lib/marketData/yahooQuoteObserved";
import { classifySymbol, isUnsupportedByEquityVendors } from "@/lib/marketData/symbolAssetClass";
import {
  compareScannerRsiIdentity, scannerRsiIdentity, scannerRsiIdentityDomToken,
  scannerRsiIdentityKey, type ScannerRsiIdentity,
} from "@/lib/scannerRequestIdentity";
import {
  lookupFailure, recordFailure,
  type RsiFailure, type RsiFailureCache,
} from "@/lib/scannerFailureCache";
import {
  classifyReportedFundamental,
  absentFundamental,
  preferKnownFundamental,
  type FundamentalFigure,
} from "@/lib/scanner/scannerFundamental";
import { scannerQuoteTruth, type ScannerQuoteQuality } from "@/lib/scannerQuoteTruth";

import {
  volumeMetricFact,
  volRatioMetricFact,
  rsiMetricFact,
  changePctMetricFact,
  type ScannerMetricFact,
} from "@/lib/scanner/scannerMetricFacts";

import { classifyScan, type AlertStrength, type Signal } from "@/lib/scannerSignalEvidence";
import { selectQuoteChange, type QuoteChangeAbsence } from "@/lib/quoteChange";

interface ScanResult {
  id: string; symbol: string; name: string;
  price: number;
  /** Null when the provider did not send it. A zero here would be a claim. */
  change: number | null; changePct: number | null;
  /* The NUMBERS, for sorting and filtering only. Nothing renders these
     directly: a cell that reads a nullable number has to invent a rendering
     for the null, and every such invention so far has been a bare glyph. The
     facts below are what the cells read. */
  volume: number | null; volRatio: number | null;
  /* What the Volume / Vol× / RSI cells SAY, and why — see
     src/lib/scanner/scannerMetricFacts.ts. */
  volumeFact: ScannerMetricFact;
  volRatioFact: ScannerMetricFact;
  rsiFact: ScannerMetricFact;
  /* What the Chg% cell SAYS, and why. `selectQuoteChange` distinguishes four
     reasons a change cannot be stated; both Chg% cells printed one `—` under
     the title "Percent change unavailable". */
  changePctFact: ScannerMetricFact;
  /** Null when the row could not be honestly classified. */
  signal: Signal | null; strength: AlertStrength | null;
  /** True when a required input was absent; `unratedReason` names which. */
  unrated: boolean; unratedReason: string;
  /**
   * The grade's own disclosure sentence, emitted by the classifier from the
   * same branch that computed `strength`. Null exactly when `strength` is.
   * The page does NOT rebuild it: it used to, from `r.changePct as number`,
   * which is an invariant owned by the classifier and asserted here with a
   * cast in between whose only job is to stop the compiler asking.
   */
  disclosure: string | null;
  /* NOT strings. A figure the provider did not carry is a different fact from
     one it carried, and neither may be written as a bare glyph — see
     src/lib/scanner/scannerFundamental.ts. */
  rsi: number | null; sector: string; float: FundamentalFigure; mktcap: FundamentalFigure;
  time: number; starred: boolean; alerted: boolean;
  rsiFailure: RsiFailure | null;
  quoteQuality: ScannerQuoteQuality;
  quoteReceivedAt: number;
}

type SortKey = "time" | "changePct" | "volRatio" | "rsi" | "strength";
type SortDir = "asc" | "desc";

const SIGNAL_META: Record<Signal, { label: string; color: string; icon: string }> = {
  "momentum-long":  { label:"Momentum Long",    color:"#00D4AA", icon:"🚀" },
  "momentum-short": { label:"Momentum Short",   color:"#FF4D6A", icon:"📉" },
  "breakout-bull":  { label:"Breakout ↑",       color:"#4FA3E0", icon:"⬆" },
  "breakout-bear":  { label:"Breakdown ↓",      color:"#FF4D6A", icon:"⬇" },
  "volume-surge":   { label:"Volume Surge",      color:"#F0B429", icon:"⚡" },
  "dark-pool":      { label:"Dark Pool Print",   color:"#8B5CF6", icon:"🌑" },
  "vwap-reclaim":   { label:"VWAP Reclaim",      color:"#00D4AA", icon:"🎯" },
  "gap-fill":       { label:"Gap Fill",          color:"#F0B429", icon:"↩" },
  "wyckoff-accum":  { label:"Wyckoff Accum.",    color:"#00D4AA", icon:"⚖" },
  "wyckoff-dist":   { label:"Wyckoff Dist.",     color:"#FF4D6A", icon:"⚖" },
  "cvd-div-bull":   { label:"CVD Divergence ↑",  color:"#4FA3E0", icon:"〰" },
  "cvd-div-bear":   { label:"CVD Divergence ↓",  color:"#FF4D6A", icon:"〰" },
  "options-flow":   { label:"Options Flow",      color:"#8B5CF6", icon:"💎" },
  "earnings-play":  { label:"Earnings Play",     color:"#F0B429", icon:"📊" },
  "fib-bounce":     { label:"Fib Bounce",        color:"#4FA3E0", icon:"🌀" },
  "supply-reject":  { label:"Supply Reject",     color:"#FF4D6A", icon:"⛔" },
};

const STRENGTH_COLOR: Record<AlertStrength, string> = {
  "A+":"#00D4AA","A":"#4FA3E0","B":"#F0B429","C":"#94A3B8",
};

const SIGNALS: Signal[] = [
  "momentum-long", "momentum-short", "breakout-bull", "breakout-bear",
  "volume-surge", "vwap-reclaim", "gap-fill", "fib-bounce", "supply-reject",
];
const SECTORS = ["Technology","Energy","Financials","Healthcare","Consumer","Industrials","Crypto","Futures","ETF"];
const STRENGTHS: AlertStrength[] = ["A+","A","B","C"];

const SYMS: [string,string][] = [
  ["NQ1!","Nasdaq Futures"],["ES1!","S&P 500 Futures"],["NVDA","NVIDIA"],
  ["TSLA","Tesla"],["AAPL","Apple"],["META","Meta"],["AMZN","Amazon"],
  ["MSFT","Microsoft"],["GOOG","Alphabet"],["AMD","Advanced Micro"],
  ["PLTR","Palantir"],["MSTR","MicroStrategy"],["COIN","Coinbase"],
  ["SMCI","Super Micro"],["ARM","Arm Holdings"],["RIVN","Rivian"],
  ["SOFI","SoFi Technologies"],["LCID","Lucid Motors"],["GME","GameStop"],
  ["AMC","AMC Entertainment"],["SOUN","SoundHound AI"],["AI","C3.ai"],
  ["IONQ","IonQ"],["QBTS","D-Wave Quantum"],["RGTI","Rigetti"],
  ["SPY","S&P 500 ETF"],["QQQ","Nasdaq 100 ETF"],["IWM","Russell 2000 ETF"],
  ["GLD","Gold ETF"],["TLT","20yr Treasury ETF"],
];

// Sector mapping for known symbols
const SYM_SECTOR: Record<string,string> = {
  "NVDA":"Technology","TSLA":"Consumer","AAPL":"Technology","META":"Technology",
  "AMZN":"Consumer","MSFT":"Technology","GOOG":"Technology","AMD":"Technology",
  "PLTR":"Technology","MSTR":"Financials","COIN":"Financials","SMCI":"Technology",
  "ARM":"Technology","RIVN":"Consumer","SOFI":"Financials","LCID":"Consumer",
  "GME":"Consumer","AMC":"Consumer","SOUN":"Technology","AI":"Technology",
  "IONQ":"Technology","QBTS":"Technology","RGTI":"Technology",
  "SPY":"ETF","QQQ":"ETF","IWM":"ETF","GLD":"ETF","TLT":"ETF",
  "NQ1!":"Futures","ES1!":"Futures",
};

// The signal ladder and the strength bucket both live in
// `@/lib/scannerSignalEvidence` now. They were duplicated here, and this copy
// could only be called with numbers, which is why the row builder below used
// to invent zeros in order to have something to pass.

// Fetch real quotes from Finnhub for scanner symbols (stocks only)
const SCANNER_STOCKS = SYMS.filter(([s]) => !isUnsupportedByEquityVendors(s)).map(([s]) => s);
// Futures symbols (Finnhub has no free futures quotes — use Yahoo via /api/yahoo)
const SCANNER_FUTURES = SYMS.filter(([s]) => classifySymbol(s) === "FUTURES").map(([s]) => s);

// Cache FMP profiles (mktcap, float) — changes slowly, cache 10 min.
/* The round carries the rows AND, when there are none, WHY there are none.
   `if (!res.ok) return map` used to drop the route's own diagnosis on the
   floor — a `—` written in control flow. See DEFECT THREE in
   @/lib/scanner/scannerFundamental. */
type FmpProfileRound = {
  readonly rows: Map<string, { mktcap: FundamentalFigure; float: FundamentalFigure }>;
  /** Non-null when the provider route said it is NOT CONFIGURED; names what it said was missing. */
  readonly notConfigured: readonly string[] | null;
};
let fmpProfileCache: FmpProfileRound | null = null;
let fmpProfileCacheTs = 0;

async function fetchFmpProfiles(): Promise<FmpProfileRound> {
  if (fmpProfileCache && Date.now() - fmpProfileCacheTs < 600_000) return fmpProfileCache;
  const map = new Map<string, { mktcap: FundamentalFigure; float: FundamentalFigure }>();
  let notConfigured: readonly string[] | null = null;
  try {
    const syms = SCANNER_STOCKS.join(",");
    const res  = await fetch(`/api/fmp?path=/v3/profile/${encodeURIComponent(syms)}`);
    if (!res.ok) {
      // THE ROUTE ALREADY KNOWS. It answers 503 with
      // `{ edge: "NOT CONFIGURED", missing: [...] }`, and throwing that away
      // left the tiles saying "not retrieved in this scan" — true, but vaguer
      // than what WM holds, and implying a next scan might fill the gap.
      try {
        const body = await res.json();
        if (body?.edge === "NOT CONFIGURED") {
          notConfigured = Array.isArray(body.missing)
            ? body.missing.filter((m: unknown): m is string => typeof m === "string")
            : [];
        }
      } catch {}
      const refused: FmpProfileRound = { rows: map, notConfigured };
      fmpProfileCache = refused;
      fmpProfileCacheTs = Date.now();
      return refused;
    }
    const data = await res.json();
    const arr: Array<{ symbol: string; mktCap?: number; floatShares?: number }> = Array.isArray(data) ? data : [];
    for (const p of arr) {
      // The row EXISTS, so anything missing here is NOT_REPORTED — a statement
      // about the provider's payload, not about WM never having asked. The `??
      // 0` that used to stand in front of this test was itself a sentinel, and
      // it erased the difference.
      map.set(p.symbol, {
        mktcap: classifyReportedFundamental(p.mktCap, "Market cap", p.symbol),
        float: classifyReportedFundamental(p.floatShares, "Float", p.symbol),
      });
    }
  } catch {}
  const round: FmpProfileRound = { rows: map, notConfigured };
  fmpProfileCache = round;
  fmpProfileCacheTs = Date.now();
  return round;
}

// Cache RSI per symbol — recomputed every 5 min. The failure cache (canonical
// identity key + 15m TTL) lives in @/lib/scannerFailureCache — WM-SCANNER-RECONCILE-01.
const rsiCache = new Map<string, { rsi: number; ts: number }>();

type RsiResult = Readonly<{ rsi: number | null; failure: RsiFailure | null }>;

async function fetchRSI(
  identity: ScannerRsiIdentity,
  consumer: YahooCandleConsumer,
  failures: RsiFailureCache,
  explicitRetry = false,
): Promise<RsiResult> {
  const key = scannerRsiIdentityKey(identity);
  // TTL-aware lookup: a cached failure only suppresses the fetch while current;
  // once the 15m TTL lapses it is evicted and one more attempt is allowed.
  const failed = explicitRetry ? null : lookupFailure(failures, key);
  if (failed) return { rsi: null, failure: failed };
  const cached = rsiCache.get(identity.symbol);
  if (cached && Date.now() - cached.ts < 300_000 && !explicitRetry) return { rsi: cached.rsi, failure: null };
  try {
    const outcome = await consumer.request({
      symbol: identity.symbol,
      timeframe: identity.timeframe,
      bars: identity.bars,
      automaticRetry: false,
    });
    if (outcome.status !== "ready") {
      if (!outcome.retryable) {
        /* The fallback used to be the string "RSI unavailable", which is a
           restatement of the dash promoted into the failure CACHE — the one
           place whose entire job is to hold a reason. When the consumer
           declines without a message, say that, and say it is not retryable. */
        const failure = recordFailure(
          failures,
          key,
          identity,
          outcome.message ||
            `The daily-candle consumer declined the request for ${identity.symbol} and gave no message, and marked the outcome as not retryable.`,
        );
        return { rsi: null, failure };
      }
      return { rsi: null, failure: null };
    }
    const closes = outcome.candles.map(bar => bar.close);
    if (closes.length < 15) {
      const failure = recordFailure(failures, key, identity, "Not enough daily bars for RSI 14");
      return { rsi: null, failure };
    }
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change >= 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rsi = avgLoss === 0 ? 100 : Math.round(100 - (100 / (1 + avgGain / avgLoss)));
    failures.delete(key);
    rsiCache.set(identity.symbol, { rsi, ts: Date.now() });
    return { rsi, failure: null };
  } catch {
    return { rsi: null, failure: null };
  }
}

/**
 * `change` / `changePct` are NULLABLE, and that is the whole point. The shape
 * used to be `number`, so the producer below had nowhere to put "the provider
 * sent no previous close" and wrote a zero instead — which `buildResults`,
 * `ChangeMeter` and `classifyScan` then all faithfully handled as a REAL flat
 * session, because by the time they saw it, it was one.
 */
interface QuoteData { price:number; change:number|null; changePct:number|null;
  /* WHICH of `selectQuoteChange`'s four refusals produced the null above. Null
     when the change WAS observed. Carrying it is the difference between a cell
     that says "Percent change unavailable" — a restatement of the dash — and one
     that says which of four different things happened. */
  changeAbsence:QuoteChangeAbsence|null;
  volume:number; avgVolume:number; rsi:number|null; rsiFailure:RsiFailure|null; receivedAt:number }

/**
 * A scan is a COMPLETENESS claim, so it must carry its own denominator.
 *
 * MEASURED on /scanner 2026-09-07: the header read "28 delayed-quote
 * signals" against a 30-symbol universe. The two absent symbols were NQ1!
 * and ES1! — the only two futures in the universe — and they were absent
 * because `/api/yahoo` answered for both and WM declined to certify the
 * answers ("a day/meta close must not be presented as a live observation").
 *
 * The gate is right. What was wrong is that the refusal left no trace: a
 * count with no denominator reads as "I scanned and found 28", when the
 * truth is "I could not certify 2 of 30, and found 28 among the rest".
 * §H19 — a number on screen needs a producer the trader can interrogate.
 */
interface ScannerQuoteRound {
  quotes: Map<string, QuoteData>;
  /** symbol → the provider's own reason, from the one owner of that fact. */
  refusals: Map<string, string>;
  /** How many symbols the round actually asked about. */
  attempted: number;
}

async function fetchScannerQuotes(consumer: YahooCandleConsumer, failures: RsiFailureCache): Promise<ScannerQuoteRound> {
  const results = new Map<string, QuoteData>();
  const refusals = new Map<string, string>();
  // Use the app's server-side Yahoo proxy for real pre/post-market price and
  // actual intraday volume. No client-side vendor key and no fabricated volume.
  const scannerSymbols = [...SCANNER_STOCKS, ...SCANNER_FUTURES];
  const BATCH = 6;
  for (let i = 0; i < scannerSymbols.length; i += BATCH) {
    const batch = scannerSymbols.slice(i, i + BATCH);
    await Promise.all(batch.map(async sym => {
      try {
        const identity = scannerRsiIdentity(sym);
        const [quoteJson, rsiResult] = await Promise.all([
          fetchYahooQuoteBody(sym) as Promise<any>,
          fetchRSI(identity, consumer, failures),
        ]);
        const price = quoteJson?.price ?? 0;
        // SF-D01 consumer gate — shared predicate. A scanner row for a
        // symbol Yahoo could not observe is stale-noise, not a scan hit.
        if (price > 0 && yahooQuoteObserved(quoteJson)) {
          // This line used to read `const prev = quoteJson?.prevClose ?? price`,
          // which made `change` exactly 0 and `changePct` exactly 0 for any
          // symbol without a real prior close — and the scan ladder GRADED
          // that zero, presenting an unobserved symbol as a named setup with
          // a letter grade. The canonical owner refuses instead, and honors
          // the route's own `ohlcObservation.prevClose` fallback flag.
          const resolved = selectQuoteChange({
            price,
            prevClose: quoteJson?.prevClose,
            prevCloseObserved: quoteJson?.ohlcObservation?.prevClose,
          });
          const change    = resolved.observed ? +resolved.chg.toFixed(2) : null;
          const changePct = resolved.observed ? +resolved.pct.toFixed(2) : null;
          /* The owner knows WHICH of four refusals it just made. Keep it. */
          const changeAbsence = resolved.observed ? null : resolved.absence;
          const volume = Number(quoteJson?.volume ?? 0);
          const avgVolume = Number(quoteJson?.avgVolume ?? 0);
          const receivedAt = Number(quoteJson?.ts);
          results.set(sym, { price, change, changePct, changeAbsence, volume, avgVolume, rsi: rsiResult.rsi, rsiFailure: rsiResult.failure, receivedAt });
        } else {
          // Same owner the ticker tape reads — the reason is not re-derived
          // here, so the two surfaces cannot come to disagree about WHY a
          // symbol is missing.
          const refusal = yahooQuoteRefusal(quoteJson);
          if (refusal) refusals.set(sym, refusal);
        }
      } catch {}
    }));
    if (i + BATCH < scannerSymbols.length) await new Promise(r => setTimeout(r, 120));
  }
  return { quotes: results, refusals, attempted: scannerSymbols.length };
}

function buildResults(
  quotes: Map<string, QuoteData>,
  profiles: FmpProfileRound,
  prev: ScanResult[],
): ScanResult[] {
  const prevMap = new Map(prev.map(r => [r.symbol, r]));
  let starredSet = new Set<string>();
  let alertedSet = new Set<string>();
  try {
    starredSet = new Set(JSON.parse(localStorage.getItem("wm_scanner_starred") || "[]") as string[]);
    alertedSet = new Set(JSON.parse(localStorage.getItem("wm_scanner_alerted") || "[]") as string[]);
  } catch {}
  return SYMS.map(([sym, name], i) => {
    const q   = quotes.get(sym);
    const old = prevMap.get(sym);
    const prf = profiles.rows.get(sym);
    // Skip symbols that never resolved to a real price — never show a fake placeholder.
    const realPrice = q?.price ?? old?.price;
    if (realPrice == null || realPrice <= 0) return null;
    const price     = realPrice;
    // An absent reading stays absent. It used to become 0, which the signal
    // ladder read as a flat market and graded "Gap Fill / C".
    // When THIS round observed the symbol, its answer stands alone. Falling
    // through to `old` would pair a PREVIOUS round's change with the CURRENT
    // price while `quoteTruth` (computed from `!q`) still reports the row as
    // freshly observed. The old shape could never reach this branch, because
    // `q.change` was always a number — the `?? old` was dead code that came
    // alive the moment absence became representable.
    const change    = q ? q.change    : old?.change    ?? null;
    const changePct = q ? q.changePct : old?.changePct ?? null;
    /* `selectQuoteChange` named WHICH of its four refusals it made; keep the
       name attached to the null. When this round did not observe the symbol at
       all, the previous round's FACT is carried whole rather than rebuilt —
       rebuilding it here from a `changePct` whose reason has been dropped is
       how "Percent change unavailable" got written in the first place. */
    const changePctFact = q
      ? changePctMetricFact(changePct, q.changeAbsence, sym)
      : old?.changePctFact ?? changePctMetricFact(null, null, sym);
    const volume    = q?.volume    ?? old?.volume    ?? null;
    const avgVol    = q?.avgVolume ?? null;
    /* The quotient and the THREE reasons it may not exist are now decided in
       one place. `avgVol > 0` was right — dividing by zero yields no ratio at
       all — but as a guard it collapsed "no numerator", "no denominator" and
       "a denominator of zero" into a single null, and one `—` printed all
       three. See DEFECT THREE in @/lib/scanner/scannerMetricFacts. */
    const volRatioFact = volRatioMetricFact(volume, avgVol, sym);
    const volRatio  = volRatioFact.value;
    // Real RSI from Finnhub indicator API; fall back to old cached value if available
    const rsi = q?.rsi ?? old?.rsi ?? null;
    /* `fetchRSI` already recorded a SENTENCE for a non-retryable failure. It
       used to reach a `role="status"` block and nothing else, while the cells
       that show the number printed `—` under the title "RSI unavailable" —
       a restatement of the dash. Carry the sentence to the cell. */
    const rsiFailure = q ? q.rsiFailure : old?.rsiFailure ?? null;
    const rsiFact = rsiMetricFact(rsi, rsiFailure ? rsiFailure.reason : null, sym);
    const quoteReceivedAt = q?.receivedAt ?? old?.quoteReceivedAt ?? 0;
    const quoteTruth = scannerQuoteTruth({ receivedAt: quoteReceivedAt, reusedPrevious: !q });
    const cls = classifyScan({ changePct, volRatio, rsi });
    return {
      id:        sym + "-" + i,
      symbol:    sym,
      name,
      price:     +price.toFixed(2),
      change:    change    == null ? null : +change.toFixed(2),
      changePct: changePct == null ? null : +changePct.toFixed(2),
      volume,
      volRatio,
      volumeFact: volumeMetricFact(volume, sym),
      volRatioFact,
      rsiFact,
      changePctFact,
      signal:    cls.signal,
      strength:  cls.strength,
      unrated:   cls.unrated,
      unratedReason: cls.reason,
      disclosure: cls.disclosure,
      rsi,
      rsiFailure,
      quoteQuality: quoteTruth.quality,
      quoteReceivedAt,
      sector:    SYM_SECTOR[sym] ?? "Technology",
      /* Real float + mktcap from the FMP profile, falling back to the previous
         scan. THIS USED TO BE `prf?.float ?? old?.float ?? "—"` AND THE
         FALLBACK COULD NEVER FIRE: `prf.float` was already the string "—" when
         the provider reported nothing, and "—" is neither null nor undefined,
         so the glyph satisfied the coalesce and shadowed a figure WM had
         genuinely measured. Only a MEASURED value may displace a MEASURED
         value — that rule now lives in the owner, where it cannot be rewritten
         back into a `??` chain by accident. */
      /* AND when there is no row, WM says WHICH KIND of nothing it has. The
         provider route's own NOT CONFIGURED diagnosis outranks "not retrieved
         in this scan", because it is permanent — no later scan will fill it. */
      float:     preferKnownFundamental(prf?.float  ?? absentFundamental("Float", sym, profiles.notConfigured),      old?.float),
      mktcap:    preferKnownFundamental(prf?.mktcap ?? absentFundamental("Market cap", sym, profiles.notConfigured), old?.mktcap),
      time:      Date.now(),
      starred:   starredSet.has(sym) ?? old?.starred ?? false,
      alerted:   alertedSet.has(sym) ?? old?.alerted ?? false,
    };
  }).filter((r): r is ScanResult => r !== null);
}

const PRESETS = [
  { id:"hot",      label:"🔥 Hot Movers",   sigs:["momentum-long","breakout-bull","volume-surge"] as Signal[] },
  { id:"volume",   label:"⚡ Real Volume",   sigs:["volume-surge"] as Signal[] },
  { id:"reclaim",  label:"🎯 Reclaims",      sigs:["vwap-reclaim","fib-bounce"] as Signal[] },
  { id:"short",    label:"🩸 Shorts",        sigs:["momentum-short","breakout-bear","supply-reject"] as Signal[] },
  { id:"range",    label:"↩ Range / Gap",    sigs:["gap-fill","fib-bounce","supply-reject"] as Signal[] },
  { id:"all",      label:"📋 All",           sigs:SIGNALS },
];

/*
   The empty track used to carry a title that only restated its own emptiness.
   The meter is fed by the same fact the cell above it states, so it carries the
   same sentence: an empty track whose tooltip says WHICH of four refusals
   emptied it is a different object from one that says "unavailable".
*/
function ChangeMeter({ changePct, fact }: { changePct: number | null; fact: ScannerMetricFact }) {
  // An unmeasured move is not a move of zero. A zero-width bar centred on the
  // midline reads as "flat", so the meter renders an empty track instead.
  if (changePct == null) {
    return (
      <div
        className="relative h-3 w-[86px] rounded-full bg-wm-surface overflow-hidden opacity-40"
        title={fact.reason}
        aria-label={`No session-change meter: ${fact.text}. ${fact.reason}`}
      >
        <div className="absolute left-1/2 inset-y-0 w-px bg-wm-border" />
      </div>
    );
  }
  const magnitude = Math.min(100, Math.abs(changePct) * 18);
  const up = changePct >= 0;
  return (
    <div className="relative h-3 w-[86px] rounded-full bg-wm-surface overflow-hidden" title="Real percentage move">
      <div className="absolute left-1/2 inset-y-0 w-px bg-wm-border" />
      <div className="absolute inset-y-0 rounded-full transition-all duration-300"
        style={{
          width: `${magnitude / 2}%`,
          left: up ? "50%" : `${50 - magnitude / 2}%`,
          background: up ? "#00D4AA" : "#FF4D6A",
          boxShadow: `0 0 7px ${up ? "rgba(0,212,170,.35)" : "rgba(255,77,106,.35)"}`,
        }}
      />
    </div>
  );
}

export default function ScannerPage() {
  const router = useRouter();
  const { setActiveSymbol } = useActiveSymbol();
  const [results,       setResults]       = useState<ScanResult[]>([]);
  // What the last round ASKED and what it was refused. Held separately from
  // `results` because a refused symbol is not a result — it is the reason a
  // result is missing, and the header needs both to state a denominator.
  const [round,         setRound]         = useState<ScannerQuoteRound | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [preset,        setPreset]        = useState("all");
  const [sortKey,       setSortKey]       = useState<SortKey>("time");
  const [sortDir,       setSortDir]       = useState<SortDir>("desc");
  const [live,          setLive]          = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState<number | null>(null);
  const [selected,      setSelected]      = useState<ScanResult | null>(null);
  const [filterOpen,    setFilterOpen]    = useState(true);
  const [activeSignals, setActiveSignals] = useState<Signal[]>(SIGNALS);
  const [minVol,        setMinVol]        = useState(0);
  const [minPct,        setMinPct]        = useState(0);
  const [selSectors,    setSelSectors]    = useState<string[]>([]);
  const [selectedRsiIdentityKey, setSelectedRsiIdentityKey] = useState("");
  const [retryingRsiKey, setRetryingRsiKey] = useState<string | null>(null);
  const [updatedRsiKeys, setUpdatedRsiKeys] = useState<Set<string>>(() => new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const yahooConsumerRef = useRef<YahooCandleConsumer | null>(null);
  const rsiFailuresRef = useRef<RsiFailureCache>(new Map());
  const rsiRetryInFlightRef = useRef<Set<string>>(new Set());
  const rsiRetryButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rsiStatusRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  if (!yahooConsumerRef.current) {
    yahooConsumerRef.current = new YahooCandleConsumer({ fetcher: (input, init) => fetch(input, init) });
  }

  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setFilterOpen(false);
  }, []);

  const applyPreset = (id: string) => {
    setPreset(id);
    const p = PRESETS.find(x => x.id === id);
    if (p) setActiveSignals(p.sigs);
  };

  // Initial load + periodic refresh — real Finnhub quotes + RSI, real FMP profiles
  const refresh = useCallback(async (explicitRetry = false) => {
    if (explicitRetry) rsiFailuresRef.current.clear();
    try {
      const [round, profiles] = await Promise.all([
        fetchScannerQuotes(yahooConsumerRef.current!, rsiFailuresRef.current),
        fetchFmpProfiles(),
      ]);
      setRound(round);
      setResults(prev => buildResults(round.quotes, profiles, prev));
      setLastRefresh(Date.now());
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  const retryFailedRsi = useCallback(async (identity: ScannerRsiIdentity) => {
    const key = scannerRsiIdentityKey(identity);
    if (rsiRetryInFlightRef.current.has(key)) return;
    rsiRetryInFlightRef.current.add(key);
    const previousFailure = rsiFailuresRef.current.get(key) ?? null;
    setUpdatedRsiKeys(previous => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
    setRetryingRsiKey(key);
    let failureRemains = false;
    try {
      const outcome = await fetchRSI(identity, yahooConsumerRef.current!, rsiFailuresRef.current, true);
      // A retryable transport failure has no newly cached failure and no RSI.
      // Keep the prior truthful failure visible; never announce "updated" when
      // the retry returned no value.
      const currentFailure = outcome.failure ?? (outcome.rsi === null ? previousFailure : null);
      failureRemains = currentFailure !== null;
      setResults(previous => previous.map(row => row.symbol === identity.symbol
        ? { ...row, rsi: outcome.rsi, rsiFailure: currentFailure, time: Date.now() }
        : row));
      if (outcome.rsi !== null) {
        setUpdatedRsiKeys(previous => new Set(previous).add(key));
      }
    } finally {
      rsiRetryInFlightRef.current.delete(key);
      setRetryingRsiKey(null);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (failureRemains) rsiRetryButtonRefs.current.get(key)?.focus();
        else rsiStatusRefs.current.get(key)?.focus();
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!live) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    // Refresh every 30s with real data
    intervalRef.current = setInterval(refresh, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live, refresh]);

  const toggleStar = (id: string) => {
    setResults(p => {
      const next = p.map(r => r.id === id ? { ...r, starred: !r.starred } : r);
      const starred = new Set(next.filter(r => r.starred).map(r => r.symbol));
      try { localStorage.setItem("wm_scanner_starred", JSON.stringify([...starred])); } catch {}
      return next;
    });
  };
  const toggleAlert = (id: string) => {
    setResults(p => {
      const next = p.map(r => r.id === id ? { ...r, alerted: !r.alerted } : r);
      const alerted = new Set(next.filter(r => r.alerted).map(r => r.symbol));
      try { localStorage.setItem("wm_scanner_alerted", JSON.stringify([...alerted])); } catch {}
      return next;
    });
  };
  const toggleSig   = (s: Signal) => setActiveSignals(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleSec   = (s: string) => setSelSectors(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const sortToggle = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  // An UNRATED row cannot be tested against a signal or a threshold — the
  // provider never sent the inputs those filters read. Silently dropping it
  // would hide a real symbol at a real price; silently keeping it under a
  // narrowed filter would claim it matched. So it survives the default view
  // (where the trader has narrowed nothing) and is excluded only once the
  // trader deliberately asks for a subset it cannot be shown to belong to.
  const signalFilterNarrowed = activeSignals.length < SIGNALS.length;
  const thresholdNarrowed = minVol > 0 || minPct > 0;
  const unratedHidden = signalFilterNarrowed || thresholdNarrowed;

  const filtered = results
    .filter(r =>
      (!search || r.symbol.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase())) &&
      (r.unrated
        ? !unratedHidden
        : activeSignals.includes(r.signal as Signal) &&
          (r.volRatio ?? 0) >= minVol &&
          Math.abs(r.changePct ?? 0) >= minPct) &&
      (selSectors.length === 0 || selSectors.includes(r.sector))
    )
    .sort((a, b) => {
      const ord = {"A+":4,"A":3,"B":2,"C":1};
      // An unrated row has no grade and no measured value. It sorts LAST in
      // either direction rather than pretending to be a zero or a minimum.
      const rank = (r: ScanResult) =>
        sortKey === "strength"
          ? (r.strength == null ? null : ord[r.strength])
          : ((r as unknown as Record<string, number | null | undefined>)[sortKey] ?? null);
      const av = rank(a), bv = rank(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === "desc" ? bv - av : av - bv;
    });

  const failedRsiIdentities = filtered
    .flatMap(row => row.rsiFailure ? [row.rsiFailure.identity] : [])
    .sort(compareScannerRsiIdentity);

  // Counted over OBSERVED changes only. A row whose change was never sent is
  // neither bullish nor bearish, and counting it as either would be inventing
  // a direction out of a gap in the data.
  const bullCount = filtered.filter(r => r.changePct != null && r.changePct > 0).length;
  const bearCount = filtered.filter(r => r.changePct != null && r.changePct < 0).length;
  const unratedCount = filtered.filter(r => r.unrated).length;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === "desc" ? <ChevronDown size={10}/> : <ChevronUp size={10}/>)
      : <ChevronDown size={10} className="opacity-30"/>;

  return (
    <div style={{ display:"flex",flexDirection:"column",width:"100%",height:"100%",overflow:"hidden" }} className="bg-wm-black">

      {/* Header — WM brand strip + serif scanner title */}
      <div className="wm-scanner-header flex items-center gap-3 px-4 border-b border-wm-border bg-wm-dark shrink-0" style={{ minHeight:44 }}>
        <WmWordmark size="compact" subtitle="MARKET SCAN" />
        <div style={{ height: 18, width: 1, background: "rgba(139,106,41,0.3)", margin: "0 4px" }} aria-hidden="true" />
        <Zap size={15} className="text-wm-gold shrink-0"/>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, fontWeight: 400, color: "#ede6d3" }}>Scanner</h1>
        <div className="wm-scanner-stats flex items-center gap-3 ml-2">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-wm-gold"/>
            {/* An unrated row is a row, not a signal. It is counted apart so
                the headline number never absorbs rows nothing was read for. */}
            <span className="text-wm-text-muted">{filtered.length - unratedCount} delayed-quote signals</span>
          </div>
          <span className="wm-scanner-breadth text-[10px] text-wm-green font-bold">{bullCount}▲</span>
          <span className="wm-scanner-breadth text-[10px] text-wm-red font-bold">{bearCount}▼</span>
          {unratedCount > 0 && (
            <span
              className="wm-scanner-breadth text-[10px] text-wm-text-dim font-bold"
              title="Symbols showing a real price whose percent change or volume the provider did not send. They are listed, but not classified or graded."
            >
              {unratedCount} unrated
            </span>
          )}
        </div>
        <div className="wm-scanner-presets flex items-center gap-1 ml-2 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className={clsx("whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                preset===p.id ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40" : "text-wm-text-muted border-transparent hover:border-wm-border hover:text-wm-text"
              )}>{p.label}</button>
          ))}
        </div>
        <div className="wm-scanner-actions ml-auto flex items-center gap-2">
          <div className="wm-scanner-search flex items-center gap-1.5 bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1">
            <Search size={11} className="text-wm-text-muted"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Symbol..."
              className="bg-transparent text-xs text-wm-text outline-none w-24 placeholder-wm-text-dim"/>
          </div>
          <button onClick={() => setFilterOpen(v => !v)}
            className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all",
              filterOpen ? "bg-wm-blue/15 text-wm-blue border-wm-blue/40" : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
            <SlidersHorizontal size={11}/> Filters
          </button>
          <button onClick={() => setLive(v => !v)}
            title="Controls automatic refresh cadence; it does not certify every row as real-time."
            className={clsx("wm-scanner-mobile-secondary flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border font-bold transition-all",
              live ? "bg-wm-blue/15 text-wm-blue border-wm-blue/40" : "text-wm-text-muted border-wm-border")}>
            {live ? <><Activity size={11}/> AUTO 30s</> : <><Pause size={11}/> Paused</>}
          </button>
          {failedRsiIdentities.length > 0 && (
            <label htmlFor="scanner-request-identity" className="wm-scanner-mobile-secondary flex items-center gap-1.5 text-[10px] text-wm-text-muted">
              <span className="sr-only">Scanner request identity</span>
              <select
                id="scanner-request-identity"
                aria-label="Scanner request identity"
                value={failedRsiIdentities.some(identity => scannerRsiIdentityKey(identity) === selectedRsiIdentityKey)
                  ? selectedRsiIdentityKey
                  : scannerRsiIdentityKey(failedRsiIdentities[0])}
                onChange={event => setSelectedRsiIdentityKey(event.target.value)}
                className="max-w-44 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-[10px] text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-blue"
              >
                {failedRsiIdentities.map(identity => (
                  <option key={scannerRsiIdentityKey(identity)} value={scannerRsiIdentityKey(identity)}>
                    {identity.symbol} · D / 40 bars / RSI 14
                  </option>
                ))}
              </select>
            </label>
          )}
          <button onClick={() => { void refresh(true); }}
            aria-label="Refresh scanner quotes"
            title="Refresh scanner quotes"
            className="wm-scanner-mobile-secondary p-1.5 rounded-lg text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border border-wm-border transition-colors">
            <RefreshCw size={12}/>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="wm-scanner-body" style={{ flex:1,display:"flex",overflow:"hidden",minHeight:0 }}>

        {/* Filter panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div initial={{ width:0,opacity:0 }} animate={{ width:200,opacity:1 }} exit={{ width:0,opacity:0 }}
              className="wm-scanner-filters overflow-hidden shrink-0 border-r border-wm-border bg-wm-dark flex flex-col">
              <div className="px-3 py-2 border-b border-wm-border text-[9px] font-bold text-wm-text-dim uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={11} className="text-wm-blue"/> Filters
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4" style={{ scrollbarWidth:"thin" }}>
                <div>
                  <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-2">Signal Type</div>
                  <div className="space-y-0.5">
                    {SIGNALS.map(sig => {
                      const m = SIGNAL_META[sig];
                      const on = activeSignals.includes(sig);
                      return (
                        <button key={sig} onClick={() => toggleSig(sig)}
                          className={clsx("w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all",
                            on ? "bg-wm-surface text-wm-text" : "text-wm-text-dim hover:text-wm-text hover:bg-wm-surface/50")}>
                          <span style={{ color:on ? m.color : undefined }}>{m.icon}</span>
                          <span className="truncate">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-wm-text-dim uppercase tracking-wider">Min Vol Ratio</span>
                    <span className="text-wm-gold font-mono font-bold">{minVol}×</span>
                  </div>
                  <input type="range" min={1} max={10} step={0.5} value={minVol} onChange={e => setMinVol(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor:"#F0B429" }}/>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-wm-text-dim uppercase tracking-wider">Min |Change|%</span>
                    <span className="text-wm-blue font-mono font-bold">{minPct}%</span>
                  </div>
                  <input type="range" min={0} max={10} step={0.5} value={minPct} onChange={e => setMinPct(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor:"#4FA3E0" }}/>
                </div>
                <div>
                  <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-2">Sector</div>
                  <div className="flex flex-wrap gap-1">
                    {SECTORS.map(s => (
                      <button key={s} onClick={() => toggleSec(s)}
                        className={clsx("px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all",
                          selSectors.includes(s) ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40" : "text-wm-text-dim border-wm-border hover:text-wm-text")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Column headers */}
          <div className="wm-scanner-row grid border-b border-wm-border bg-wm-dark shrink-0"
            style={{ gridTemplateColumns:"36px 80px 1fr 90px 90px 80px 160px 60px 80px 100px 60px" }}>
            {[
              {l:"",k:null},{l:"Symbol",k:null},{l:"Signal",k:null},{l:"Price",k:null},
              {l:"Chg%",k:"changePct"},{l:"Vol×",k:"volRatio"},{l:"RSI",k:"rsi"},
              {l:"Str",k:"strength"},{l:"Sector",k:null},{l:"Chart",k:null},{l:"",k:null},
            ].map(({l,k},i) => (
              <div key={i} className={clsx("px-2 py-1.5 text-[9px] font-bold text-wm-text-dim uppercase tracking-wider flex items-center gap-0.5",
                k && "cursor-pointer hover:text-wm-text select-none")}
                onClick={() => k && sortToggle(k as SortKey)}>
                {l}{k && <SortIcon k={k as SortKey}/>}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-wm-text-muted gap-2">
                <AlertCircle size={24} className="opacity-30"/>
                <span className="text-xs">No signals match current filters</span>
              </div>
            )}
            {filtered.map((r, idx) => {
              const meta = r.signal ? SIGNAL_META[r.signal] : null;
              const up   = r.changePct != null && r.changePct >= 0;
              const isSel = selected?.id === r.id;
              const rsiIdentity = r.rsiFailure?.identity ?? scannerRsiIdentity(r.symbol);
              const rsiIdentityKey = scannerRsiIdentityKey(rsiIdentity);
              const rsiStatusId = `scanner-rsi-status-${scannerRsiIdentityDomToken(rsiIdentity)}`;
              const rsiRetrying = retryingRsiKey === rsiIdentityKey;
              const rsiUpdated = updatedRsiKeys.has(rsiIdentityKey);
              const rsiIdentitySelected = selectedRsiIdentityKey === rsiIdentityKey;
              return (
                <motion.div key={r.id}
                  initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} transition={{ delay:idx*0.015,duration:0.2 }}
                  onClick={() => setSelected(isSel ? null : r)}
                  className={clsx("wm-scanner-row grid border-b border-wm-border/30 cursor-pointer transition-colors items-center",
                    isSel || rsiIdentitySelected ? "bg-wm-surface" : "hover:bg-wm-surface/50")}
                  style={{ gridTemplateColumns:"36px 80px 1fr 90px 90px 80px 160px 60px 80px 100px 60px", minHeight:r.rsiFailure ? 72 : 40 }}>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={e=>{e.stopPropagation();toggleStar(r.id)}}
                      aria-label={`${r.starred ? "Remove" : "Add"} ${r.symbol} ${r.starred ? "from" : "to"} starred signals`}
                      title={`${r.starred ? "Remove" : "Add"} ${r.symbol} ${r.starred ? "from" : "to"} starred signals`}
                      className="text-wm-text-dim hover:text-wm-gold transition-colors"
                    >
                      <Star size={11} className={r.starred?"text-wm-gold fill-wm-gold":""}/>
                    </button>
                  </div>
                  <div className="px-2">
                    <div className="text-xs font-bold text-wm-text">{r.symbol}</div>
                    <div className="text-[9px] text-wm-text-dim truncate">{r.name}</div>
                    <span
                      className={clsx(
                        "mt-0.5 inline-flex rounded border px-1 py-px text-[8px] font-black tracking-wide",
                        r.quoteQuality === "DELAYED"
                          ? "border-wm-gold/40 text-wm-gold"
                          : r.quoteQuality === "STALE"
                            ? "border-wm-red/40 text-wm-red"
                            : "border-wm-border text-wm-text-muted",
                      )}
                      title={`${scannerQuoteTruth({ receivedAt: r.quoteReceivedAt, reusedPrevious: r.quoteQuality === "STALE" }).title} Received ${new Date(r.quoteReceivedAt).toLocaleTimeString()}.`}
                    >
                      {r.quoteQuality}
                    </span>
                  </div>
                  <div className="px-2">
                    {meta ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background:`${meta.color}18`,color:meta.color }}>
                        {meta.icon} {meta.label}
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border border-wm-border text-wm-text-dim"
                        title={r.unratedReason}
                      >
                        — Unrated
                      </span>
                    )}
                  </div>
                  <div className="px-2 text-xs font-mono font-bold text-wm-text">
                    ${r.price.toLocaleString("en-US",{minimumFractionDigits:2})}
                  </div>
                  <div className={clsx("px-2 text-xs font-mono font-bold",
                    r.changePct==null?"text-wm-text-dim":up?"text-wm-green":"text-wm-red")}
                    title={r.changePctFact.reason}
                    aria-label={`Session change for ${r.symbol}: ${r.changePctFact.text}. ${r.changePctFact.reason}`}>
                    {r.changePctFact.text}
                  </div>
                  <div className="px-2">
                    <span className={clsx("text-[10px] font-mono font-bold",
                      r.volRatio==null?"text-wm-text-dim":r.volRatio>=4?"text-wm-gold":r.volRatio>=2?"text-wm-blue":"text-wm-text-muted")}
                      title={r.volRatioFact.reason}
                      aria-label={`Volume ratio for ${r.symbol}: ${r.volRatioFact.text}. ${r.volRatioFact.reason}`}>
                      {r.volRatioFact.text}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className={clsx("text-[10px] font-mono font-bold",
                      r.rsi==null?"text-wm-text-dim":r.rsi>=70?"text-wm-red":r.rsi<=30?"text-wm-green":"text-wm-text-muted")}
                      title={r.rsiFact.reason}
                      aria-label={`RSI for ${r.symbol}: ${r.rsiFact.text}. ${r.rsiFact.reason}`}>
                      {r.rsiFact.text}
                    </span>
                    <div className="h-1 mt-0.5 rounded-full bg-wm-surface" style={{ width:36 }}>
                      <div className="h-full rounded-full" style={{ width:`${r.rsi==null?0:r.rsi}%`,
                        background:r.rsi==null?"transparent":r.rsi>=70?"#FF4D6A":r.rsi<=30?"#00D4AA":"#F0B429" }}/>
                    </div>
                    {(r.rsiFailure || rsiRetrying || rsiUpdated) && (
                      <div
                        id={rsiStatusId}
                        ref={element => {
                          if (element) rsiStatusRefs.current.set(rsiIdentityKey, element);
                          else rsiStatusRefs.current.delete(rsiIdentityKey);
                        }}
                        role="status"
                        aria-live="polite"
                        tabIndex={rsiUpdated && !r.rsiFailure ? 0 : -1}
                        className="mt-1 text-[9px] leading-tight text-wm-text-muted outline-none focus-visible:ring-2 focus-visible:ring-wm-blue"
                      >
                        {rsiRetrying
                          ? `Retrying RSI for ${r.symbol}`
                          : r.rsiFailure
                            ? `RSI unavailable: ${r.rsiFailure.reason}`
                            : `RSI updated for ${r.symbol}`}
                      </div>
                    )}
                    {r.rsiFailure && (
                      <button
                        ref={element => {
                          if (element) rsiRetryButtonRefs.current.set(rsiIdentityKey, element);
                          else rsiRetryButtonRefs.current.delete(rsiIdentityKey);
                        }}
                        type="button"
                        disabled={rsiRetrying}
                        aria-busy={rsiRetrying}
                        aria-describedby={rsiStatusId}
                        aria-label={rsiRetrying ? `Retrying RSI for ${r.symbol}` : `Retry failed RSI for ${r.symbol}`}
                        onClick={event => {
                          event.stopPropagation();
                          void retryFailedRsi(rsiIdentity);
                        }}
                        className="mt-1 rounded border border-wm-blue/50 px-1.5 py-0.5 text-[9px] font-bold text-wm-blue transition-colors hover:bg-wm-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wm-blue disabled:cursor-wait disabled:opacity-60"
                      >
                        {rsiRetrying ? "Retrying…" : "Retry"}
                      </button>
                    )}
                  </div>
                  <div className="px-2">
                    {/* The disclosure sentence says "from observed data only".
                        On an unrated row that sentence would be the lie, so
                        the row states what was missing instead. */}
                    {r.strength == null ? (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-wm-text-dim"
                        title={r.unratedReason}>
                        —
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                        title={r.disclosure ?? undefined}
                        style={{ background:`${STRENGTH_COLOR[r.strength]}22`,color:STRENGTH_COLOR[r.strength] }}>
                        {r.strength}
                      </span>
                    )}
                  </div>
                  <div className="px-2 text-[9px] text-wm-text-dim truncate">{r.sector}</div>
                  <div className="px-1"><ChangeMeter changePct={r.changePct} fact={r.changePctFact}/></div>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={e=>{e.stopPropagation();toggleAlert(r.id)}}
                      aria-label={`${r.alerted ? "Disable" : "Enable"} alert for ${r.symbol}`}
                      title={`${r.alerted ? "Disable" : "Enable"} alert for ${r.symbol}`}
                      className={clsx("p-1 rounded transition-colors",r.alerted?"text-wm-gold":"text-wm-text-dim hover:text-wm-gold")}>
                      <Bell size={11} className={r.alerted?"fill-wm-gold":""}/>
                    </button>
                    <button onClick={e=>{e.stopPropagation();setActiveSymbol(r.symbol);router.push(`/charts?symbol=${encodeURIComponent(r.symbol)}`);}}
                      aria-label={`Open ${r.symbol} chart`}
                      className="p-1 rounded text-wm-text-dim hover:text-wm-blue transition-colors" title={`Open ${r.symbol} chart`}>
                      <BarChart2 size={11}/>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/command-deck?symbol=${encodeURIComponent(r.symbol)}`); }}
                      aria-label={`Open ${r.symbol} on the Command Deck`}
                      title={`Open ${r.symbol} on the Command Deck`}
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: 9,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                        color: "#c9a55c",
                        border: "1px solid rgba(139,106,41,0.35)",
                        borderRadius: 4,
                        padding: "2px 6px",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      Deck →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ width:0,opacity:0 }} animate={{ width:252,opacity:1 }} exit={{ width:0,opacity:0 }}
              className="wm-scanner-detail border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden">
              <div className="px-3 py-2 border-b border-wm-border flex items-center justify-between">
                <span className="text-xs font-bold text-wm-text">{selected.symbol} Detail</span>
                <button
                  onClick={()=>setSelected(null)}
                  aria-label={`Close ${selected.symbol} details`}
                  title={`Close ${selected.symbol} details`}
                  className="text-wm-text-dim hover:text-wm-text text-xs"
                >✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth:"thin" }}>
                <div className="rounded-xl border border-wm-border bg-wm-surface/30 p-3">
                  <div className="text-xl font-black text-wm-text">
                    ${selected.price.toLocaleString("en-US",{minimumFractionDigits:2})}
                  </div>
                  <div className={clsx("text-sm font-bold mt-0.5",
                    selected.changePct==null?"text-wm-text-dim":selected.changePct>=0?"text-wm-green":"text-wm-red")}
                    title={selected.changePctFact.reason}
                    aria-label={`Session change for ${selected.symbol}: ${selected.changePctFact.text}. ${selected.changePctFact.reason}`}>
                    {selected.changePctFact.text}
                  </div>
                  <div className="mt-3"><ChangeMeter changePct={selected.changePct} fact={selected.changePctFact}/></div>
                </div>
                {selected.signal == null || selected.strength == null ? (
                  <div className="px-2 py-1.5 rounded-lg border border-wm-border bg-wm-surface/30">
                    <div className="text-[10px] font-black tracking-wide text-wm-text-dim">UNRATED</div>
                    <div className="mt-1 text-[10px] leading-snug text-wm-text-muted">
                      {selected.unratedReason}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{ background:`${SIGNAL_META[selected.signal].color}12`,
                             border:`1px solid ${SIGNAL_META[selected.signal].color}30` }}>
                    <span className="text-base">{SIGNAL_META[selected.signal].icon}</span>
                    <span className="text-xs font-bold" style={{ color:SIGNAL_META[selected.signal].color }}>
                      {SIGNAL_META[selected.signal].label}
                    </span>
                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded"
                      title={selected.disclosure ?? undefined}
                      style={{ background:`${STRENGTH_COLOR[selected.strength]}22`,color:STRENGTH_COLOR[selected.strength] }}>
                      {selected.strength}
                    </span>
                  </div>
                )}
                {[
                  /* Every tile below states a FACT and carries the reason it is
                     that fact. The three that used to end in `—` said nothing
                     the dash did not already say, while the sentence explaining
                     them sat one field away. See @/lib/scanner/scannerMetricFacts. */
                  {l:"Vol Ratio",v:selected.volRatioFact.text, c:selected.volRatioFact.state!=="MEASURED"?"#64748B":selected.volRatioFact.value!=null&&selected.volRatioFact.value>=3?"#F0B429":"#94A3B8", why:selected.volRatioFact.reason},
                  {l:"RSI",      v:selected.rsiFact.text,      c:selected.rsiFact.state!=="MEASURED"?"#64748B":selected.rsiFact.value!=null&&selected.rsiFact.value>=70?"#FF4D6A":selected.rsiFact.value!=null&&selected.rsiFact.value<=30?"#00D4AA":"#94A3B8", why:selected.rsiFact.reason},
                  {l:"Sector",   v:selected.sector,        c:"#94A3B8"},
                  {l:"Mkt Cap",  v:selected.mktcap.text, c:selected.mktcap.state==="MEASURED"?"#94A3B8":"#64748B", why:selected.mktcap.reason},
                  {l:"Float",    v:selected.float.text,  c:selected.float.state ==="MEASURED"?"#94A3B8":"#64748B", why:selected.float.reason},
                  {l:"Volume",   v:selected.volumeFact.text,   c:selected.volumeFact.state==="MEASURED"?"#94A3B8":"#64748B", why:selected.volumeFact.reason},
                ].map(({l,v,c,why})=>(
                  <div key={l} className="flex justify-between items-center py-1 border-b border-wm-border/30"
                    title={why} aria-label={why ? `${l}: ${v}. ${why}` : undefined}>
                    <span className="text-[10px] text-wm-text-dim">{l}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color:c }}>{v}</span>
                  </div>
                ))}
                <div className="space-y-2 pt-1">
                  <button onClick={()=>toggleAlert(selected.id)}
                    className={clsx("w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all",
                      selected.alerted ? "bg-wm-gold/15 text-wm-gold border-wm-gold/40" : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-gold hover:border-wm-gold/40")}>
                    <Bell size={12}/> {selected.alerted?"Alert ON":"Set Alert"}
                  </button>
                  <button onClick={()=>{setActiveSymbol(selected.symbol);router.push(`/charts?symbol=${encodeURIComponent(selected.symbol)}`);}}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-wm-blue/15 text-wm-blue border border-wm-blue/40 hover:bg-wm-blue/25 transition-all">
                    <BarChart2 size={12}/> Open Chart
                  </button>
                  <button
                    onClick={() => router.push(`/command-deck?symbol=${encodeURIComponent(selected.symbol)}`)}
                    aria-label={`Open ${selected.symbol} on the Command Deck`}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      letterSpacing: 0.32,
                      textTransform: "uppercase",
                      color: "#c9a55c",
                      borderColor: "rgba(139,106,41,0.35)",
                      background: "transparent",
                    }}
                  >
                    Command Deck →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar — the row that already speaks about the DATA rather than
          about the view: how many results, how fresh, what quote state. The
          scan's certification denominator belongs here, beside QUOTE STATE,
          and NOT in the header strip.

          Measured, 375px viewport: in the header the chip had nowhere to go.
          `.wm-scanner-stats` begins at left:272 with its sibling label already
          wrapped to three lines (w:56 h:60); the chip rendered at right:393 —
          clipped past the 375 edge — and pushed `.wm-scanner-actions` to w:0,
          collapsing the pre-existing Filters button. A new truth that breaks an
          existing control is not an improvement.

          `flex-wrap` here is what makes the phone honest: this row has no
          controls to displace, so under pressure it takes a second line
          instead of pushing a fact off the screen. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-1 border-t border-wm-border bg-wm-dark shrink-0 text-[9px] text-wm-text-dim">
        <span suppressHydrationWarning>
          {lastRefresh ? `Received: ${new Date(lastRefresh).toLocaleTimeString()}` : "Not yet received"}
        </span>
        <span>·</span>
        <span>{filtered.length}/{results.length} results</span>
        <span>·</span>
        <span className="text-wm-gold">QUOTE STATE: DELAYED</span>
        <span>·</span>
        {/* The scan's own denominator. Silent when nothing was refused — a
            "0 not certified" chip on every clean round is noise, and noise is
            what stops it being read on the round that matters. */}
        {round && round.refusals.size > 0 && (
          <>
            <span
              className="wm-scanner-uncertified text-wm-text-dim border border-wm-border rounded px-1.5"
              title={
                `${round.refusals.size} of ${round.attempted} scanned symbols are NOT CERTIFIED. ` +
                `A provider answered for each and WM declined the answer, so they are absent from ` +
                `the results below — this is not "no signal" and not a delay.\n\n` +
                [...round.refusals].map(([sym, reason]) => `${sym}: ${reason}`).join("\n")
              }
            >
              {round.refusals.size} of {round.attempted} not certified
            </span>
            <span>·</span>
          </>
        )}
        <span className={live?"text-wm-blue":""}>{live ? "↻ AUTO REFRESH (30s)" : "— PAUSED"}</span>
        <span>·</span>
        <span>{activeSignals.length} signal types</span>
      </div>
    </div>
  );
}
