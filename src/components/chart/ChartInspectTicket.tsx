"use client";

/**
 * THE INSPECT TICKET — FL-06's panel on the candles.
 *
 * `WM_FL_06_ORDERFLOW_ON_CHART.jpg` stamps **"NO ESSAY DRAWER AS PRIMARY
 * TRUTH"** across its corner, and this small panel is the plate's answer to it.
 * The bar under the cursor says what it is made of, on the chart, beside the
 * candle — not in a drawer the trader has to go and open and read.
 *
 * ── WHY IT FOLLOWS THE CURSOR RATHER THAN WAITING FOR A CLICK ──────────────
 *
 * `MainChart` already publishes the bar under the crosshair through
 * `onOHLCAtCursor`, and until now nothing listened — the callback was an orphan.
 * Adding a click handler would have meant a second bar-selection path inside a
 * ten-thousand-line chart, and two selection paths is how one candle ends up
 * with two tickets disagreeing about which bar is selected.
 *
 * THE TOUCH PROBLEM IS HANDLED, NOT IGNORED. A hover-only reading is one a
 * touch user never receives — the drawer-filed-receipt failure this product has
 * repaired twice. So when the cursor is nowhere, the ticket does not blank: it
 * falls back to the LIVE bar, which is stated in the panel rather than implied.
 * That is not a consolation prize. The live bar is the only bar the held tape
 * can fully read, so the fallback shows the trader the ticket's best case.
 *
 * ── WHY IT IS NOT IN THE CORNER ────────────────────────────────────────────
 *
 * It was, and the first screenshot showed why it cannot be. Pinned to the
 * bottom-right it sat on top of the price scale AND the chart's own control
 * cluster, and — because a fully-refused ticket is TALLER than a read one, its
 * four reasons being longer than four numbers — its last two sentences were
 * clipped off the bottom of the pane. A refusal that gets cut in half is worse
 * than no refusal: the trader sees a truncated sentence and cannot tell
 * whether the product ran out of room or ran out of honesty.
 *
 * So it is inset from the price scale, it starts below the chart's top chrome,
 * and it carries a max height with its own scroll. The height cap is the one
 * that matters: the panel's content is variable by design.
 *
 * ── WHY IT HAS A CLOSE BUTTON ──────────────────────────────────────────────
 *
 * It sits over the candles, as the plate draws it. Anything over the market has
 * to be removable, because the market is not the slack in this layout — the
 * same reason `.wm-chart-market-pane` carries a floor. Closed, it leaves a
 * small INSPECT chip rather than vanishing, so the trader can find it again.
 *
 * Nothing here measures anything. `selectInspectTicket` decides what can
 * honestly be said about the bar and the tape; this renders that verdict.
 */

import React from "react";
import { positioningSourceWords } from "@/lib/marketData/cboeDelayedOptions";
import type { BigTradeClusterMember, SelectedBigTrade } from "@/lib/bigTradeLevels";
import { sessionRankWords } from "@/lib/chart/footprintCanon";
import { RESPONSE_BARS, type PrintResponseVM } from "@/lib/marketData/viewModels/selectPrintResponse";
import type { ContradictionVM } from "@/lib/marketData/viewModels/selectContradiction";
import type { MemoryGhostVM } from "@/lib/marketData/viewModels/selectMemoryGhost";
import type { MtfAncestryVM } from "@/lib/marketData/viewModels/selectMtfAncestry";
import { wallTestSpanWords, type DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import { LEARN_LESSON, learnHref, type LearnableSelection } from "@/lib/academy/academyContinuity";
import { printLocationInStructure, type PrintLocationVM } from "@/lib/marketData/viewModels/printLocationInStructure";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import type { LiquidityWeatherVM } from "@/lib/marketData/viewModels/selectLiquidityWeather";
import type { ExpectedEnvelopeVM } from "@/lib/marketData/viewModels/selectExpectedEnvelope";
import type { FusedProfileObject } from "@/lib/marketData/viewModels/fuseProfiles";
import { describeAggressorMethod, formatBubbleExact, formatBubblePrice, formatBubbleVolume } from "@/lib/bubbleClaim";
import { Ban, BadgeCheck, Check, CircleDashed, Clock, Crosshair, Fingerprint, Gauge, Hourglass, IdCard, Lock, Shield, ShieldCheck, Target, TrendingDown, X } from "lucide-react";
import { WM, wmToneColor } from "@/lib/design/wmTokens";
import { MARKET_MONO } from "@/lib/chart/marketType";

const TAPE_MONO = MARKET_MONO;
/**
 * Ladder / tape numbers at the precision they were traded. The bubble
 * formatters round BTC to whole dollars and sizes to 4 places, which printed
 * two different levels as "84,825" and a 0.00002 print as "0.0000".
 */
export function tapePrice(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return p.toLocaleString("en-US", { maximumFractionDigits: Math.abs(p) >= 1 ? 2 : 6 });
}
export function tapeSize(v: number): string {
  const a = Math.abs(v);
  if (!Number.isFinite(a)) return "—";
  if (a === 0) return "0";
  if (a >= 1) return formatBubbleVolume(a);
  // Below 0.0001 (satoshi-scale crypto prints) the fixed form is 10 digits
  // wide and clipped the ticket's Δ column; 2 significant digits in e-form.
  if (a < 0.0001) return a.toExponential(1).replace("e-", "e−");
  const decimals = Math.min(8, Math.max(2, 1 - Math.floor(Math.log10(a))));
  return a.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
}
/** HH:MM:SS.mmm in the viewer's clock — the plate's tick-by-tick stamp. */
function tapeClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  // mm:ss.mmm — the ticket's header already names the bar's hour.
  return `${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

import { anatomyReadingDrawn, type AnatomyInspectVM, type AnatomyTarget } from "@/lib/marketData/viewModels/anatomySelection";
import type { SelectedAnatomy } from "@/lib/marketData/viewModels/chartSelection";
import { ABSORPTION_ANATOMY_DEFAULTS, type EffortBasis } from "@/lib/marketData/selectAbsorptionAnatomy";
import { DECLINING_AT, EXTENDED_AT, FT_BARS, MAX_MARKS, MIN_PUSH_BARS } from "@/lib/marketData/viewModels/selectExhaustion";
import type { InspectTicketVM, TicketRow } from "@/lib/marketData/viewModels/selectInspectTicket";
import { MIN_DNA_ROWS, type ProfileDnaVM } from "@/lib/marketData/viewModels/selectProfileDna";
import type { ProfileSliceResult } from "@/lib/marketData/viewModels/selectProfileSlice";
import type { StructureZone } from "@/lib/marketData/viewModels/selectStructureZoneObjects";
import type { ObjectLineageVM, ZoneLineageVM } from "@/lib/marketData/viewModels/selectZoneLineage";
import {
  passportDockSide, passportPrice, selectPassportSlots,
  type PassportDock, type PassportMark, type PassportSlot, type PassportSlotId, type PassportSlotStatus,
} from "@/lib/marketData/viewModels/selectPassportSlots";
import type { MarketObject } from "@/lib/marketData/marketObjectKinds";
import type { LivingBiographyVM } from "@/lib/marketData/viewModels/selectLivingBiography";
import type { ClarityAnatomyVM } from "@/lib/marketData/viewModels/selectClarityAnatomy";
import { memoryLevelKindOf } from "@/lib/marketData/viewModels/selectMemoryMarketObjects";
import { scenarioHedge, type ConcentrationWall, type ExpiryScope, type OptionsBarrierEvidenceVM } from "@/lib/marketData/viewModels/selectOptionsBarrierEvidence";
import { useEscapeToClose } from "@/lib/a11y/useEscapeToClose";
import { InspectFirstTouchLine } from "./SelectionFirstTouch";

/** A refused row is the WARM colour, not the alarm colour. It is a fact about
 *  the feed, not a problem the trader caused. */
const UNREAD_COLOR = "#F0B429";

/**
 * ONE CLOCK WITH THE AXIS. Every time Inspect prints is in the chart's display
 * zone (the same IANA zone the time axis and crosshair use) and names that zone.
 * Before, the ticket printed labelled UTC beside an axis in the trader's zone —
 * honest, but the trader converted in their head (measured on serving
 * 2026-09-25: a push "06:18 – 06:21 UTC" under an axis reading 01:18).
 */
function zonedClock(timeZone: string | null | undefined) {
  let tz = timeZone || "UTC";
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { tz = "UTC"; }
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "short",
  });
  const parts = (ms: number) => {
    const o: Record<string, string> = {};
    for (const p of fmt.formatToParts(new Date(ms))) o[p.type] = p.value;
    return o;
  };
  return {
    /** "YYYY-MM-DD HH:MM", no zone word (pair with `zone`). */
    minute: (sec: number) => { const p = parts(sec * 1000); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; },
    hhmm: (sec: number) => { const p = parts(sec * 1000); return `${p.hour}:${p.minute}`; },
    /** The zone's short name at that instant (CDT, EST, UTC …). */
    zone: (sec: number) => parts(sec * 1000).timeZoneName ?? tz,
    /** "YYYY-MM-DD HH:MM ZZZ". */
    stamp: (sec: number) => { const p = parts(sec * 1000); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName ?? tz}`; },
    /** A tape row's clock, millisecond-exact: "HH:MM:SS.mmm" (pair with `zone`). */
    tick: (ms: number) => {
      const p = parts(ms);
      return `${p.hour}:${p.minute}:${p.second}.${String(((ms % 1000) + 1000) % 1000).padStart(3, "0")}`;
    },
    /** Millisecond-exact, zoned: "YYYY-MM-DD HH:MM:SS.mmm ZZZ". */
    exact: (ms: number) => {
      const p = parts(ms);
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}.${String(((ms % 1000) + 1000) % 1000).padStart(3, "0")} ${p.timeZoneName ?? tz}`;
    },
  };
}
const READ_COLOR = "#E8EAF2";

function Row({ row, sameReasonAsAbove = false }: { row: TicketRow; sameReasonAsAbove?: boolean }) {
  const read = row.state === "READ";
  return (
    <div className="pt-1" data-inspect-row={row.id} data-inspect-state={row.state}>
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold tracking-wide text-wm-muted">{row.label}</span>
        <span
          className="ml-auto text-[11px] font-bold tabular-nums"
          style={{ color: read ? READ_COLOR : UNREAD_COLOR }}
        >
          {read ? row.value : "UNREAD"}
        </span>
      </div>
      {/*
        THE REASON GOES ON THE GLASS.
        `title` is hover-only and a touch user never receives it. An UNREAD row
        whose reason lives in a tooltip tells the trader a number is missing and
        never which fact was missing — which is the whole content of the reading.
      */}
      {!read && row.absence && (
        <div className="pt-0.5 text-[10px] leading-snug" style={{ color: UNREAD_COLOR }}>
          {/* §16: one reason said once — a second UNREAD for the same reason points up. */}
          {sameReasonAsAbove ? "Same reason as above." : row.absence}
        </div>
      )}
    </div>
  );
}

/**
 * P-110 #5 · PROFILE DNA — the numbers behind the spine on the Living lane.
 * The glass carries only geometry (range, value bracket, POC notch, mass-centre
 * diamond); every figure that geometry stands for lives here, with the sample
 * and resolution it was measured at, or the reason nothing was measured.
 */
function ProfileDnaBlock({ dna, onGlass }: { dna: ProfileDnaVM; onGlass: boolean }) {
  const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
  const signed = (x: number | null) => (x == null ? "—" : `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}`);
  const px = (x: number | null) => (x == null ? "—" : String(+x.toPrecision(8)));
  const state = !onGlass ? "NOT_DRAWN" : dna.reason;
  const head =
    !onGlass ? "NOT DRAWN"
      : dna.reason === "MEASURED" ? `LIVING · ${dna.shape}`
        : dna.reason === "THIN_SAMPLE" ? `THIN SAMPLE · ${dna.rows} ROWS < ${MIN_DNA_ROWS}`
          : dna.reason === "FLAT_RANGE" ? "FLAT RANGE"
            : "NO PROFILE";
  return (
    <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-profile-dna={state}
      aria-label={dna.measured ? dna.strip : `Profile DNA: ${head}`} style={{ color: "#C8C0AE" }}>
      <div className="font-bold tracking-wide text-wm-gold">PROFILE DNA · {head}</div>
      {!onGlass ? (
        <div>The Living Profile is not on the glass, so DNA has nothing to sit on.</div>
      ) : dna.measured ? (
        <>
          <div>Value {pct(dna.valueWidth)} of range · POC at {pct(dna.pocPosition)}</div>
          <div>Mass centre {pct(dna.massCentre)} · {px(dna.massCentrePrice)}</div>
          <div>Skew {signed(dna.skew)} · excess kurtosis {signed(dna.excessKurtosis)}</div>
          <div>Sample {dna.rows} rows · {dna.bars} bars · row step {px(dna.rowStep)}</div>
          <div>Fidelity {dna.estimated ? "CANDLE-ESTIMATED — spine dashed" : "TRADE-BASED"} · v{dna.version}</div>
          <div>Where volume sat — never a forecast.</div>
        </>
      ) : dna.reason === "THIN_SAMPLE" ? (
        <div>Only the range is drawn (faint spine); too few traded rows for a shape.</div>
      ) : dna.reason === "FLAT_RANGE" ? (
        <div>Every traded row sits at one price — there is no shape to read.</div>
      ) : (
        <div>No measured Living Profile to describe — nothing is drawn.</div>
      )}
    </div>
  );
}

/**
 * A SELECTED SHELF OR MARK — the anatomy object the trader clicked, read from
 * the resolution the glass made of it this frame (`selectAnatomyInspect`) and
 * nothing else. Every number is an owner's: per-bar effort and displacement
 * and the zone from `selectAbsorptionAnatomy`, the push from `selectExhaustion`,
 * the four metrics from `selectAnatomyCards` asked about this object. The
 * thresholds print from the owners' own constants.
 *
 * WITHHELD, NOT BLANK: the anatomy owner publishes no wall, no touch times, no
 * hold test and no expected travel, so none is printed; the hold row names that
 * absence instead. On VOLUME the side is unknown and the words say so — effort
 * is traded volume, unsigned. No probability, no intent, no forecast.
 */
const ANATOMY_BASIS: Record<EffortBasis, string> = {
  SIGNED_DELTA: "DELTA · sides stamped by the provider — effort = |ask − bid| per bar",
  INFERRED_DELTA: "DELTA · INFERRED — the chart's tick accumulator split each bar; the venue did not stamp the sides",
  VOLUME: "VOLUME · effort = traded volume, unsigned · side UNKNOWN",
  UNMEASURED: "UNMEASURED — no volume and no split in this window",
};

function AnatomyRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2"><dt style={{ color: "#8B8676" }}>{k}</dt><dd className="text-white">{v}</dd></div>
  );
}

function AnatomyTicket({ sel, onClose, timeZone }: { sel: SelectedAnatomy; onClose: () => void; timeZone?: string | null }) {
  const r = sel.reading;
  const absorption = r.target.reading === "ABSORPTION";
  // The body is the CURRENT reading whenever the owners still measure it; only
  // when they do not does Inspect fall back to the last drawn reading, stamped
  // with the window it was measured on.
  const body: AnatomyInspectVM | null = r.card ? r : sel.lastDrawn;
  const bodyIsLast = body !== null && body !== r;
  const clock = zonedClock(timeZone);
  const utc = clock.minute;
  const hhmm = clock.hhmm;
  const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  const px = (v: number) => String(+v.toPrecision(8));
  const spanOf = (t: AnatomyTarget) => `${utc(t.startTime)} – ${hhmm(t.endTime)}`;
  const windowLine = (w: AnatomyInspectVM["window"]) =>
    w.from == null || w.to == null
      ? `${w.bars} bars in view`
      : `${w.bars} bars in view · ${utc(w.from)} – ${utc(w.to)} ${clock.zone(w.to)}${w.capped ? " · capped: the field keeps the right-hand end of the view" : ""}`;

  let status: string | null = null;
  if (r.state === "RESHAPED") {
    const now = r.zone
      ? `${utc(r.zone.startTime)} – ${hhmm(r.zone.endTime)}`
      : r.push ? `${utc(r.push.pushStartTime)} – ${hhmm(r.push.pushEndTime)}` : "—";
    status = `The ${absorption ? "run" : "push"} has changed since you selected it: ${spanOf(r.target)} → ${now} ${clock.zone(r.target.endTime)}.`;
  } else if (r.state === "NOT_GRADED_IN_WINDOW") {
    status = absorption
      ? `This window (${r.window.bars} bars) no longer grades it — every reading here is relative to the bars in view.`
      : r.push?.exhausted
        ? `Still exhausted in this window, but only the newest ${MAX_MARKS} marks are drawn.`
        : r.push
          ? "This window no longer grades it exhausted — the push is shown as it measures now."
          : `This window (${r.window.bars} bars) no longer measures a push there.`;
  } else if (r.state === "OUT_OF_VIEW") {
    status = "Its bars are outside the camera.";
  } else if (r.state === "UNMEASURED") {
    status = r.window.basis === "UNMEASURED"
      ? "Effort is not measured in this window — nothing is drawn."
      : "Too few bars in this window to grade a push — nothing is drawn.";
  }

  const Row = AnatomyRow;
  // Inspect stands on the wall AWAY from the object, so its candles stay in view.
  const wallClass = sel.wall === "LEFT" ? "top-2 left-2" : "top-16 right-[76px]";
  return (
    <section
      className={`absolute ${wallClass} z-[75] w-[272px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md`}
      data-testid="chart-inspect-ticket"
      data-inspect-anatomy={r.id}
      data-inspect-anatomy-state={r.state}
      aria-label={`Inspect selected ${absorption ? "absorption zone" : "exhaustion"}: ${r.state.replace(/_/g, " ").toLowerCase()}`}
    >
      <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
        <Crosshair size={11} /> {absorption ? "SELECTED ABSORPTION ZONE" : "SELECTED EXHAUSTION"}
        <button className="ml-auto" aria-label="Close the inspect ticket" onClick={onClose}><X size={12} /></button>
      </div>
      <InspectFirstTouchLine />
      <div className="mt-1 text-[11px] text-white">{sel.symbol} · {sel.timeframe} <span className="break-all font-mono text-[10px]" style={{ color: "#8B8676" }}>{r.id}</span></div>
      <div className="mt-1 text-[10px] font-bold tracking-wide" style={{ color: anatomyReadingDrawn(r) ? "#7FD1A6" : UNREAD_COLOR }}>
        {anatomyReadingDrawn(r) ? "ON THE GLASS" : r.state.replace(/_/g, " ")}
      </div>
      {status && <p className="mt-0.5 text-[10px] leading-snug" style={{ color: UNREAD_COLOR }} data-inspect-anatomy-status>{status}</p>}

      {absorption && r.state === "NOT_GRADED_IN_WINDOW" && r.bars.length > 0 && (
        <div className="mt-1.5 text-[10px] leading-snug" style={{ color: "#C8C0AE" }} data-inspect-anatomy-now>
          <div className="font-bold tracking-wide text-wm-muted">ITS BARS, AS THIS WINDOW GRADES THEM</div>
          {r.bars.map(b => (
            <div key={b.time} className="tabular-nums">{hhmm(b.time)} · effort {pct(b.effortNorm)} · displacement {pct(b.displacementNorm)}</div>
          ))}
        </div>
      )}

      {bodyIsLast && body && (
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] font-bold tracking-wide text-wm-muted" data-inspect-anatomy-last>
          LAST DRAWN READING · measured on {windowLine(body.window)}
        </div>
      )}
      {!body && (
        <p className="mt-1.5 text-[10px]" style={{ color: UNREAD_COLOR }}>No drawn reading to show — it has not been drawn since it was selected.</p>
      )}

      {body && absorption && body.zone && (() => {
        const z = body.zone;
        return (
          <dl className="mt-1.5 space-y-1 text-[11px] break-words" style={{ color: "#C8C0AE" }}>
            <Row k={`Span · ${clock.zone(z.startTime)}`} v={`${utc(z.startTime)} – ${hhmm(z.endTime)} · ${z.barCount} bars`} />
            <Row k="Band" v={`${px(z.priceLo)} – ${px(z.priceHi)}`} />
            <Row k="Effort basis" v={ANATOMY_BASIS[body.window.basis]} />
            <div>
              <div style={{ color: "#8B8676" }}>Per bar · effort · displacement · Δ (ask − bid)</div>
              {body.bars.map(b => (
                <div key={b.time} className="tabular-nums text-white">
                  {hhmm(b.time)} · {pct(b.effortNorm)} · {pct(b.displacementNorm)} · {b.delta == null ? "—" : `${b.delta >= 0 ? "+" : "−"}${Math.abs(b.delta).toLocaleString("en-US")}`}
                </div>
              ))}
            </div>
            {body.card?.metrics.map(m => (
              <Row key={m.label} k={m.label} v={<><span className="tabular-nums">{m.value}</span> · {m.word}</>} />
            ))}
            <div className="text-[10px]" style={{ color: "#8B8676" }}>
              Ratio legend &gt;5 STRONG · 2–5 MODERATE · &lt;2 WEAK{z.unbounded ? " · ∞ = the run displaced price not at all" : ""}
            </div>
            <Row k="Hold test" v={<span style={{ color: UNREAD_COLOR }}>NOT MEASURED — the anatomy owner publishes no wall or hold test. Opposing passive interest is not observed (no depth book); only price holding the band is.</span>} />
            <Row k="Method" v={`selectAbsorptionAnatomy · effort ≥ ${pct(ABSORPTION_ANATOMY_DEFAULTS.effortThreshold)} and displacement ≤ ${pct(ABSORPTION_ANATOMY_DEFAULTS.displacementThreshold)} of the window's own peak · ≥ ${ABSORPTION_ANATOMY_DEFAULTS.minZoneBars} consecutive bars · self-scaled over the bars in view — may change on pan`} />
            <Row k="Window" v={windowLine(body.window)} />
            <Row k="Version" v={`anatomy cards v${body.cardsVersion} · selection v${body.version}`} />
          </dl>
        );
      })()}

      {body && !absorption && body.push && (() => {
        const p = body.push;
        const effortWord = body.window.basis === "VOLUME" ? "traded volume" : body.window.basis === "UNMEASURED" ? "unmeasured" : "|ask − bid|";
        return (
          <dl className="mt-1.5 space-y-1 text-[11px] break-words" style={{ color: "#C8C0AE" }}>
            <Row k="Push" v={`${p.direction === "UP" ? "Up" : "Down"} · ${p.pushBars} bars · ${utc(p.pushStartTime)} – ${hhmm(p.pushEndTime)} ${clock.zone(p.pushEndTime)}`} />
            <Row k="Origin → extreme" v={`${px(p.originPrice)} → ${px(p.price)} · extreme at ${hhmm(p.time)}`} />
            <Row k="Effort 2nd ÷ 1st" v={p.aggressionLevel == null
              ? `NOT MEASURED · ${p.effortUnreportedBars > 0 ? `effort not reported on ${p.effortUnreportedBars} of ${p.pushBars} bars (${effortWord}) — a data gap is not a fade` : "no first-half effort to decline from"}`
              : `${pct(p.aggressionLevel)} · first half ${pct(p.effortFirstHalf)} · second half ${pct(p.effortSecondHalf)} of the window's peak (${effortWord}) · declining below ${pct(DECLINING_AT)}`} />
            <Row k="Extension" v={`${p.extension.toFixed(1)}× the window's median bar range · extended at ${EXTENDED_AT}×`} />
            <div>
              <div style={{ color: "#8B8676" }}>Follow-through · the {FT_BARS} bars after the push</div>
              {p.followBars.map(f => (
                <div key={f.time} className="tabular-nums text-white">{hhmm(f.time)} · reach {px(f.reach)} · {f.beyond ? "beyond the extreme" : "not beyond"}</div>
              ))}
              <div className="text-white">
                {p.followThrough == null
                  ? `PENDING (${p.followBars.length} of ${FT_BARS} bars after the push are in this window)`
                  : `${p.followThrough}/${FT_BARS} · ${p.followThrough === 0 ? "LOST" : "HELD"}`}
              </div>
            </div>
            <Row k="Energy transfer" v={p.energyTransfer == null
              ? (p.aggressionLevel == null ? "— (effort not reported — no ratio to take)" : p.effortSecondHalf === 0 ? "— (effort zero)" : "— (no first-half displacement)")
              : `${pct(p.energyTransfer)} · displacement per effort, 2nd half ÷ 1st`} />
            <Row k="Outcome" v={body.card?.outcome ?? "—"} />
            <Row k="Effort basis" v={ANATOMY_BASIS[body.window.basis]} />
            <Row k="Method" v={`selectExhaustion v${body.exhaustionVersion} · a push is ≥ ${MIN_PUSH_BARS} same-direction closes · exhausted = declining, extended and no follow-through`} />
            <Row k="Window" v={windowLine(body.window)} />
            <Row k="Version" v={`anatomy cards v${body.cardsVersion} · selection v${body.version}`} />
          </dl>
        );
      })()}

      <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>
        {absorption
          ? "Cannot separate absorption from an empty auction, a halt, or two large participants crossing. Resting orders are not observed (no book)."
          : "A fact about the push, not a forecast."}
      </p>
      <LearnThis kind="ANATOMY" />
    </section>
  );
}

/** §53 · the Academy door for a selection the Academy actually teaches. */
function LearnThis({ kind }: { kind: LearnableSelection }) {
  const from = typeof window === "undefined" ? INSTRUMENT_VIEW_ROUTE : window.location.pathname + window.location.search;
  return (
    <a
      href={learnHref(kind, from)}
      data-testid={`inspect-learn-${kind}`}
      className="mt-2 block rounded border border-wm-gold/40 px-2 py-1 text-[10px] font-semibold text-wm-gold hover:bg-wm-gold/10"
    >
      Learn this in the Academy → {LEARN_LESSON[kind].title} · then back to this chart
    </a>
  );
}

/*
  F11B · THE MARKET OBJECT PASSPORT DRAWER — `WM_NewMockup_85_F11B_Passport_Drawer`.
  "Not a room. Not a folder. A passport." One drawer for every kind ("Kind only
  changes the noun on the door"): a header, the eight slots in the plate's
  order — each a medallion, a title, two lines and a status mark — then the
  depth the Truth Microscope owes (every touch, every evidence id, the chain),
  and the footer: PASSPORT ID · INSPECTED · DECISION.

  Every word comes from `selectPassportSlots`, which reads the owners and says
  UNKNOWN where an owner is silent. This renders; it measures nothing.

  WHERE IT STANDS. The drawer takes the wall AWAY from the selected object,
  measured from the object's own pin on the glass (`passportDockSide`), so the
  candles it describes stay in view — the plate draws the object beside it.
*/
const PASSPORT_MEDALLION: Record<PassportSlotId, typeof Crosshair> = {
  BIRTH_SOURCE: Fingerprint,
  AGE: Hourglass,
  TOUCHES: Target,
  DEFENSES: ShieldCheck,
  CONSUMPTION: Gauge,
  DECAY: TrendingDown,
  INVALIDATION: Ban,
  FIDELITY: BadgeCheck,
};
const PASSPORT_MARK: Record<PassportMark, typeof Crosshair> = {
  CHECK: Check,
  CLOCK: Clock,
  SHIELD: Shield,
  CROSS: X,
  UNKNOWN: CircleDashed,
};
/** Status → the palette owner's tone. A broken object is a boundary (objection), not a failure of the system (warn). */
const PASSPORT_TONE: Record<PassportSlotStatus, Parameters<typeof wmToneColor>[0]> = {
  OK: "ok",
  WATCH: "watch",
  FAIL: "objection",
  UNKNOWN: "neutral",
};
const PASSPORT_WIDTH = 360;

function PassportSlotRow({ s }: { s: PassportSlot }) {
  const Medallion = PASSPORT_MEDALLION[s.icon];
  const Mark = PASSPORT_MARK[s.mark];
  const tone = wmToneColor(PASSPORT_TONE[s.status]);
  const pct = s.meter != null ? Math.round(s.meter * 100) : null;
  return (
    <li className="flex items-center gap-3 px-3 py-1.5" data-passport-slot={s.id} data-passport-status={s.status}
      aria-label={`${s.title}: ${s.primary}. ${s.secondary}. ${s.status === "UNKNOWN" ? "Not measured" : s.status.toLowerCase()}.`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border" aria-hidden
        style={{ borderColor: WM.gold.line, color: WM.gold.hero, background: WM.surface.deep }}>
        {pct != null
          ? <span className="text-[10.5px] font-bold tabular-nums">{pct}%</span>
          : <Medallion size={16} strokeWidth={1.6} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold tracking-[0.1em]" style={{ color: WM.gold.hero }}>{s.title}</span>
        <span className="block text-[12.5px] leading-[1.3]" style={{ color: s.status === "UNKNOWN" ? WM.text.body : WM.text.hero }}>{s.primary}</span>
        <span className="block text-[11px] leading-[1.3]" style={{ color: WM.text.muted }}>{s.secondary}</span>
        {pct != null && (
          <span className="mt-1 flex items-center gap-2" data-passport-meter={pct}>
            <span className="relative h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: WM.surface.highest }}>
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: WM.gold.hero }} />
            </span>
            <span className="w-9 text-right text-[11px] font-bold tabular-nums" style={{ color: WM.text.hero }}>{pct}%</span>
          </span>
        )}
      </span>
      <span className="shrink-0" style={{ color: tone }} data-passport-mark={s.mark}>
        <Mark size={17} strokeWidth={2} aria-hidden />
      </span>
    </li>
  );
}

function PassportDrawer({
  object,
  zone,
  lineage,
  activeDecisionId,
  timeZone,
  onClose,
}: {
  object: MarketObject;
  zone: StructureZone | null;
  lineage: ObjectLineageVM | null;
  activeDecisionId: string | null;
  timeZone: string | null;
  onClose: () => void;
}) {
  const clock = zonedClock(timeZone);
  const t = clock.stamp;
  const memoryKind = zone ? null : memoryLevelKindOf(object.objectId);
  const levelOrigin = memoryKind ? `Prior-session ${memoryKind}`
    : object.objectId.endsWith(":HIGH") ? "Swing high" : object.objectId.endsWith(":LOW") ? "Swing low" : null;
  // Only a lineage compiled for THIS object is printed beside it.
  const own = lineage?.objectId === object.objectId ? lineage : null;
  const vm = selectPassportSlots({
    object, zone, lineage: own, originWord: levelOrigin,
    levelOwner: zone ? null : memoryKind ? "MEMORY" : "STRUCTURE",
    decisionId: activeDecisionId, stamp: t,
  });
  const px = passportPrice;
  const price = object.priceLow === object.priceHigh ? px(object.priceHigh) : `${px(object.priceLow)} – ${px(object.priceHigh)}`;
  const noun = zone
    ? `${zone.side === "DEMAND" ? "Demand" : "Supply"} zone · ${price}`
    : `${object.kind === "LEVEL" ? "Level" : object.kind} · ${price}${levelOrigin ? ` · ${levelOrigin.toLowerCase()}` : ""}`;
  const stateTone = wmToneColor(PASSPORT_TONE[vm.state === "INVALID" ? "FAIL" : vm.state === "CONSUMED" || vm.state === "TESTED" ? "WATCH" : "OK"]);

  // THE WALL AWAY FROM THE OBJECT — measured from its pin on the glass.
  const ref = React.useRef<HTMLElement>(null);
  const [dock, setDock] = React.useState<PassportDock>("LEFT");
  const [objectX, setObjectX] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    const host = el?.offsetParent as HTMLElement | null;
    if (!el || !host) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const sel = `[data-market-object-target="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(object.objectId) : object.objectId}"]`;
      const pin = host.querySelector(sel) as HTMLElement | null;
      const hr = host.getBoundingClientRect();
      const pr = pin?.getBoundingClientRect();
      const x = pr && pr.width > 0 ? Math.round(pr.left + pr.width / 2 - hr.left) : null;
      setObjectX(x);
      setDock(passportDockSide({ objectX: x, paneWidth: hr.width, drawerWidth: el.offsetWidth || PASSPORT_WIDTH }));
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    // A pan moves the pin (its inline `left`); a resize moves the walls.
    const mo = new MutationObserver(schedule);
    mo.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(host);
    return () => { mo.disconnect(); ro?.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [object.objectId]);

  const lc = zone?.lifecycle ?? null;
  const heldWord = zone?.side === "DEMAND" ? "held above" : "held below";
  const Head = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] font-bold tracking-[0.1em]" style={{ color: WM.gold.hero }}>{children}</div>
  );
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="grid grid-cols-[92px_1fr] gap-2 text-[11.5px] leading-[1.4]"><span style={{ color: WM.text.muted }}>{k}</span><span style={{ color: WM.text.hero }}>{v}</span></div>
  );
  return (
    <section ref={ref}
      className={`absolute top-2 ${dock === "RIGHT" ? "right-[76px]" : "left-2"} max-w-[calc(100%-1rem)] max-h-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-wm-gold/40 shadow-2xl`}
      // Opaque and above the chart's own chips: the passport is the object
      // being read, so nothing on the glass may show through or sit on it.
      style={{ width: PASSPORT_WIDTH, background: "#0d0c0a", zIndex: 80 }}
      data-testid="chart-inspect-ticket"
      data-inspect-zone={zone ? object.objectId : undefined}
      data-inspect-object={zone ? undefined : object.objectId}
      data-inspect-kind={zone ? undefined : object.kind}
      data-passport-dock={dock}
      data-passport-object-x={objectX ?? undefined}
      aria-label={zone
        ? `Market object passport. ${zone.side} zone ${object.priceLow} to ${object.priceHigh}. ${vm.state}.`
        : `Market object passport. ${object.kind} ${price}. ${vm.state}.`}>
      <div className="border-b border-wm-border px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <IdCard size={20} style={{ color: WM.gold.hero }} aria-hidden />
          <div className="text-[13px] font-bold tracking-[0.1em]" style={{ color: WM.gold.hero }}>MARKET OBJECT PASSPORT</div>
          <Lock size={14} className="ml-auto" style={{ color: WM.gold.mark }} aria-label="Read-only: the passport remembers, it is not edited" />
          <button className="ml-1" aria-label="Close the passport" onClick={onClose}><X size={14} /></button>
        </div>
        <InspectFirstTouchLine />
        {/* D ≈ 0 — depth zero: the object, its lineage and its decision in ONE inspect (inspectChain.ts). */}
        <div className="mt-0.5 text-center text-[11px] tracking-[0.2em]" style={{ color: WM.text.body }} title="Depth zero — one inspect, the chart stays">D ≈ 0</div>
        <div className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: WM.text.body }}>
          <span className="min-w-0 truncate">{noun}</span>
          <span className="ml-auto shrink-0 rounded border px-1.5 text-[10px] font-bold tracking-[0.08em]" data-passport-state={vm.state}
            style={{ color: stateTone, borderColor: stateTone }}>{vm.state}</span>
        </div>
      </div>

      <ol className="divide-y divide-wm-border/70" data-testid="passport-slots">
        {vm.slots.map(s => <PassportSlotRow key={s.id} s={s} />)}
      </ol>

      {/* THE TRUTH MICROSCOPE — deep, below the slots: every touch and its response. */}
      {lc && lc.touches.length > 0 && (
        <div className="space-y-1.5 border-t border-wm-border px-3 py-2.5">
          <Head>TOUCH TIMELINE</Head>
          <div className="relative mt-1 flex justify-between px-1" data-testid="passport-touch-timeline">
            <div className="absolute left-2 right-2 top-[6px] h-px" style={{ background: WM.gold.hair }} aria-hidden />
            {lc.touches.map(tc => (
              <div key={tc.start} className="relative flex flex-col items-center gap-1">
                <span className="h-[12px] w-[12px] rounded-full" style={{
                  background: tc.response === "INVALIDATED" ? WM.state.objection : tc.response === "OPEN" ? "transparent" : WM.gold.hero,
                  border: `1px solid ${WM.gold.hero}` }} />
                <span className="text-[10.5px]" style={{ color: WM.text.body }}>{t(tc.start).slice(5, 16)}</span>
              </div>
            ))}
          </div>
          <Head>RESPONSE HISTORY</Head>
          <ol className="space-y-0.5" data-testid="passport-response-history">
            {lc.touches.map((tc, i) => (
              <li key={tc.start} className="grid grid-cols-[14px_1fr_auto_auto] gap-2 text-[11.5px]">
                <span style={{ color: WM.text.muted }}>{i + 1}</span>
                <span style={{ color: WM.text.hero }}>{t(tc.start).slice(5, 16)}</span>
                <span style={{ color: tc.response === "REJECTED" ? WM.gold.hero : tc.response === "INVALIDATED" ? WM.state.objection : WM.text.hero }}>
                  {tc.response === "REJECTED" ? "Rejection" : tc.response === "INVALIDATED" ? "Close beyond" : "Open"}{tc.swept ? " · swept" : ""}
                </span>
                <span className="tabular-nums" style={{ color: WM.text.muted }}>
                  {tc.depth != null ? `${Math.round(tc.depth * 100)}% deep` : "—"}{tc.response === "REJECTED" ? ` · ${heldWord}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* GARDEN 12 · LINEAGE, by id, from the owners verbatim (selectObjectLineage):
          the object, its session, the birth bar's admitted source and
          provenance, every evidence id, the owners and version, and the chain
          BAR → OBJECT → DECISION. The Decision_ID sits BESIDE the object,
          never merged; nothing reprints the bar. */}
      <div className="space-y-1 border-t border-wm-border px-3 py-2.5" data-testid="passport-provenance"
        data-inspect-lineage={own ? own.birth.state : "NOT_COMPILED"}>
        <Head>LINEAGE</Head>
        <Row k="Object" v={<span className="break-all font-mono text-[11px]">{object.objectId}</span>} />
        {own ? (
          <>
            <Row k="Kind" v={`${own.kind} · session ${own.sessionId}`} />
            <Row k="Birth bar" v={own.birth.state === "READ"
              ? <span className="break-all font-mono text-[11px]">{own.birth.line}</span>
              : <span style={{ color: UNREAD_COLOR }}>{own.birth.absence} <span className="break-all font-mono text-[11px]">{own.birth.barId}</span></span>} />
            <Row k="Evidence" v={own.evidence.length === 0 ? "none attached" : (
              <ol className="space-y-0.5" data-testid="passport-evidence">
                {own.evidence.map(e => (
                  <li key={e.id}><span className="break-all font-mono text-[11px]">{e.id}</span> <span style={{ color: WM.text.muted }}>· {e.role === "BIRTH" ? "birth" : "test"}</span></li>
                ))}
              </ol>
            )} />
            <Row k="Method" v={own.method} />
            <div data-inspect-chain={own.chain.state}>
              <Row k="Chain" v={own.chain.state === "READ"
                ? <span className="break-all font-mono text-[11px]">{own.chain.line}</span>
                : <span style={{ color: UNREAD_COLOR }}>{own.chain.reason}</span>} />
            </div>
          </>
        ) : (
          <>
            <Row k="Born on bar" v={<span className="break-all font-mono text-[11px]">{object.birthBarId}</span>} />
            <Row k="Lineage" v={<span style={{ color: UNREAD_COLOR }}>Not compiled for this object.</span>} />
          </>
        )}
      </div>

      {/* The footer stays on the glass while the depth above it scrolls: the
          plate's last line is the PASSPORT ID, and an id below the fold is an
          id the trader never reads. Opaque, so nothing scrolls through it. */}
      <footer className="sticky bottom-0 space-y-0.5 border-t border-wm-border px-3 py-2 text-[10.5px] tracking-[0.06em]" style={{ color: WM.text.body, background: "#0d0c0a" }}
        data-testid="passport-footer" data-passport-id={vm.footer.passportId} data-passport-decision={vm.footer.decision.state}>
        <div><span style={{ color: WM.text.muted }}>PASSPORT ID:</span> <span className="break-all font-mono" title={vm.footer.objectId}>{vm.footer.passportId}</span></div>
        <div><span style={{ color: WM.text.muted }}>INSPECTED AS OF:</span> <span className="tabular-nums">{vm.footer.inspectedLine}</span></div>
        <div><span style={{ color: WM.text.muted }}>DECISION:</span> <span className="break-all">{vm.footer.decision.line}</span></div>
      </footer>
    </section>
  );
}

/* ═══ F07B · CLUSTER / RESPONSE INSPECT (WM_NewMockup_77) ═══════════════════
   The plate's right panel: RELATIVE SIZE VS SESSION (percentile + meter),
   CLUSTER COUNT + BARS TOUCHED, SUBSEQUENT RESPONSE — and OUTCOME UNKNOWN
   while the response bars are beyond the observed window. Every number is
   an owner's: the session rank from footprintCanon's sessionSizePercentile
   (taken at the click), the response from selectPrintResponse over the
   chart's own closed bars, live. */

function F07Card({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) {
  return (
    <div className="mt-2 rounded border border-wm-border p-2" data-testid={testId}>
      <div className="text-[10px] font-bold tracking-wide text-wm-gold">{title}</div>
      {children}
    </div>
  );
}

function SessionRankCard({ rank, combined }: { rank: { pct: number | null; prints: number } | null | undefined; combined: boolean }) {
  if (!rank) return null;
  const pct = rank.pct;
  // One owner of the words (footprintCanon.sessionRankWords) and of the subject
  // (bigTradeRankSize): a cluster is ranked by its LARGEST member print.
  const words = sessionRankWords(pct, rank.prints, combined);
  return (
    <F07Card title="RELATIVE SIZE VS SESSION" testId="inspect-session-rank">
      {pct == null ? (
        <div className="text-[11px]" style={{ color: UNREAD_COLOR }}>{words.caption}</div>
      ) : (
        <>
          <div className="text-[18px] font-bold leading-tight text-wm-gold" data-session-pct={(Math.floor(pct * 1000) / 10).toFixed(1)}>{words.headline}</div>
          <div className="text-[10px]" style={{ color: "#C8C0AE" }}>PERCENTILE</div>
          <div className="mt-1 h-1.5 w-full rounded-sm" style={{ background: "#2A2618" }} aria-hidden>
            <div className="h-1.5 rounded-sm" style={{ width: `${Math.max(1, Math.floor(pct * 1000) / 10)}%`, background: "#E8B85C" }} />
          </div>
          <div className="mt-1 text-[10px]" style={{ color: "#C8C0AE" }}>
            {words.caption}
          </div>
        </>
      )}
    </F07Card>
  );
}

const fmtMove = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 0 : v >= 1 ? 2 : 4 });

function LocationCard({ loc, fmt }: { loc: PrintLocationVM | null; fmt: (n: number) => string }) {
  if (!loc) return null;
  return (
    <F07Card title="LOCATION IN STRUCTURE" testId="inspect-print-location">
      {loc.location === "UNREAD" ? (
        <div className="text-[11px]" style={{ color: UNREAD_COLOR }}>NOT PLACED · {loc.note}</div>
      ) : (
        <>
          <div className="text-[12px] font-bold text-white" data-print-location={loc.location}>{loc.note.toUpperCase()}</div>
          <div className="text-[10px]" style={{ color: "#C8C0AE" }}>
            last high {loc.lastHigh ? fmt(loc.lastHigh.price) : "—"} · last low {loc.lastLow ? fmt(loc.lastLow.price) : "—"}{loc.bias ? ` · structure ${loc.bias.replace(/_/g, " ").toLowerCase()}` : ""}
          </div>
          <div className="text-[10px]" style={{ color: "#C8C0AE" }}>swings confirmed before the print only · "at" = within {(loc.tolerance * 100).toFixed(2)}%</div>
        </>
      )}
    </F07Card>
  );
}

function ResponseCard({ pr }: { pr: PrintResponseVM | null | undefined }) {
  if (!pr) return null;
  if (!pr.drawn) {
    return (
      <F07Card title="SUBSEQUENT RESPONSE" testId="inspect-response">
        <div className="text-[11px]" style={{ color: UNREAD_COLOR }} data-response-verdict={pr.reason}>
          NOT MEASURED · {pr.reason === "NO_PRIOR_RANGE" ? "no ranged bar before the print to measure against" : pr.reason === "PRINT_OUTSIDE_BARS" ? "the print is outside the loaded bars" : "no bars"}
        </div>
      </F07Card>
    );
  }
  if (pr.verdict === "PENDING") {
    return (
      <F07Card title="OUTCOME UNKNOWN" testId="inspect-response">
        <div className="text-[11px] text-white" data-response-verdict="PENDING">Beyond observed window</div>
        <div className="text-[10px]" style={{ color: "#C8C0AE" }}>
          {pr.responseBars} of {RESPONSE_BARS} response bars closed · future path not determined
        </div>
        {pr.responseBars > 0 && (
          <div className="text-[10px]" style={{ color: "#C8C0AE" }}>So far: +{fmtMove(pr.withForce)} with the force · −{fmtMove(pr.againstForce)} against</div>
        )}
      </F07Card>
    );
  }
  return (
    <F07Card title="SUBSEQUENT RESPONSE" testId="inspect-response">
      <div className="text-[14px] font-bold text-white" data-response-verdict={pr.verdict}>{pr.verdict}</div>
      <div className="text-[11px]" style={{ color: "#C8C0AE" }}>+{fmtMove(pr.withForce)} with the force · −{fmtMove(pr.againstForce)} against</div>
      <div className="text-[10px]" style={{ color: "#C8C0AE" }}>next {RESPONSE_BARS} closed bars · yardstick: median bar range {fmtMove(pr.medianRange)} · a measurement, not a forecast</div>
    </F07Card>
  );
}

/**
 * Garden 18 super order §5 — the options evidence beside a pressure wall:
 * positioning (OBSERVED), every zero-gamma root, and gamma / vanna / charm each
 * on its own with a stated scenario. Never a support/resistance or pin claim.
 */
function OptionsEvidenceBlock({ ev, px, onScope }: { ev: OptionsBarrierEvidenceVM | null; px: (v: number) => string; onScope?: (scope: ExpiryScope) => void }) {
  if (!ev) return null;
  // Expiry scope is the reader's choice and is named in every receipt.
  const scopes = onScope ? (
    <span role="group" aria-label="Option expiries in scope" className="ml-1 inline-flex gap-1">
      {(["ALL", "NEAREST", "0DTE"] as const).map(sc => (
        <button key={sc} type="button" aria-pressed={ev.scope === sc} onClick={() => onScope(sc)}
          className="rounded border px-1 text-[9px]" style={{ borderColor: ev.scope === sc ? "#c9a55c" : "#3a3328", color: ev.scope === sc ? "#e8b923" : "#a89c80" }}>
          {sc === "ALL" ? "All" : sc === "NEAREST" ? "Nearest" : "0DTE"}
        </button>
      ))}
    </span>
  ) : null;
  if (!ev.drawn) {
    return <div data-inspect-options-evidence={ev.receipt}>Options evidence · not compiled ({ev.reason.replace(/_/g, " ").toLowerCase()}, scope {ev.scope}){scopes}</div>;
  }
  const oi = (ws: readonly ConcentrationWall[]) =>
    ws.length ? ws.map(w => `${px(w.strike)} (${w.openInterest.toLocaleString()} OI · ${(w.share * 100).toFixed(0)}%${w.volume != null ? ` · vol ${w.volume.toLocaleString()}` : ""})`).join(", ") : "none above 5% of side OI";
  const roots = ev.rootKind === "NONE" ? "none in ±20%" : ev.rootKind === "ONE" ? `one, at ${px(ev.zeroGammaRoots[0])}` : `${ev.zeroGammaRoots.length} crossings — ${ev.zeroGammaRoots.map(px).join(", ")} (no single "flip" level)`;
  const sh = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })} sh`;
  // Price-only: a time scenario would cross today's expiries, where linear
  // greeks do not hold — charm is shown above as a current rate instead.
  const day = scenarioHedge(ev, { dS: ev.spot * 0.01, dVolPoints: 0, dDays: 0 });
  return (
    <div data-inspect-options-evidence={ev.receipt} className="mt-1 border-t border-wm-border pt-1">
      <div className="font-bold tracking-wide text-wm-gold">OPTIONS EVIDENCE · {ev.scope === "ALL" ? "all live expiries" : ev.scope === "NEAREST" ? `nearest expiry ${ev.expiries[0] ?? ""}` : "expiring today"} · {ev.contracts} contracts{ev.excludedNoIv ? ` · ${ev.excludedNoIv} without IV excluded` : ""}{scopes}</div>
      <div>Call-OI concentration (OBSERVED) · {oi(ev.callWalls)}</div>
      <div>Put-OI concentration (OBSERVED) · {oi(ev.putWalls)}</div>
      <div className="text-wm-text-dim">Positioning only — a call wall is not resistance and a put wall is not support.</div>
      <div>Zero-gamma roots (INFERRED) · {roots}</div>
      <div>Assumed-dealer delta per greek (INFERRED) · gamma {sh(ev.totals.gamma)} per $1 · vanna {sh(ev.totals.vannaPerVolPoint)} per vol point · charm {sh(ev.totals.charmPerDay)} per day elapsed (a rate now{ev.minTauDays < 1 ? " — contracts expiring today make it non-linear" : ""})</div>
      {day && (
        <div>Scenario +1% move, vol and time unchanged · from gamma {sh(day.fromGamma)} · hedge {day.hedgeSide === "NONE" ? "none" : `${day.hedgeSide.toLowerCase()} ≈$${(Math.abs(day.hedgeNotional) / 1e6).toFixed(1)}M`} — a model of hedging pressure, not a direction call</div>
      )}
    </div>
  );
}

export function ChartInspectTicket({
  vm,
  /** True when the bar shown is the live one because the cursor is nowhere. */
  followingLiveBar,
  open,
  onOpenChange,
  onOpenFootprint,
  selectedPrint = null,
  structure = null,
  selectedProfileSlice = null,
  profileSliceSymbol = "",
  profileSliceAsOf = null,
  selectedZone = null,
  zoneLineage = null,
  selectedLevel = null,
  levelLineage = null,
  selectedAnatomy = null,
  activeDecisionId = null,
  contradiction = null,
  memoryGhost = null,
  memoryGhostFrozenAsOf = null,
  envelope = null,
  mtfAncestry = null,
  pressureWall = null,
  pressureFront = null,
  weatherLens = null,
  priceDp = null,
  fusion = null,
  profileDna = null,
  profileDnaOnGlass = false,
  timeZone = null,
  livingBiography = null,
  clarity = null,
  printResponse = null,
  onSelectPrint,
}: {
  vm: InspectTicketVM;
  followingLiveBar: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Takes the trader to the surface that divides this bar by price level. */
  onOpenFootprint: () => void;
  selectedPrint?: SelectedBigTrade | null;
  /** The ONE structure owner's read (for a print's location in structure). */
  structure?: MarketStructureVM | null;
  /** H-601 · a clicked Living Profile bucket, resolved by `selectProfileSlice`. */
  selectedProfileSlice?: ProfileSliceResult | null;
  profileSliceSymbol?: string;
  /** Unix seconds of the newest bar the profile was built from. */
  profileSliceAsOf?: number | null;
  /** F11 · a selected swing-origin ZONE — its Passport. */
  selectedZone?: StructureZone | null;
  /** The selected zone's LINEAGE (selectZoneLineage) — ids, provenance and the Decision_ID chain. */
  zoneLineage?: ZoneLineageVM | null;
  /** F11 · a selected MarketObject that is not a zone (a swing LEVEL) — the same Passport drawer. */
  selectedLevel?: MarketObject | null;
  /** Its LINEAGE (selectObjectLineage) — printed only when compiled for THIS object. */
  levelLineage?: ObjectLineageVM | null;
  /** A selected absorption shelf or exhaustion mark, with the glass's current resolution of it. */
  selectedAnatomy?: SelectedAnatomy | null;
  /** The DECISION_ID born on this camera, if any — shown beside the object, never merged into it. */
  activeDecisionId?: string | null;
  /** H-401 · "Passport shows both family lines." */
  contradiction?: ContradictionVM | null;
  /** H-201 · "Analogue sample / mismatch belongs in Inspect." */
  memoryGhost?: MemoryGhostVM | null;
  /** H-201 · set when the ghost was CLICKED: the analogue's own last bar
   *  (unix s). `memoryGhost` is then the reading frozen at the click. */
  memoryGhostFrozenAsOf?: number | null;
  /** H-801 · the envelope and its surprise, as counts of this chart's sessions. */
  envelope?: ExpectedEnvelopeVM | null;
  /** T-210 · the ancestry the glass painted: 4H band · 1H node · D shelf, or each one's silence. */
  mtfAncestry?: MtfAncestryVM | null;
  /** Garden 15 §5 — the selected pressure wall (by strike) and the world it stands in. */
  pressureWall?: { strike: number; vm: DerivativesPressureVM; evidence?: OptionsBarrierEvidenceVM | null; onScope?: (scope: ExpiryScope) => void } | null;
  /** Garden 15 §4 — the selected zero-gamma front: the derivatives environment itself. */
  pressureFront?: DerivativesPressureVM | null;
  /** F08B · the room's ONE weather reading, when the lens is selected. */
  weatherLens?: LiquidityWeatherVM | null;
  /** The market's display decimals, from displayPrecisionFor (the one display owner). */
  priceDp?: number | null;
  /** H-601 #3 · the fused profile object — sources, method, recomputed levels. */
  fusion?: FusedProfileObject | null;
  /** P-110 #5 · the DNA reading when the layer is on; null when it is off. */
  profileDna?: ProfileDnaVM | null;
  /** True when the Living Profile DNA sits on is actually drawn this frame. */
  profileDnaOnGlass?: boolean;
  /** The chart's display zone (IANA) — the axis's clock. Every printed time uses it and names it. */
  timeZone?: string | null;
  /** H-601 · the Living Profile's session lineage (selectLivingBiography), for the slice ticket. */
  livingBiography?: LivingBiographyVM | null;
  /** F05 · the selected bar's own anatomy (selectClarityAnatomy), read on its prices. */
  clarity?: ClarityAnatomyVM | null;
  /** F07B · SUBSEQUENT RESPONSE of the selected print / cluster anchor (selectPrintResponse, live). */
  printResponse?: PrintResponseVM | null;
  /** F07B · select one member of a selected cluster — the room's one selection. */
  onSelectPrint?: (print: SelectedBigTrade) => void;
}) {
  // T-210 · MTF prices at the market's display decimals (the band's body is raw bar prices).
  const mtfPx = (v: number) => (priceDp != null ? v.toFixed(priceDp) : String(+v.toPrecision(8)));
  const clock = zonedClock(timeZone);
  // Super order §4 (2026-10-05): Inspect closes on Escape like every other panel.
  useEscapeToClose(open, () => onOpenChange(false));
  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Open the inspect ticket for the bar under the cursor"
        data-testid="chart-inspect-reopen"
        className="wm-chart-reading-anchor wm-tap-slop absolute top-16 right-[76px] z-20 flex items-center gap-1 rounded border px-2 h-6 text-[10px] font-bold tracking-wide"
        style={{ background: "#131520", borderColor: "#1E2030", color: "#8B8FA8" }}
      >
        <Crosshair size={10} />
        INSPECT
      </button>
    );
  }

  /*
    H-601 · SELECTED PROFILE SLICE. The same ticket, the same place, one more
    kind of selected object. It says only what the profile compiler measured
    about the bucket, and the profile's fidelity — never an intent, never a
    call. A click that found no traded bucket says so instead of going quiet.
  */
  /*
    F11 / F11B · MARKET OBJECT PASSPORT — a selected ZONE or LEVEL opens the
    ONE drawer (PassportDrawer). "Kind only changes the noun on the door. The
    drawer layout does not change." Every line is an owner's; a slot whose
    owner is silent says so (selectPassportSlots).
  */
  if (selectedZone || selectedLevel) {
    const object = selectedZone ? selectedZone.object : selectedLevel!;
    return (
      <PassportDrawer
        object={object}
        zone={selectedZone}
        lineage={selectedZone ? zoneLineage : levelLineage}
        activeDecisionId={activeDecisionId}
        timeZone={timeZone}
        onClose={() => onOpenChange(false)}
      />
    );
  }

  if (selectedAnatomy) {
    return <AnatomyTicket sel={selectedAnatomy} onClose={() => onOpenChange(false)} timeZone={timeZone} />;
  }

  if (selectedProfileSlice) {
    const sl = selectedProfileSlice;
    const fmt = (n: number) => n.toFixed(2);
    // §40 · INSPECT STANDS ON THE WALL AWAY FROM THE OBJECT (Garden 16,
    // 2026-09-26, found on the glass: TSLA 15m, a click on the Living body at
    // its POC opened this ticket on the RIGHT wall — over the profile body it
    // was describing and the newest candles). The Living lane is always
    // anchored at the price axis, so its slice is read from the LEFT wall, the
    // same rule the anatomy ticket already follows. It stays below the header row
    // (top-16): at top-2 it covered the symbol and last price.
    return (
      <section className="absolute top-16 left-2 z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
        data-testid="chart-inspect-ticket"
        data-inspect-profile-slice={sl.found ? String(sl.price) : sl.miss}
        aria-label={sl.found ? `Inspect profile slice at ${fmt(sl.price)}` : "Inspect profile slice: no traded bucket at that price"}>
        <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
          <Crosshair size={11} /> PROFILE SLICE · LIVING
          <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
        </div>
        <InspectFirstTouchLine />
        {sl.found ? (
          <>
            <div className="mt-2 text-[11px] text-white">{profileSliceSymbol} · {fmt(sl.price)} – {fmt(sl.priceHigh)}{sl.isPoc ? " · POC" : ""}</div>
            <dl className="mt-2 text-[11px] break-words space-y-1" style={{ color: "#C8C0AE" }}>
              <dt>Volume vs POC bucket</dt><dd className="text-white">{Math.round(sl.shareOfPoc * 100)}%</dd>
              <dt>Location</dt><dd className="text-white">{sl.location === "IN_VALUE" ? "Inside value" : sl.location === "ABOVE_VALUE" ? "Above value" : "Below value"}</dd>
              <dt>Distance from POC</dt><dd>{sl.distanceFromPoc == null ? "UNKNOWN" : `${sl.distanceFromPoc >= 0 ? "+" : ""}${fmt(sl.distanceFromPoc)}`}</dd>
              <dt>Node</dt><dd>{sl.node ?? (sl.nodesWithheld ? "WITHHELD — candle-estimated profile" : "none")}</dd>
              <dt>Fidelity</dt><dd>{sl.estimated ? "CANDLE-ESTIMATED — bar volume spread over each bar's range" : "TRADE-BASED — prints placed at their price"}</dd>
              <dt>As of</dt><dd>{profileSliceAsOf != null ? clock.exact(profileSliceAsOf * 1000) : "UNKNOWN"}</dd>
            </dl>
            <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>A bucket is where size traded, not who traded it or why. Intent: UNKNOWN.</p>
            {livingBiography && (
              // H-601 · the auction's biography — the same owner the glass's
              // movie draws from (selectValueMigration), current session only.
              <div className="mt-2 border-t border-wm-border pt-2" data-testid="living-biography">
                <div className="text-[10px] font-bold tracking-wide text-wm-gold">BIOGRAPHY · THIS SESSION</div>
                <dl className="mt-1 text-[11px] break-words space-y-1" style={{ color: "#C8C0AE" }}>
                  <dt>Session</dt><dd className="text-white">from {clock.stamp(livingBiography.sessionStart)} · {livingBiography.bars} bars</dd>
                  <dt>POC</dt><dd className="text-white">{fmt(livingBiography.firstPoc)} → {fmt(livingBiography.currentPoc)} · {livingBiography.migrations === 0 ? "never moved" : `migrated ${livingBiography.migrations}×`}</dd>
                  {livingBiography.migrations > 0 && (
                    <dd data-testid="living-poc-path">{livingBiography.pocPath.slice(-5).map(p => `${clock.hhmm(p.time)} ${fmt(p.poc)}`).join(" → ")}</dd>
                  )}
                  <dt>Value</dt><dd className="text-white">{livingBiography.width} · width {fmt(livingBiography.valueWidthFirst)} → {fmt(livingBiography.valueWidthNow)} · {livingBiography.drift}{livingBiography.drift !== "HELD" ? ` ${fmt(Math.abs(livingBiography.midpointShift))}` : ""}</dd>
                  <dt>Method</dt><dd>selectValueMigration · developing POC/VA after every bar · {livingBiography.quality}</dd>
                </dl>
              </div>
            )}
            {profileDna && <ProfileDnaBlock dna={profileDna} onGlass={profileDnaOnGlass} />}
          </>
        ) : (
          <p className="mt-2 text-[11px]" style={{ color: UNREAD_COLOR }}>
            {sl.miss === "NO_PROFILE" ? "No Living Profile is drawn, so there is no slice to read." : "No traded bucket at that price. The profile took no volume there."}
          </p>
        )}
        <LearnThis kind="PROFILE_LEVEL" />
       </section>
    );
  }

  if (selectedPrint) {
    const p = selectedPrint;
    // §40 · INSPECT STANDS ON THE WALL AWAY FROM THE OBJECT — for a print too
    // (serving MNQ 1m, 2026-10-01: a cluster at the live edge opened its card on
    // the RIGHT wall, over the forming candle and the very print it described).
    // Prints are born at the live edge, so their cards read from the LEFT wall.
    const PRINT_WALL = "left-2";
    const stamped = p.aggressorMethod === "PROVIDER" || p.aggressorMethod === "MAKER_SIDE_INVERTED";
    const inferred = p.aggressorMethod === "TICK_RULE" || p.aggressorMethod === "QUOTE_TEST";
    // H-701B · the size relation, as a count among what this chart retained.
    // A print picked from the NEAR tape is not a bubble: its relation is its
    // size rank among the held prints of its own bar.
    const relation = p.relation
      ? `#${p.relation.rank} of ${p.relation.of} retained ${p.kind === "delta" ? "delta zones" : "big prints"} on this chart · median ${formatBubbleVolume(p.relation.median)}`
      : p.rawTape?.sizeRank != null
        ? `#${p.rawTape.sizeRank} by size of ${p.rawTape.held} held prints in its bar`
        : "not ranked — no other bubble of this kind is retained";
    if (p.cluster && p.kind !== "delta") {
      // F07B · A CLUSTER of prints that overlapped on the glass, merged into
      // one disc. Its anchor is the largest member (whose price the disc
      // writes); every member is listed and selectable on its own.
      const c = p.cluster;
      const selectMember = (m: BigTradeClusterMember) => onSelectPrint?.({
        symbol: p.symbol, timeframe: p.timeframe, barTime: m.barTime, printKey: m.printKey,
        timeMs: m.timeMs, priceLevel: m.price, bid: m.bid, ask: m.ask, total: m.bid + m.ask,
        aggressorMethod: m.aggressorMethod, kind: "big-trade", relation: null, rawTape: null,
        sessionRank: p.sessionRank ? { pct: m.pct, prints: p.sessionRank.prints } : null,
      });
      return (
        <section className={`absolute top-16 ${PRINT_WALL} z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md`}
          data-testid="chart-inspect-ticket" data-inspect-print={p.printKey} data-inspect-cluster={c.n}
          aria-label={`Inspect selected big-trade cluster for ${p.symbol}`}>
          <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
            <Crosshair size={11} /> INSPECT: BIG TRADE CLUSTER
            <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
          </div>
          <InspectFirstTouchLine />
          <div className="mt-2 text-[11px] text-white">{p.symbol} · {p.timeframe}</div>
          <div className="mt-1 text-[18px] font-bold leading-tight text-wm-gold">{formatBubbleExact(c.total)} <span className="text-[12px]">×{c.n}</span></div>
          <div className="text-[10px]" style={{ color: "#C8C0AE" }}>
            anchor {String(p.priceLevel)} @ {p.timeMs != null ? clock.exact(p.timeMs) : "UNKNOWN"} · {formatBubbleVolume(p.ask)} bought · {formatBubbleVolume(p.bid)} sold
          </div>
          <SessionRankCard rank={p.sessionRank} combined />
          <LocationCard loc={p.timeMs != null ? printLocationInStructure(p.priceLevel, p.timeMs / 1000, structure) : null} fmt={n => n.toFixed(2)} />
          <F07Card title="CLUSTER COUNT" testId="inspect-cluster-count">
            <div className="text-[18px] font-bold leading-tight text-white">{c.n}</div>
            <div className="text-[10px]" style={{ color: "#C8C0AE" }}>BARS TOUCHED · {c.barsTouched}</div>
            <div className="mt-1 flex gap-1" aria-label={`${c.barsTouched} bars touched`}>
              {c.barDots.map((on, k) => (
                <span key={k} className="inline-block h-2 w-2 rounded-full" data-bar-dot={on ? "touched" : "empty"}
                  style={on ? { background: "#E8B85C" } : { border: "1px solid #E8B85C" }} />
              ))}
            </div>
          </F07Card>
          <ResponseCard pr={printResponse} />
          <div className="mt-2 border-t border-wm-border pt-2" data-testid="inspect-cluster-members">
            <div className="text-[10px] font-bold tracking-wide text-wm-gold">MEMBERS · oldest first · {c.members.length > 0 ? clock.zone(c.members[0].timeMs / 1000) : ""}</div>
            <table className="mt-1 w-full text-[10px] tabular-nums" style={{ color: "#C8C0AE" }}>
              <thead>
                <tr className="text-left text-wm-muted"><th className="font-bold">TIME</th><th className="font-bold">PRICE</th><th className="font-bold text-right">SIZE</th><th className="font-bold text-right">SIDE</th></tr>
              </thead>
              <tbody>
                {c.members.map(m => (
                  <tr key={m.printKey} data-cluster-member={m.printKey}
                    className={`${m.printKey === c.anchorKey ? "text-wm-gold font-bold " : ""}${onSelectPrint ? "cursor-pointer hover:text-white" : ""}`}
                    tabIndex={onSelectPrint ? 0 : undefined}
                    aria-label={onSelectPrint ? `Inspect the ${m.side} print of ${formatBubbleVolume(m.size)} at ${m.price}` : undefined}
                    onClick={onSelectPrint ? () => selectMember(m) : undefined}
                    onKeyDown={onSelectPrint ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectMember(m); } } : undefined}>
                    <td>{clock.tick(m.timeMs)}</td>
                    <td>{String(m.price)}</td>
                    <td className="text-right">{formatBubbleVolume(m.size)}</td>
                    <td className="text-right">{m.side === "buy" ? "BUY" : "SELL"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>
            These prints overlapped on the glass at this zoom and are drawn as one disc: area = the sum of theirs, centred on their size-weighted time and price. Participant and intent: UNKNOWN. Raw tape is session-only; refresh may remove it.
          </p>
        </section>
      );
    }
    if (p.kind === "delta") {
      // A DELTA ZONE is a net across a price bucket, not a print: no
      // "executed", no "at", no execution identity (bubbleClaim.ts).
      const net = p.ask - p.bid;
      return (
        <section className={`absolute top-16 ${PRINT_WALL} z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md`}
          data-testid="chart-inspect-ticket" data-inspect-delta-zone={p.printKey}
          aria-label={`Inspect selected delta zone for ${p.symbol}`}>
          <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
            <Crosshair size={11} /> SELECTED DELTA ZONE
            <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
          </div>
          <InspectFirstTouchLine />
          <div className="mt-2 text-[11px] text-white">{p.symbol} · {p.timeframe}</div>
          <dl className="mt-2 text-[11px] break-words space-y-1" style={{ color: "#C8C0AE" }}>
            <dt>Net in this zone (bought − sold)</dt><dd className="text-white">{net >= 0 ? "+" : "−"}{formatBubbleExact(net)}</dd>
            <dt>Bought · sold</dt><dd className="text-white">{formatBubbleVolume(p.ask)} · {formatBubbleVolume(p.bid)}</dd>
            <dt>Anchor · heaviest tick</dt><dd>{formatBubblePrice(p.priceLevel)} — where it is drawn, not where all of it traded</dd>
            <dt>Bar</dt><dd>{Number.isFinite(p.barTime) ? clock.stamp(p.barTime) : "UNKNOWN"}</dd>
            <dt>Side fidelity</dt><dd>{stamped ? "OBSERVED" : inferred ? "INFERRED" : "UNKNOWN"} · {describeAggressorMethod(p.aggressorMethod)}</dd>
            <dt>Size relation</dt><dd>{relation}</dd>
          </dl>
          <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>A net across a price bucket — not a single print. Participant and intent: UNKNOWN. Raw tape is session-only; refresh may remove it.</p>
        </section>
      );
    }
    return (
      <section className={`absolute top-16 ${PRINT_WALL} z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md`}
        data-testid="chart-inspect-ticket" data-inspect-print={p.printKey}
        aria-label={`Inspect selected print for ${p.symbol}`}>
        <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
          <Crosshair size={11} /> SELECTED PRINT
          <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
        </div>
        <InspectFirstTouchLine />
        <div className="mt-2 text-[11px] text-white">{p.symbol} · {p.timeframe}</div>
        <dl className="mt-2 text-[11px] break-words space-y-1" style={{ color: "#C8C0AE" }}>
          <dt>Executed price</dt><dd className="text-white">{String(p.priceLevel)}</dd>
          <dt>Executed size</dt><dd className="text-white">{String(p.total)}</dd>
          <dt>Execution time</dt><dd>{p.timeMs != null ? clock.exact(p.timeMs) : "UNKNOWN"}</dd>
          <dt>Side fidelity</dt><dd>{stamped ? "OBSERVED" : inferred ? "INFERRED" : "UNKNOWN"}{stamped || inferred ? ` · ${p.ask >= p.bid ? "buy" : "sell"} classification` : " · classification not verified"}</dd>
          <dd>{describeAggressorMethod(p.aggressorMethod)}</dd>
          <dt>Execution identity</dt><dd>{p.printKey ?? "UNKNOWN"}</dd>
          <dt>Size relation</dt><dd>{relation}</dd>
        </dl>
        <SessionRankCard rank={p.sessionRank} combined={false} />
        <LocationCard loc={p.timeMs != null ? printLocationInStructure(p.priceLevel, p.timeMs / 1000, structure) : null} fmt={n => n.toFixed(2)} />
        <ResponseCard pr={printResponse} />
        {/*
          F06B · RAW TAPE FOR THIS OBJECT ONLY, camera alive. The glass shows
          the print as a dot or bubble at its time and price; the rows live
          here — the print and its neighbours in its own bar, newest first,
          each side at its fidelity (~ inferred · ? undisclosed).
        */}
        {p.rawTape && p.rawTape.rows.length > 0 && (
          <div className="mt-2 border-t border-wm-border pt-2" data-testid="inspect-raw-tape" data-raw-tape-held={p.rawTape.held}>
            <div className="text-[10px] font-bold tracking-wide text-wm-gold">RAW TAPE · THIS PRINT&apos;S BAR</div>
            <div className="text-[10px]" style={{ color: "#C8C0AE" }}>
              {p.rawTape.rows.length} of {p.rawTape.held} held prints · newest first · {clock.zone(p.rawTape.barTime)}
            </div>
            <table className="mt-1 w-full text-[10px] tabular-nums" style={{ color: "#C8C0AE" }}>
              <thead>
                <tr className="text-left text-wm-muted"><th className="font-bold">TIME</th><th className="font-bold">PRICE</th><th className="font-bold text-right">SIZE</th><th className="font-bold text-right">SIDE</th></tr>
              </thead>
              <tbody>
                {p.rawTape.rows.map(r => (
                  <tr key={`${r.printKey ?? ""}${r.timeMs}:${r.price}`} data-raw-tape-row={r.printKey ?? String(r.timeMs)}
                    data-raw-tape-selected={r.selected ? "true" : undefined}
                    className={r.selected ? "text-wm-gold font-bold" : undefined}>
                    <td>{clock.tick(r.timeMs)}</td>
                    <td>{String(r.price)}</td>
                    <td className="text-right">{formatBubbleVolume(r.size)}</td>
                    <td className="text-right">{r.glyph}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {p.rawTape.fidelityNote && <div className="text-[10px]" style={{ color: UNREAD_COLOR }}>{p.rawTape.fidelityNote}</div>}
          </div>
        )}
        <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>Participant and intent: UNKNOWN. This retained print is not a live quote. Raw tape is session-only; refresh may remove it.</p>
        <LearnThis kind="PRINT" />
      </section>
    );
  }

  // The chart's own display zone, named — the browser's clock read 06:30
  // under an axis showing 09:30 ET (garden pass 2026-10-05).
  const time =
    vm.barOpenMs !== null
      ? `${clock.tick(vm.barOpenMs).slice(0, 8)} ${clock.zone(Math.floor(vm.barOpenMs / 1000))}`
      : null;

  return (
    <div
      /* `right-[76px]` clears the price scale; `top-16` clears the chart's own
         top chrome; `max-h` + `overflow-y-auto` is what stops a fully-refused
         ticket from having its last sentences cut off by the pane floor. */
      // §40 (2026-10-03): the bar under inspection is almost always a recent
      // one at the live edge — the ticket reads it from the LEFT wall, like the
      // print and profile-slice tickets, so it never covers the candles it reads.
      className="absolute top-16 left-2 z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-border bg-wm-surface/95 p-2 shadow-2xl backdrop-blur-md"
      data-testid="chart-inspect-ticket"
      // Published so an outside probe can compare the ticket's own verdict
      // against the switches and the tape, without parsing a human sentence.
      data-inspect-reach={vm.reach}
      data-inspect-read={vm.readCount}
      aria-label={`Inspect ticket. ${vm.headline}. ${vm.reachNote}`}
    >
      <div className="flex items-center gap-2">
        <Crosshair size={11} className="text-wm-gold" />
        <span className="text-[11px] font-bold text-wm-gold">Inspect Ticket</span>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close the inspect ticket"
          className="ml-auto text-wm-muted hover:text-white"
        >
          <X size={12} />
        </button>
      </div>
      <InspectFirstTouchLine />

      <div className="pt-1.5 text-[10px] font-bold tracking-wide text-wm-muted">
        {followingLiveBar ? "LIVE BAR" : "SELECTED BAR"}
      </div>
      <div className="text-[11px] font-bold tabular-nums text-white">
        {time ? `${time}` : "—"}
        {vm.price !== null && <span className="text-wm-muted"> · {vm.price}</span>}
      </div>
      {/*
        Stated, not implied. A trader who moved the cursor off the chart and got
        a different set of numbers deserves to be told the panel changed subject.
      */}
      {followingLiveBar && (
        <div className="pt-0.5 text-[10px] leading-snug text-wm-muted">
          The cursor is off the chart, so this is the bar still forming. Hover a
          candle to inspect it instead.
        </div>
      )}

      <div className="mt-1.5 border-t border-wm-border pt-1">
        {vm.rows.map((row, i) => (
          <Row key={row.id} row={row} sameReasonAsAbove={i > 0 && row.state !== "READ" && vm.rows[i - 1].state !== "READ" && !!row.absence && row.absence === vm.rows[i - 1].absence} />
        ))}
      </div>

      {/*
        F05 CLARITY — the candle's own anatomy (F05A callout, F05B Inspect
        column), decided on its four prices and the bars before it. Geometry
        only: where the close sits is not who traded, so no pressure split.
      */}
      {clarity && clarity.state === "READ" && (
        <div
          className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug"
          data-inspect-clarity={clarity.wickIntent ?? "NONE"}
          data-inspect-clarity-gap={clarity.gap}
          data-inspect-clarity-breath={clarity.breath}
          style={{ color: "#C8C0AE" }}
        >
          <div className="font-bold tracking-wide text-wm-gold">CLARITY · CANDLE ANATOMY</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2">
            {clarity.lines.map(l => (
              <React.Fragment key={l.key}>
                <dt className="text-wm-muted">{l.label}</dt>
                <dd className="text-white tabular-nums">{l.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}

      {/*
        LINEAGE — the bar's canonical identity and the chain it starts, from
        the compiler verbatim. Provenance lives here, in Inspect, and nowhere
        on the glass. A bar with no admitted identity says so in one line.
      */}
      <div
        className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug"
        data-inspect-lineage={vm.lineage.state}
        data-inspect-bar-id={vm.lineage.state === "READ" ? vm.lineage.barId : undefined}
        style={{ color: "#C8C0AE" }}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-bold tracking-wide text-wm-muted">LINEAGE</span>
          {vm.lineage.state === "UNREAD" && (
            <span className="ml-auto font-bold" style={{ color: UNREAD_COLOR }}>UNREAD</span>
          )}
        </div>
        {vm.lineage.state === "READ" ? (
          <div className="break-all font-mono">{vm.lineage.line}</div>
        ) : (
          <div style={{ color: UNREAD_COLOR }}>{vm.lineage.absence}</div>
        )}
        <div className="break-all" data-inspect-chain={vm.chain.state}>
          {vm.chain.state === "READ" ? (
            <>CHAIN {vm.chain.line}</>
          ) : (
            // With no lineage the line above already names why; say it once.
            <span style={{ color: UNREAD_COLOR }}>CHAIN UNREAD{vm.lineage.state === "READ" ? ` · ${vm.chain.absence}` : ""}</span>
          )}
        </div>
        <div className="text-wm-muted">method {vm.method}</div>
      </div>

      {fusion && (
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-fusion={fusion.id} style={{ color: "#C8C0AE" }}>
          <div className="font-bold tracking-wide text-wm-gold">PROFILE FUSION · {fusion.id}</div>
          <div>Fused POC {fusion.poc.toFixed(2)} · VA {fusion.val.toFixed(2)}–{fusion.vah.toFixed(2)} · recomputed from summed row volume</div>
          {fusion.sources.map(s => (
            <div key={s.id}>Source {s.species} · own POC {s.poc?.toFixed(2) ?? "—"} · volume {Math.round(s.volume).toLocaleString("en-US")}</div>
          ))}
          <div>DERIVED · {fusion.evidence === "CANDLE_ESTIMATED" ? "CANDLE-ESTIMATED (a parent's volume was spread over bar ranges)" : "TRADE-BASED"} · {fusion.volumeUnit} · {fusion.sharedRows} shared rows · policy {fusion.overlapPolicy}</div>
          <div>Method {fusion.method} v{fusion.version} · grid {fusion.step} · asOf {fusion.asOf != null ? clock.stamp(fusion.asOf) : "—"} · fidelity {fusion.fidelity ?? "not carried on these bars"}</div>
        </div>
      )}

      {profileDna && <ProfileDnaBlock dna={profileDna} onGlass={profileDnaOnGlass} />}

      {/* F08B · THE WEATHER LENS — the reading behind the storm, explained (Garden 16 §39). */}
      {weatherLens && (() => {
        const wv = weatherLens;
        const timed = wv.segments.filter(sg => sg.fromTime != null && sg.toTime != null);
        const from = timed.length ? Math.min(...timed.map(sg => sg.fromTime!)) : null;
        const to = timed.length ? Math.max(...timed.map(sg => sg.toTime!)) : null;
        const hi = wv.segments.length ? Math.max(...wv.segments.map(sg => sg.high)) : null;
        const lo = wv.segments.length ? Math.min(...wv.segments.map(sg => sg.low)) : null;
        const derived = wv.detail.includes("DERIVED");
        // The axis's own clock (inspectReadsTheAxisClock): seconds in, the chart's zone out.
        const hm = (ms: number | null) => (ms == null ? "—" : clock.minute(Math.floor(ms / 1000)));
        return (
          <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-weather={wv.stage} style={{ color: "#C8C0AE" }}>
            <div className="font-bold tracking-wide text-wm-gold">LIQUIDITY WEATHER · {wv.stage}</div>
            {wv.stage === "UNMEASURED" ? (
              <div>{wv.detail} — no weather is guessed at.</div>
            ) : (
              <>
                <div>What · what it costs to move this market: size traded per unit of travel, segment by segment. Gold in the storm = size went in and price HELD; steel blue = price MOVED on little. A cost, never a price level or a direction.</div>
                <div>Where · {lo != null && hi != null ? `${mtfPx(lo)} – ${mtfPx(hi)}` : "—"} · {hm(from)} → {hm(to)}{to != null ? ` ${clock.zone(Math.floor(to / 1000))}` : ""}</div>
                <div>Evidence · {wv.segments.length} segment{wv.segments.length === 1 ? "" : "s"} · {wv.segments.reduce((t, sg) => t + sg.prints, 0)} {derived ? "bars" : "prints"}{wv.latestVsMedian != null ? ` · newest ${wv.latestVsMedian.toFixed(2)}× the window median` : ""}{wv.trendRatio != null ? ` · late/early ${wv.trendRatio.toFixed(2)}×` : ""}</div>
                <div>Class · {derived ? "DERIVED from traded bars (volume per bar-range travel), not tape" : "MEASURED from per-trade tape"}</div>
                <div>Fidelity · {wv.provenance}{wv.dispersion != null ? ` · dispersion ${(wv.dispersion * 100).toFixed(0)}%` : ""}</div>
                <div>Lineage · {derived ? "chart bars (volume-gated)" : "tape prints"} → selectLiquidityWeather{derived ? "FromBars" : ""} (judgeWeather) → heat lens → this storm</div>
              </>
            )}
          </div>
        );
      })()}

      {/* GARDEN 15 §4 · THE ZERO-GAMMA FRONT — the environment, explained. */}
      {pressureFront && (
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-pressure-front={pressureFront.drawn ? pressureFront.climate : "SILENT"} style={{ color: "#C8C0AE" }}>
          {pressureFront.drawn ? (
            <>
              <div className="font-bold tracking-wide text-wm-gold">DERIVATIVES ENVIRONMENT · {pressureFront.climate.replace("_", " ")}</div>
              <div>What · the price where expected dealer hedging flips: above one side it leans against moves (damping), past it it leans with them (amplifying). An expected response, not a direction call.</div>
              <div>Where · zero-gamma front {pressureFront.zeroGamma != null ? mtfPx(pressureFront.zeroGamma) : "none within ±20%"} · price {mtfPx(pressureFront.spot)} {pressureFront.zeroGamma != null ? (pressureFront.spot >= pressureFront.zeroGamma ? "above it" : "below it") : ""}</div>
              <div>Climate at price · {pressureFront.climate.replace("_", " ")} (net / gross {pressureFront.climateRatio.toFixed(2)}; ±0.12 or closer is MIXED)</div>
              <div>Evidence · {pressureFront.contracts} contracts with open interest · {pressureFront.walls.length} wall{pressureFront.walls.length === 1 ? "" : "s"} · {pressureFront.pockets.length} acceleration pocket{pressureFront.pockets.length === 1 ? "" : "s"}{pressureFront.envelope ? ` · expected move ±${mtfPx(pressureFront.envelope.session)} (IV30, DERIVED)` : ""}</div>
              <div>Class · INFERRED ({pressureFront.assumption}) · actual price response outranks this model</div>
              <div>Fidelity · {pressureFront.fidelity} ({positioningSourceWords(pressureFront.source).name}) · chain {pressureFront.clocks.chainAsOf ?? "—"} · {positioningSourceWords(pressureFront.source).oi} · model {clock.minute(pressureFront.clocks.modelAsOf)}</div>
              <div>Lineage · {positioningSourceWords(pressureFront.source).name} OI + IV → selectDerivativesPressure v{pressureFront.version} → geography sweep → this front</div>
            </>
          ) : (
            <div>The derivatives reading went silent ({pressureFront.receipt.replace("PRESSURE:SILENT:", "").replace(/_/g, " ").toLowerCase()}) — no environment is guessed at.</div>
          )}
        </div>
      )}

      {/* GARDEN 15 §5 · THE SELECTED PRESSURE WALL — what / where / evidence / class / clocks / life / lineage. */}
      {pressureWall && (() => {
        const dp = pressureWall.vm;
        if (!dp.drawn) {
          return (
            <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-pressure-wall="SILENT" style={{ color: "#C8C0AE" }}>
              <div className="font-bold tracking-wide text-wm-gold">PRESSURE WALL · NO LONGER COMPILED</div>
              <div>The derivatives reading went silent ({dp.receipt.replace("PRESSURE:SILENT:", "").replace(/_/g, " ").toLowerCase()}) — the wall is not guessed at.</div>
            </div>
          );
        }
        const w = dp.walls.find(x => x.strike === pressureWall.strike);
        if (!w) {
          return (
            <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-pressure-wall="GONE" style={{ color: "#C8C0AE" }}>
              <div className="font-bold tracking-wide text-wm-gold">PRESSURE WALL {mtfPx(pressureWall.strike)} · NO LONGER A WALL</div>
              <div>The strike no longer holds 3.5% of gross exposure in the current positioning — the object is let go, not redrawn.</div>
            </div>
          );
        }
        const lifeWords: Record<string, string> = {
          BORN: "untested — price has not reached it on this chart",
          TESTED: "tested once and held",
          DEFENDED: "tested and held more than once",
          WEAKENING: "tested repeatedly — each test costs it material",
          BREAKING: "price is closing beyond it",
          BROKEN: "accepted through — what remains is a scar",
        };
        const contra = dp.climate === "AMPLIFYING"
          ? "The global climate is AMPLIFYING while this strike is locally defensive — local geography and global climate disagree (Garden 15 §4)."
          : w.life === "WEAKENING" || w.life === "BREAKING" || w.life === "BROKEN"
            ? "The model expects damping here; the observed response is failing to confirm it. Actual response outranks the model."
            : "None observed: the response so far agrees with the expected defence.";
        return (
          <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-pressure-wall={`${w.strike}:${w.life}`} style={{ color: "#C8C0AE" }}>
            <div className="font-bold tracking-wide text-wm-gold">PRESSURE WALL {mtfPx(w.strike)} · {w.life}</div>
            <div>What · a damping concentration: dealer hedging expected to lean AGAINST moves through {mtfPx(w.strike)} (not a direction call)</div>
            <div>Where · strike {mtfPx(w.strike)}, price {w.side === "ABOVE" ? "above" : "below"} it · {(w.share * 100).toFixed(1)}% of gross exposure</div>
            <div>Evidence · call OI {w.callOi.toLocaleString()} · put OI {w.putOi.toLocaleString()} · ≈${(w.exposure / 1e6).toFixed(1)}M per 1% move</div>
            <div>Class · exposure INFERRED ({dp.assumption}) · tests OBSERVED on this chart&apos;s bars</div>
            <div>Fidelity · {dp.fidelity} ({positioningSourceWords(dp.source).name}) · clocks: chain {dp.clocks.chainAsOf ?? "—"} · underlying {dp.clocks.underlyingAsOf ?? "—"} · {positioningSourceWords(dp.source).oi}</div>
            <div data-testid="inspect-pressure-wall-life">Life · {lifeWords[w.life]} · {w.tests} test{w.tests === 1 ? "" : "s"}{w.firstTestTime != null ? ` since ${clock.minute(w.firstTestTime)} ${clock.zone(w.firstTestTime)}` : ""}{w.closesBeyond ? ` · ${w.closesBeyond} close${w.closesBeyond === 1 ? "" : "s"} beyond` : ""}{wallTestSpanWords(dp.testSpanSec) ? ` · counted over the ${wallTestSpanWords(dp.testSpanSec)!.replace(" seen", "")} this chart has loaded — a longer timeframe sees more of the week` : ""}</div>
            <div>Contradiction · {contra}</div>
            <div>Climate · {dp.climate.replace("_", " ")} at price ({dp.climateRatio.toFixed(2)}) · zero-gamma front {dp.zeroGamma != null ? mtfPx(dp.zeroGamma) : "none in ±20%"}</div>
            <div>Lineage · {positioningSourceWords(dp.source).name} OI + IV → selectDerivativesPressure v{dp.version} → this wall ({dp.contracts} contracts)</div>
            <OptionsEvidenceBlock ev={pressureWall.evidence ?? null} px={mtfPx} onScope={pressureWall.onScope} />
          </div>
        );
      })()}

      {/* T-210 · the plate's MTF INSPECT TICKET: ancestry + nodes + shelf, each ACTIVE or its named silence. */}
      {mtfAncestry && (
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-mtf={mtfAncestry.receipt} style={{ color: "#C8C0AE" }}>
          <div className="font-bold tracking-wide text-wm-gold">MTF INSPECT · ANCESTRY + NODES + SHELF</div>
          <div>Time reference · structural (resampled from this chart&apos;s own bars, not a second clock)</div>
          {mtfAncestry.band.kind === "BAND" ? (
            <div data-inspect-mtf-band="ACTIVE">4H ancestry · ACTIVE (band) — body {mtfPx(mtfAncestry.band.low)}–{mtfPx(mtfAncestry.band.high)} from {clock.minute(mtfAncestry.band.firstTime)} {clock.zone(mtfAncestry.band.firstTime)} · {mtfAncestry.band.relation === "INSIDE" ? "price sits inside it" : `nearest body, ${mtfPx(mtfAncestry.band.distance)} away`} · {mtfAncestry.band.age === 0 ? "newest completed 4H" : `${mtfAncestry.band.age} 4H bar${mtfAncestry.band.age === 1 ? "" : "s"} back`}</div>
          ) : (
            <div data-inspect-mtf-band={mtfAncestry.band.reason}>4H ancestry · SILENT — {mtfAncestry.band.reason}</div>
          )}
          {mtfAncestry.node.kind === "NODE" ? (
            <div data-inspect-mtf-node="ACTIVE">1H node · ACTIVE (node) — {mtfPx(mtfAncestry.node.low)}–{mtfPx(mtfAncestry.node.high)}, peak {mtfPx(mtfAncestry.node.price)} · {Math.round(mtfAncestry.node.share * 100)}% of the hour&apos;s volume · hour from {clock.minute(mtfAncestry.node.firstTime)} · DERIVED (bar volume spread over each bar&apos;s range)</div>
          ) : (
            <div data-inspect-mtf-node={mtfAncestry.node.reason}>1H node · SILENT — {mtfAncestry.node.reason}</div>
          )}
          {mtfAncestry.shelf.kind === "SHELF" ? (
            <div data-inspect-mtf-shelf="ACTIVE">Daily shelf · ACTIVE (shelf) — {mtfAncestry.shelf.level} {mtfPx(mtfAncestry.shelf.price)} of session {mtfAncestry.shelf.day} · price {mtfAncestry.shelf.side.toLowerCase()} it</div>
          ) : (
            <div data-inspect-mtf-shelf={mtfAncestry.shelf.reason}>Daily shelf · SILENT — {mtfAncestry.shelf.reason}</div>
          )}
        </div>
      )}

      {/* H-801 · where a typical session of THIS market reached — never a forecast. */}
      {envelope && (
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-envelope={envelope.reason} style={{ color: "#C8C0AE" }}>
          <div className="font-bold tracking-wide text-wm-gold">EXPECTED ENVELOPE · {envelope.drawn ? `${envelope.sessions} COMPLETED SESSIONS` : "NOT DRAWN"}</div>
          {envelope.drawn && envelope.up && envelope.down && envelope.open != null ? (
            <>
              <div>Open {envelope.open.toFixed(2)} · typical reach {envelope.upper?.toFixed(2)} / {envelope.lower?.toFixed(2)} (median of each session&apos;s reach)</div>
              <div>Up so far {envelope.up.reach.toFixed(2)} — {envelope.up.matchedBy} of {envelope.sessions} sessions went this far{envelope.up.outside ? " · outside" : ""}</div>
              <div>Down so far {envelope.down.reach.toFixed(2)} — {envelope.down.matchedBy} of {envelope.sessions} sessions went this far{envelope.down.outside ? " · outside" : ""}</div>
              {/* 2026-09-25 · the analogue fan on the glass (H-801 / F03), read out. */}
              {envelope.fan && (
                <div data-inspect-envelope-fan={envelope.fan.surprise ? envelope.fan.surprise.side : "INSIDE"}>
                  Analogue fan p10–p90 · bar {envelope.fan.nowK} of the session · {envelope.fan.surprise
                    ? `MARKET SURPRISE ${envelope.fan.surprise.side.toLowerCase()} the fan — ${envelope.fan.surprise.matchedBy} of ${envelope.fan.surprise.n} sessions stood this far at this bar`
                    : envelope.fan.nowK < envelope.fan.steps.length ? "the newest close rides inside it" : "past the bars the prior sessions reached"}
                </div>
              )}
            </>
          ) : (
            <div>Needs 3 completed sessions on this chart ({envelope.sessions} loaded) — a count, not a guess.</div>
          )}
        </div>
      )}

      {/* H-201 · the analogue behind the ghost: sample, fit, mismatch — or why none. */}
      {memoryGhost && (
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-memory-ghost={memoryGhost.reason} data-inspect-memory-ghost-frozen={memoryGhostFrozenAsOf ?? undefined} style={{ color: "#C8C0AE" }}>
          <div className="font-bold tracking-wide text-wm-gold">MEMORY GHOST · {memoryGhost.drawn ? "ANALOGUE" : "NO ANALOGUE DRAWN"}{memoryGhostFrozenAsOf != null ? " · SELECTED" : ""}</div>
          {memoryGhostFrozenAsOf != null && (
            <div data-testid="inspect-memory-ghost-asof">Frozen as of {clock.minute(memoryGhostFrozenAsOf)} {clock.zone(memoryGhostFrozenAsOf)} — the analogue as it was clicked; the live ghost may move on</div>
          )}
          {memoryGhost.drawn && memoryGhost.analogueStart != null && memoryGhost.analogueEnd != null ? (
            <>
              <div>Sample · {clock.minute(memoryGhost.analogueStart)} → {clock.hhmm(memoryGhost.analogueEnd)} {clock.zone(memoryGhost.analogueEnd)} · {memoryGhost.points.length} bars</div>
              <div>Fit r = {memoryGhost.fit?.toFixed(2)} · mismatch {memoryGhost.mismatchPct?.toFixed(2)} pts of % path</div>
              <div>Best of {memoryGhost.candidates} earlier windows · laid under the live bars only — never projected forward</div>
            </>
          ) : (
            <div>{memoryGhost.reason === "INSUFFICIENT_HISTORY" ? "Too little history loaded for an analogue — silence, not a guess." : `No earlier window fit well enough (${memoryGhost.candidates} compared) — silence, not a guess.`}</div>
          )}
        </div>
      )}

      {/* H-401 · BOTH FAMILY LINES, never one blended verdict. */}
      {contradiction && contradiction.state !== "NOT_ENOUGH" && (
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-contradiction={contradiction.state}>
          <div className="font-bold tracking-wide text-wm-gold">
            {contradiction.state === "UNRESOLVED" ? "CONTRADICTION · UNRESOLVED" : "FAMILIES AGREE · STILL YOUR READ"}
          </div>
          {[...contradiction.up.map(l => ({ ...l, arrow: "↑" })), ...contradiction.down.map(l => ({ ...l, arrow: "↓" }))].map(l => (
            <div key={`${l.family}-${l.lean}`} style={{ color: "#C8C0AE" }}>
              <span className="text-white">{l.arrow} {l.family}</span> · {l.evidence}
            </div>
          ))}
          {contradiction.silent.map(s => (
            <div key={s.family} style={{ color: "#C8C0AE" }}>· {s.family} silent — {s.why}</div>
          ))}
          <div style={{ color: "#C8C0AE" }}>{contradiction.posture} · not blended into one score</div>
        </div>
      )}

      {/*
        THE TAPE'S REACH, ON THE GLASS AND ALWAYS.
        Each row already carries its own absence, but the reach is one fact
        behind three rows. Printed once here so a trader can learn the shape of
        the limitation instead of re-reading it in every row it caused.
      */}
      <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug text-wm-muted">
        {vm.reachNote}
      </div>

      {/*
        A DOOR THAT LEADS SOMEWHERE EMPTY IS WORSE THAN NO DOOR. The button is
        only offered when the footprint can actually divide this bar; otherwise
        the reason it is not offered is printed in its place, which is the more
        useful of the two things the space can hold.
      */}
      {/*
        PLATE 75 · RAW TAPE / FOOTPRINT INSPECT — the bar's own evidence in the
        ticket, not behind a door: its row of the one flow ladder level by level
        (the POC level lit), and the prints this room holds inside the bar,
        newest first, exactly as the venue sent them.
      */}
      {vm.localFootprint ? (
        <div data-testid="chart-inspect-local-footprint" className="mt-1.5 border-t border-wm-border pt-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-wm-gold">Local footprint · this bar · <span style={{ color: "#E9C46A" }}>POC lit</span></div>
          <table className="mt-0.5 w-full text-[10.5px] tabular-nums" style={{ fontFamily: TAPE_MONO }}>
            <thead>
              <tr className="text-[10px] text-wm-muted">
                <th className="text-left font-normal">Price</th>
                <th className="text-right font-normal">Bid</th>
                <th className="text-right font-normal">Ask</th>
                <th className="text-right font-normal">Δ</th>
              </tr>
            </thead>
            <tbody>
              {vm.localFootprint.levels.map(l => (
                <tr key={l.price} style={l.poc ? { background: "rgba(212,175,55,0.14)" } : undefined}>
                  <td className="text-left" style={{ color: l.poc ? "#E9C46A" : "#C8C0AE" }}>{tapePrice(l.price)}</td>
                  <td className="text-right" style={{ color: "#E07A7A" }}>{tapeSize(l.bid)}</td>
                  <td className="text-right" style={{ color: "#6FCF97" }}>{tapeSize(l.ask)}</td>
                  <td className="text-right" style={{ color: l.delta > 0 ? "#6FCF97" : l.delta < 0 ? "#E07A7A" : "#C8C0AE" }}>
                    {l.delta > 0 ? "+" : l.delta < 0 ? "−" : ""}{tapeSize(Math.abs(l.delta))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vm.localFootprint.bandWidth !== null ? (
            <div className="text-[10px] text-wm-muted">
              {vm.localFootprint.grouped} traded levels grouped into bands {tapePrice(vm.localFootprint.bandWidth)} wide · price = band low
            </div>
          ) : null}
        </div>
      ) : null}
      {vm.barTape ? (
        <div data-testid="chart-inspect-bar-tape" className="mt-1.5 border-t border-wm-border pt-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-wm-gold">
            Time &amp; sales · {vm.barTape.rows.length} of {vm.barTape.total} held in this bar · A ask / B bid
          </div>
          <table className="mt-0.5 w-full text-[10.5px] tabular-nums" style={{ fontFamily: TAPE_MONO }}>
            <tbody>
              {vm.barTape.rows.map((t, i) => (
                <tr key={`${t.timeMs}-${i}`}>
                  <td className="text-left text-wm-muted">{tapeClock(t.timeMs)}</td>
                  <td className="text-right" style={{ color: "#C8C0AE" }}>{tapePrice(t.price)}</td>
                  <td className="text-right" style={{ color: t.side === "ASK" ? "#6FCF97" : t.side === "BID" ? "#E07A7A" : "#C8C0AE" }}>
                    {tapeSize(t.size)}
                  </td>
                  <td className="text-right text-[10px]" style={{ color: t.side === "ASK" ? "#6FCF97" : t.side === "BID" ? "#E07A7A" : "#8A8370" }}>
                    {t.side === "ASK" ? "A" : t.side === "BID" ? "B" : "?"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {vm.footprintDoorAvailable ? (
        <button
          onClick={onOpenFootprint}
          data-testid="chart-inspect-footprint-door"
          className="mt-1.5 w-full rounded border border-wm-gold/40 px-2 py-1 text-[10px] font-bold text-wm-gold hover:bg-wm-gold/10"
        >
          View Full Footprint →
        </button>
      ) : (
        <div className="mt-1.5 text-[10px] leading-snug" style={{ color: UNREAD_COLOR }}>
          {vm.footprintDoorNote}
        </div>
      )}
    </div>
  );
}

export default ChartInspectTicket;
