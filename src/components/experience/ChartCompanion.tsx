"use client";

/**
 * ChartCompanion — FL-04 "News Chart Companion". The /news right column
 * that HOLDS THE SAME CAMERA as /charts instead of opening another app.
 *
 * Plate authority: WM_FL_04_NEWS_CHART_COMPANION — "COMPANION TRAVELS
 * SAME DECISION_ID NOT ANOTHER APP". Before this component existed the
 * guest tour failed step 11: leaving /charts for /news dropped every
 * market pixel; the reader lost the symbol, the verdict, and the session
 * truth until they navigated back.
 *
 * THIS FILE DECIDES NOTHING. Every judgement — price, session, freshness,
 * whether the panel may appear at all — belongs to
 * `selectChartCompanion()` (src/lib/experience/selectChartCompanion.ts),
 * which delegates in turn to the canonical owners. What lives here is
 * React wiring and pixels. A component that re-derived any of those
 * readings would be a SECOND OPINION, and two owners of one reading is
 * how this codebase got a phone pill claiming RTH on a Saturday.
 *
 * WHAT "SAME CAMERA" MEANS IN CODE — every reading here is a second
 * consumer of an owner /charts already writes, never a second writer:
 *
 *   symbol        SymbolContext (the room-shared identity)
 *   identity      canonicalMarketStateIdentity over the SAME persisted
 *                 wm_timeframe / wm_extHours the chart itself seeds from,
 *                 so this panel subscribes to the exact store key the
 *                 chart's publisher writes — not a parallel 15m guess.
 *   price         chartHeaderPriceFact (the one owner of "live quote vs
 *                 bar close vs nothing") over the canonical snapshot.
 *   verdict       useMarketCanvasVM → CanvasBadgeMini (ONE chip, see below),
 *                 the same compiler /charts and /command-deck read.
 *   session       selectCanonicalSessionToken — the owner that stopped
 *                 the phone pill claiming RTH on a Saturday.
 *   tape          sessionSymbolStore (browser-local observed trades),
 *                 labelled as browser-local memory, never as a feed.
 *
 * WHAT THIS PANEL MUST NEVER DO:
 *   - mint a Decision_ID (it renders state; it decides nothing) — §7
 *     Market Camera Immortality;
 *   - fabricate a price (no snapshot → the honest sentence about WHY,
 *     which names a store lifetime, not a market condition);
 *   - claim LIVE from memory (freshness comes from lastTradeAtMs and
 *     ages on the canvas clock, exactly like MobileSessionPill).
 *
 * The canonical market state store is IN-MEMORY and page-session scoped
 * (canonicalMarketStateStore.ts: "not an unbounded history database").
 * Client-side navigation from /charts keeps it warm; a hard reload of
 * /news starts it empty. Both states are rendered truthfully — the
 * empty one says the chart has not compiled in THIS page session and
 * offers the door back, which is an honest absence, not a beautiful lie.
 *
 * Desktop-and-up column (hidden below lg): at phone width the shell
 * header already carries the camera via MobileSessionPill, and a second
 * phone owner for the same reading would be a duplicate-owner defect.
 */

import * as React from "react";
import Link from "next/link";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import { canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import { useSessionClockDate } from "@/lib/marketData/useProvenSessionClosure";
import { useCanonicalMarketState } from "@/lib/marketData/useCanonicalMarketState";
import { useMarketCanvasVM } from "@/lib/marketData/viewModels/useMarketCanvasVM";
import { useCanvasClock } from "@/lib/marketData/viewModels/canvasClock";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import {
  selectChartCompanion,
  type CompanionTapeReading,
} from "@/lib/experience/selectChartCompanion";
import CanvasBadgeMini from "@/components/experience/CanvasBadgeMini";

/**
 * The chart's OWN persisted camera settings, read after mount only.
 * `null` until hydrated — the component renders nothing before that, so
 * SSR and first client paint agree (no #418, no fabricated defaults).
 */
function useChartCameraSettings(): { timeframe: string; extHours: boolean } | null {
  const [settings, setSettings] = React.useState<{ timeframe: string; extHours: boolean } | null>(null);
  React.useEffect(() => {
    const read = <T,>(key: string, fallback: T): T => {
      try {
        const v = localStorage.getItem(key);
        return v ? (JSON.parse(v) as T) : fallback;
      } catch {
        return fallback;
      }
    };
    // Same keys, same fallbacks, as ChartsDashboard's own seeds — this is
    // a READ of the chart's persisted camera, not a second opinion on it.
    setSettings({
      timeframe: read<string>("wm_timeframe", "5m"),
      extHours: read<boolean>("wm_extHours", true),
    });
  }, []);
  return settings;
}

/** Observed-trade memory for one symbol — a read of the shared store. */
function useTapeReading(symbol: string): CompanionTapeReading {
  const [tick, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => subscribeSessionSymbolStore(() => force()), []);
  return React.useMemo(() => {
    const upper = symbol.toUpperCase();
    const rows = getKnownSessionSymbols().filter(
      (s) => s.symbol.toUpperCase() === upper && s.slot.stats.tradeCount > 0,
    );
    const trades = rows.reduce((sum, r) => sum + r.slot.stats.tradeCount, 0);
    const lastTradeMs = rows.reduce<number | null>((acc, r) => {
      const t = r.slot.lastTradeAtMs
        ?? (r.slot.horizon?.startedAtSec != null ? r.slot.horizon.startedAtSec * 1000 : null);
      if (t == null) return acc;
      return acc == null ? t : Math.max(acc, t);
    }, null);
    // The richest slot's CVD spark (most trades = most evidence). Real
    // samples only; an empty array draws nothing.
    const richest = rows.reduce<(typeof rows)[number] | null>(
      (best, r) => (!best || r.slot.stats.tradeCount > best.slot.stats.tradeCount ? r : best),
      null,
    );
    return { trades, lastTradeMs, cvdSpark: richest?.slot.cvdSpark ?? [] };
    // `tick` is the store-notification counter — the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tick]);
}

/**
 * THE MINI PRICE BOOK — the FL-04 plate's centre panel.
 *
 * ── WHY THIS REPLACED A SPARKLINE ─────────────────────────────────────
 * This slot first shipped a CVD sparkline: a line this file already knew
 * how to draw, from data it already had. It was honestly labelled and it
 * was still wrong. The plate specifies a PRICE BOOK — a price line with a
 * labelled price axis and a labelled session axis — and §8's hard visual
 * law is that THE COMPONENT LIBRARY DOES NOT DEFINE THE PRODUCT CEILING.
 * Drawing cumulative delta under a price axis would put real numbers
 * beneath a scale they do not belong to, which is worse than drawing
 * nothing.
 *
 * ── THIS COMPONENT COMPUTES NO MARKET TRUTH ───────────────────────────
 * Points, bounds, reference and timeframe all arrive resolved from
 * selectChartCompanion. What happens here is arithmetic from value-space
 * to pixel-space and nothing else. In particular the bounds are NOT
 * recomputed: a component that picked its own scale would be a second
 * owner of "how big was this move", and the same tail would look calm in
 * one panel and violent in another.
 *
 * ── THE RED/GREEN DIVERGENCE, NAMED NOT HIDDEN ────────────────────────
 * §9 (noGreenInTheRoom) forbids green in this directory because a green
 * lamp beside a verdict reads as A CONDITION HAS BEEN MET. §11 separately
 * sanctions classic red/green for CANDLES AND PRICE, and the binding
 * plate draws this line red below its reference and green above.
 *
 * Both are obeyed, by splitting on what the colour MEANS:
 *   - the price line is red/green, because here the colour means
 *     "below/above the reference close" — a price fact, not a permission;
 *   - the WAIT chip's dot and every decision affordance stay out of the
 *     green ramp entirely.
 * The two green literals below are registered in the §9 ALLOWED ledger
 * with this reasoning. They are the only ones in this file.
 */
const BOOK_W = 208;
const BOOK_PLOT_H = 78;
const BOOK_AXIS_W = 40;
const BOOK_TIME_H = 14;

/** Classic price semantics (§11), NOT a permission signal (§9). */
const PRICE_UP = "#3fb950";
const PRICE_DOWN = "#d4553d";

function bookTimeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function MiniPriceBook({
  points,
  min,
  max,
  reference,
  timeframe,
  symbol,
}: {
  points: readonly { t: number; c: number }[];
  min: number;
  max: number;
  reference: number;
  timeframe: string;
  symbol: string;
}): React.ReactElement | null {
  // The selector already refuses fewer than two points. This is the belt
  // to that braces — a one-point "line" is a flat segment across the
  // panel, which is a claim of stillness the evidence never made.
  if (points.length < 2) return null;

  const plotW = BOOK_W - BOOK_AXIS_W;
  // A zero span means every close in view is identical. Spreading that
  // across the full height would manufacture a shape; centring it draws
  // the flat truth.
  const span = max - min;
  const x = (i: number) => (i / (points.length - 1)) * (plotW - 2) + 1;
  const y = (v: number) =>
    span === 0 ? BOOK_PLOT_H / 2 : BOOK_PLOT_H - 4 - ((v - min) / span) * (BOOK_PLOT_H - 8);

  const refY = y(reference);

  // Four price ticks spanning the REAL extremes — never rounded outward
  // to a prettier number, because a padded axis claims price reached a
  // level it did not reach.
  const priceTicks =
    span === 0 ? [min] : [0, 1, 2, 3].map((k) => min + (span * k) / 3);

  // Five session ticks, each one a REAL bar-open timestamp taken from the
  // points themselves. Interpolating evenly across wall-clock time would
  // invent labels for bars that never traded.
  const timeTicks = [0, 1, 2, 3, 4].map((k) =>
    Math.round((k / 4) * (points.length - 1)),
  );

  const last = points[points.length - 1]!;

  return (
    <svg
      width={BOOK_W}
      height={BOOK_PLOT_H + BOOK_TIME_H}
      viewBox={`0 0 ${BOOK_W} ${BOOK_PLOT_H + BOOK_TIME_H}`}
      role="img"
      data-testid="chart-companion-price-book"
      aria-label={
        `${symbol} price book: ${points.length} closed ${timeframe} bars, ` +
        `ranging ${min.toFixed(2)} to ${max.toFixed(2)}.`
      }
    >
      {/* Faint vertical gridlines, anchored to the same real bars as the labels */}
      {timeTicks.map((i, k) => (
        <line
          key={`grid-${k}`}
          x1={x(i)}
          y1={0}
          x2={x(i)}
          y2={BOOK_PLOT_H}
          stroke="rgba(139,106,41,0.10)"
          strokeWidth="1"
        />
      ))}

      {/* The reference baseline the line's colour is measured against */}
      <line
        x1={0}
        y1={refY}
        x2={plotW}
        y2={refY}
        stroke="rgba(201,165,92,0.35)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/*
        One segment per bar interval, coloured by where the segment ENDS
        relative to the reference. Per-segment rather than one polyline
        because a single stroke colour would have to pick a winner for a
        line that crosses the baseline — and the crossing is the story.
      */}
      {points.slice(1).map((p, i) => (
        <line
          key={`seg-${p.t}`}
          x1={x(i)}
          y1={y(points[i]!.c)}
          x2={x(i + 1)}
          y2={y(p.c)}
          stroke={p.c >= reference ? PRICE_UP : PRICE_DOWN}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ))}

      {/* Terminal dot — the live edge, where the reader's eye lands */}
      <circle
        cx={x(points.length - 1)}
        cy={y(last.c)}
        r="2.4"
        fill={last.c >= reference ? PRICE_UP : PRICE_DOWN}
      />

      {/* Right-side price axis */}
      {priceTicks.map((v, k) => (
        <text
          key={`p-${k}`}
          x={BOOK_W - 2}
          y={y(v) + 3}
          textAnchor="end"
          style={{ fontSize: 7.5, fill: "#8a8271", fontVariantNumeric: "tabular-nums" }}
        >
          {v.toFixed(2)}
        </text>
      ))}

      {/* Bottom session axis */}
      {timeTicks.map((i, k) => (
        <text
          key={`t-${k}`}
          x={x(i)}
          y={BOOK_PLOT_H + 10}
          textAnchor={k === 0 ? "start" : k === timeTicks.length - 1 ? "end" : "middle"}
          style={{ fontSize: 7.5, fill: "#655f52", fontVariantNumeric: "tabular-nums" }}
        >
          {bookTimeLabel(points[i]!.t)}
        </text>
      ))}
    </svg>
  );
}

/** Minimal real-data sparkline. Silent under 2 samples — one dot is not a line. */
function CvdSparkline({ samples }: { samples: readonly number[] }): React.ReactElement | null {
  if (samples.length < 2) return null;
  const w = 132;
  const h = 26;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min || 1;
  const pts = samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * (w - 2) + 1;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Session CVD sparkline, ${samples.length} samples, browser-local memory`}
      data-testid="chart-companion-cvd-spark"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#c9a55c"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChartCompanion(): React.ReactElement | null {
  const { activeSymbol } = useActiveSymbol();
  const auth = useAuth();
  const camera = useChartCameraSettings();
  const symbol = (activeSymbol || "").toUpperCase();

  // Identity = the SAME store key the chart's publisher writes for this
  // symbol at its persisted timeframe. Throws only on an unknown tf id
  // (e.g. a legacy value in localStorage) — silence beats a white screen.
  const identity = React.useMemo(() => {
    if (!camera || !symbol) return null;
    try {
      return canonicalMarketStateIdentity({
        symbol,
        timeframe: camera.timeframe,
        extHours: camera.extHours,
      });
    } catch {
      return null;
    }
  }, [camera, symbol]);

  const state = useCanonicalMarketState(identity);
  const { canvas } = useMarketCanvasVM({
    identity,
    ownerId: auth?.user?.id ?? null,
  });
  const tape = useTapeReading(symbol);
  const sessionClockDate = useSessionClockDate();
  const tickedNowMs = useCanvasClock();

  // THE ONE JUDGEMENT CALL. Everything below this line is pixels.
  const vm = selectChartCompanion({
    symbol,
    timeframe: camera?.timeframe ?? null,
    state,
    tape,
    nowMs: tickedNowMs ?? Date.now(),
    at: sessionClockDate,
  });

  // Pre-hydration (camera settings unread) the panel renders nothing:
  // SSR/first-paint agreement, and no claim is made before it can be true.
  if (!vm.visible) return null;

  const { fresh } = vm;
  // §9 — NO GREEN MEANS SAFE, IN THE ROOM. This dot began life as the phone
  // pill's #00E88A / #F5A623 pair, and the §9 Sentinel was right to stop it:
  // a green lamp beside a verdict reads as A CONDITION HAS BEEN MET, and a
  // fresh tape is not a safe trade. Freshness is carried by the SENTENCE
  // ("fresh <30s" / "not fresh", and vm.spoken for screen readers); the dot
  // only ramps PRESENCE in the house palette — ivory for a timestamped
  // reading, muted for observed-but-old, dimmest for nothing observed.
  const dotColor = !vm.tapeObserved ? "#4a463d" : fresh ? "#ede6d3" : "#8a8271";

  // ── THE FOOTER'S THREE WORDS ────────────────────────────────────────────
  // The plate says "Live". Whether that word is TRUE is not this component's
  // opinion — it is chartHeaderPriceFact's `kind`, the same owner that
  // produced the price above. LIVE_QUOTE is a trade print; BAR_CLOSE is a
  // closed bar, which is real evidence but is NOT live, and saying otherwise
  // in a 9px footer is how a stale number gets traded.
  const feedLive = vm.price.kind === "READING" && vm.price.fact.kind === "LIVE_QUOTE";
  const feedWord =
    vm.price.kind !== "READING"
      ? "No price"
      : vm.price.fact.kind === "LIVE_QUOTE"
        ? "Live"
        : "Last close";
  const feedLabel =
    vm.price.kind !== "READING"
      ? "No data"
      : vm.price.fact.kind === "LIVE_QUOTE"
        ? "Live data"
        : "Bar close";
  // Exchange time, because a market timestamp in the reader's local zone is
  // a different instant to every reader. ET is the plate's own suffix and
  // the session token's frame of reference.
  const asOfText =
    vm.asOf === null
      ? null
      : `${new Date(vm.asOf).toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })} ET · ${new Date(vm.asOf).toLocaleDateString("en-US", {
          timeZone: "America/New_York",
          month: "short",
          day: "numeric",
        })}`;

  return (
    <aside
      data-testid="chart-companion"
      aria-label={vm.spoken}
      className="hidden lg:flex flex-col shrink-0 gap-3 p-3 overflow-y-auto"
      style={{
        width: 232,
        borderLeft: "1px solid rgba(139,106,41,0.18)",
        /*
          OPAQUE ON PURPOSE. This panel used a 0.92 → 0.72 alpha gradient,
          and on the serving /news page the video rail sitting behind its
          lower half showed THROUGH the evidence text — "CNBC" and "Fox
          Business" legible across the sentence explaining why there is no
          price. Measured, not guessed: the companion wins the hit test at
          that point, so it was never a z-order bug; the surface was simply
          see-through.

          A panel whose whole job is to state what is and is not known may
          not have another surface's words reading through its own. The
          warm top-light the plate shows is kept as a gold wash LAYERED
          OVER a solid base, rather than as transparency.
        */
        backgroundColor: "#0b0b0d",
        backgroundImage:
          "linear-gradient(180deg, rgba(201,165,92,0.05) 0%, rgba(201,165,92,0) 100%)",
        position: "relative",
      }}
    >
      {/* Masthead — plate: the companion is the SAME camera, not another app */}
      <div>
        <div className="flex items-center justify-between">
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 9,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: "#8a8271",
            }}
          >
            Chart Companion
          </div>
          {/*
            The PIN. Plate law: "the mini book stays PINNED with the same
            Decision_ID." It is a STATE GLYPH, not a button — nothing here
            can be unpinned, because the companion travelling with the
            camera is the OS behaviour, not a user preference. Rendering it
            as a control would promise an action that does not exist.
          */}
          <svg
            width="11" height="11" viewBox="0 0 24 24"
            role="img"
            data-testid="chart-companion-pin"
            aria-label="Pinned — this companion travels with the chart's camera."
            fill="none" stroke="#c9a55c" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
          <span
            aria-hidden="true"
            style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: dotColor,
              boxShadow: fresh ? "0 0 3px rgba(237,230,211,0.5)" : "none",
            }}
          />
          <span
            data-testid="chart-companion-symbol"
            style={{
              fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
              color: "#ede6d3", fontVariantNumeric: "tabular-nums",
            }}
          >
            {vm.symbol}
          </span>
          <span
            title={vm.sessionDetail}
            style={{
              color: "#c9a55c", fontSize: 8, fontWeight: 500,
              letterSpacing: 0.3, padding: "1px 4px", borderRadius: 3,
              border: "1px solid rgba(201,165,92,0.32)",
              background: "rgba(201,165,92,0.06)",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}
          >
            {vm.sessionToken}
          </span>
        </div>
      </div>

      {/* Price — the one owner's exact words, or the honest absence */}
      <div data-testid="chart-companion-price">
        {vm.price.kind === "READING" ? (
          <div
            title={vm.price.fact.reason}
            style={{
              fontSize: vm.price.fact.kind === "LIVE_QUOTE" ? 18 : 12,
              fontWeight: 600,
              color: vm.price.fact.measured ? "#ede6d3" : "#8a8271",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.25,
              overflowWrap: "anywhere",
            }}
          >
            {vm.price.fact.text}
          </div>
        ) : (
          <p style={{ fontSize: 10, lineHeight: 1.5, color: "#8a8271", margin: 0 }}>
            {vm.price.reason}
          </p>
        )}
      </div>

      {/*
        Bar-over-bar change — ALWAYS carrying its timeframe.
        deriveBarOverBarChange's own header forbids this number occupying
        the session-change slot unlabelled, so the timeframe is rendered
        beside it, not in a tooltip. "+1.87 (0.35%)" alone would be read
        as "up on the day" by every trader alive.
      */}
      {vm.change.kind === "READING" && (
        <div
          data-testid="chart-companion-change"
          className="flex items-baseline gap-1.5"
          style={{ marginTop: -6 }}
        >
          <span
            style={{
              fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: vm.change.direction === "DOWN" ? PRICE_DOWN
                : vm.change.direction === "UP" ? PRICE_UP : "#8a8271",
            }}
          >
            {vm.change.chg >= 0 ? "+" : ""}{vm.change.chg.toFixed(2)}
            {" "}
            ({vm.change.pct >= 0 ? "+" : ""}{vm.change.pct.toFixed(2)}%)
          </span>
          <span style={{ fontSize: 8, color: "#655f52", letterSpacing: 0.3 }}>
            last {vm.change.timeframe} bar
          </span>
        </div>
      )}

      {/*
        THE SINGLE VERDICT. This slot previously rendered CanvasBadgeMini in
        the masthead AND CanvasSummaryPill here, so "NO TRADE" appeared
        TWICE in a 232px column — found by looking at the serving page, not
        by reading the code. The plate carries exactly one verdict chip, so
        the masthead badge was removed and this one kept.
      */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <CanvasBadgeMini vm={canvas} />

        {/*
          REGIME — canon's word, verbatim. When canon is silent the chip
          shows UNRESOLVED and hands over canon's OWN reason on hover,
          rather than a sentence this component invented.
        */}
        <span
          data-testid="chart-companion-regime"
          title={
            vm.regime.resolved
              ? undefined
              : vm.regime.reason ?? "No compiled market state to read a regime from."
          }
          style={{
            fontSize: 8, letterSpacing: 0.4, textTransform: "uppercase",
            padding: "2px 5px", borderRadius: 3, whiteSpace: "nowrap",
            border: "1px solid rgba(201,165,92,0.28)",
            background: "rgba(201,165,92,0.05)",
            color: vm.regime.resolved ? "#ede6d3" : "#655f52",
          }}
        >
          Regime: {vm.regime.resolved ? vm.regime.value : "Unresolved"}
        </span>
      </div>

      {/*
        THE MINI PRICE BOOK. Either the real line, or the reason there is
        none — never a substitute series under a price axis.
      */}
      <div data-testid="chart-companion-book">
        {vm.book.kind === "SERIES" ? (
          <MiniPriceBook
            points={vm.book.points}
            min={vm.book.min}
            max={vm.book.max}
            reference={vm.book.reference}
            timeframe={vm.book.timeframe}
            symbol={vm.symbol}
          />
        ) : vm.price.kind === "MISSING" && vm.price.reason === vm.book.reason ? (
          /*
            ONE CAUSE, SAID ONCE.

            When there is no compiled state at all, the price and the book
            are missing for the SAME reason, and both slots were printing
            the identical sentence — the serving /news page showed that
            paragraph twice, stacked. Repetition reads as two separate
            problems and makes a short panel feel like an error log.

            The absence is NOT hidden: the price slot above has already
            stated it in full. This renders nothing rather than restating
            it, and the moment the two reasons differ — a state that exists
            but has too few closed bars, say — the book's own sentence
            prints below, because that is genuinely new information.
          */
          null
        ) : (
          <p style={{ fontSize: 9, lineHeight: 1.5, color: "#655f52", margin: 0 }}>
            {vm.book.reason}
          </p>
        )}
      </div>

      {/* Observed tape memory — labelled as browser-local, never as a feed */}
      {vm.tapeObserved && (
        <div data-testid="chart-companion-tape">
          <div
            style={{
              fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase",
              color: "#8a8271", marginBottom: 2,
            }}
          >
            Session tape · browser-local memory
          </div>
          <div style={{ fontSize: 10, color: "#c2b892", fontVariantNumeric: "tabular-nums" }}>
            {vm.tradeCount.toLocaleString("en-US")} trade{vm.tradeCount === 1 ? "" : "s"} observed
            {" · "}
            {fresh ? "fresh <30s" : "not fresh"}
          </div>
          <CvdSparkline samples={vm.cvdSpark} />
        </div>
      )}

      {/*
        THE FOOTER ROW — the plate's "Live • 1m • Market Hours  ›".

        Three facts and a door, in the plate's order. Every segment has an
        owner: the feed word is chartHeaderPriceFact's OWN kind, the
        timeframe is the camera's, the session is the canonical session
        token — the same string the masthead chip shows, deliberately
        repeated because the plate repeats it. This is the one line a
        trader reads to answer "what am I actually looking at".

        THE WHOLE ROW IS THE DOOR. On the plate the chevron is the only
        affordance, so the row is the Link and the chevron is its glyph —
        rather than a chevron that looks clickable sitting beside a
        separate button that actually is.
      */}
      <div
        style={{
          borderTop: "1px solid rgba(201,165,92,0.14)",
          paddingTop: 8, marginTop: 2,
        }}
      >
        <Link
          href={vm.chartHref}
          data-testid="chart-companion-open-chart"
          aria-label={`Open the ${vm.symbol} ${vm.timeframe} chart, carrying this camera.`}
          className="transition-all"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 8, minHeight: 32, textDecoration: "none",
          }}
        >
          <span
            data-testid="chart-companion-footer-facts"
            style={{
              fontSize: 9.5, color: "#a39a85", letterSpacing: 0.2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {feedWord}
            {" · "}
            {vm.timeframe}
            {" · "}
            {vm.sessionToken}
          </span>
          <svg
            width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"
            fill="none" stroke="#c9a55c" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/*
        THE STATUS BAR — the plate's "● LIVE DATA • 10:24:35 ET • Apr 29".

        The plate prints LIVE DATA because the plate was drawn during a live
        session. This bar prints WHAT IS TRUE NOW, which is sometimes that
        and sometimes not, and the dot rides the same fact rather than
        glowing green regardless (§9, §20 STALE ≠ FRESH).

        The timestamp is vm.asOf — the capture instant of the evidence
        above it — NOT a render clock. A ticking clock over a frozen price
        is the precise lie this bar exists to prevent.
      */}
      <div
        data-testid="chart-companion-status"
        className="flex items-center gap-1.5"
        style={{ fontSize: 8.5, color: "#655f52", letterSpacing: 0.4 }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
            background: feedLive ? "#c9a55c" : "#4a463d",
          }}
        />
        <span style={{ textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {feedLabel}
          {asOfText ? ` · ${asOfText}` : ""}
        </span>
      </div>

      <p style={{ fontSize: 8.5, lineHeight: 1.5, color: "#655f52", margin: 0 }}>
        Same decision camera as the chart — this panel reads the state the
        chart compiled. It decides nothing and mints no Decision ID.
      </p>
    </aside>
  );
}

export default ChartCompanion;
