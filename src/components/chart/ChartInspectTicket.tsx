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
import type { SelectedBigTrade } from "@/lib/bigTradeLevels";
import type { ContradictionVM } from "@/lib/marketData/viewModels/selectContradiction";
import type { MemoryGhostVM } from "@/lib/marketData/viewModels/selectMemoryGhost";
import type { ExpectedEnvelopeVM } from "@/lib/marketData/viewModels/selectExpectedEnvelope";
import type { FusedProfileObject } from "@/lib/marketData/viewModels/fuseProfiles";
import { describeAggressorMethod, formatBubbleExact, formatBubblePrice, formatBubbleVolume } from "@/lib/bubbleClaim";
import { Activity, AlertTriangle, CalendarDays, Clock, Crosshair, FileText, Hourglass, ShieldCheck, Target, X } from "lucide-react";

import { anatomyReadingDrawn, type AnatomyInspectVM, type AnatomyTarget } from "@/lib/marketData/viewModels/anatomySelection";
import type { SelectedAnatomy } from "@/lib/marketData/viewModels/chartSelection";
import { ABSORPTION_ANATOMY_DEFAULTS, type EffortBasis } from "@/lib/marketData/selectAbsorptionAnatomy";
import { DECLINING_AT, EXTENDED_AT, FT_BARS, MAX_MARKS, MIN_PUSH_BARS } from "@/lib/marketData/viewModels/selectExhaustion";
import type { InspectTicketVM, TicketRow } from "@/lib/marketData/viewModels/selectInspectTicket";
import { MIN_DNA_ROWS, type ProfileDnaVM } from "@/lib/marketData/viewModels/selectProfileDna";
import type { ProfileSliceResult } from "@/lib/marketData/viewModels/selectProfileSlice";
import type { StructureZone } from "@/lib/marketData/viewModels/selectStructureZoneObjects";
import type { ObjectLineageVM, ZoneLineageVM } from "@/lib/marketData/viewModels/selectZoneLineage";
import type { MarketObject } from "@/lib/marketData/marketObjectKinds";
import type { LivingBiographyVM } from "@/lib/marketData/viewModels/selectLivingBiography";
import type { ClarityAnatomyVM } from "@/lib/marketData/viewModels/selectClarityAnatomy";
import { memoryLevelKindOf } from "@/lib/marketData/viewModels/selectMemoryMarketObjects";

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

function Row({ row }: { row: TicketRow }) {
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
          {row.absence}
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
    </section>
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
  envelope = null,
  fusion = null,
  profileDna = null,
  profileDnaOnGlass = false,
  timeZone = null,
  livingBiography = null,
  clarity = null,
}: {
  vm: InspectTicketVM;
  followingLiveBar: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Takes the trader to the surface that divides this bar by price level. */
  onOpenFootprint: () => void;
  selectedPrint?: SelectedBigTrade | null;
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
  /** H-801 · the envelope and its surprise, as counts of this chart's sessions. */
  envelope?: ExpectedEnvelopeVM | null;
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
}) {
  const clock = zonedClock(timeZone);
  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Open the inspect ticket for the bar under the cursor"
        data-testid="chart-inspect-reopen"
        className="wm-chart-reading-anchor absolute top-16 right-[76px] z-20 flex items-center gap-1 rounded border px-2 h-6 text-[10px] font-bold tracking-wide"
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
    F11 · MARKET OBJECT PASSPORT — the Founder's mockup, in the ONE ticket.
    Birth · Age · Touches · Response history · Current state · Source
    fidelity · Invalidation condition. Every line is what the lifecycle owner
    measured; there is no decay rate, half-life or invalidation probability,
    because nothing measured one.
  */
  if (selectedZone) {
    const z = selectedZone;
    const lc = z.lifecycle;
    // Only a lineage compiled for THIS object is printed beside it.
    const lineage = zoneLineage?.objectId === z.object.objectId ? zoneLineage : null;
    const t = clock.stamp;
    const ageSec = lc.asOf != null ? lc.asOf - z.birthTime : null;
    const age = ageSec == null ? "UNKNOWN" : `${Math.floor(ageSec / 86400)}d ${Math.floor((ageSec % 86400) / 3600)}h ${Math.floor((ageSec % 3600) / 60)}m`;
    const stateNote: Record<string, string> = {
      ALIVE: "Untouched since birth.",
      TESTED: "Price is inside it now — no response yet.",
      DEFENDED: "Every completed touch was rejected.",
      CONSUMED: "Still standing, but a touch swept through its far edge.",
      INVALID: "A bar closed beyond its far edge.",
    };
    const stateColor = lc.state === "INVALID" ? "#FF4D6A" : lc.state === "CONSUMED" ? "#F0B429" : "#7FD1A6";
    const heldWord = z.side === "DEMAND" ? "held above" : "held below";
    const Head = ({ icon: Icon, children }: { icon: typeof Crosshair; children: React.ReactNode }) => (
      <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.1em] text-wm-gold">
        <Icon size={15} aria-hidden /> {children}
      </div>
    );
    const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
      <div className="grid grid-cols-[104px_1fr] gap-2 text-[12.5px] leading-[1.45]"><span style={{ color: "#8B8676" }}>{k}</span><span className="text-white">{v}</span></div>
    );
    return (
      // LEFT WALL, not right: a zone is born at a recent swing, so it lives at
      // the right of the camera — a right-hand passport covered the very
      // object it describes. The plate shows the zone beside its passport.
      <section className="absolute top-2 left-2 w-[372px] max-h-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-wm-gold/40 shadow-2xl"
        // Opaque and above the chart's own chips: the passport is the object
        // being read, so nothing on the glass may show through or sit on it.
        style={{ background: "#0d0c0a", zIndex: 80 }}
        data-testid="chart-inspect-ticket" data-inspect-zone={z.object.objectId}
        aria-label={`Market object passport. ${z.side} zone ${z.object.priceLow} to ${z.object.priceHigh}. ${lc.state}.`}>
        <div className="flex items-start gap-2 border-b border-wm-border px-4 py-3">
          <FileText size={22} className="mt-0.5 text-wm-gold" aria-hidden />
          <div className="min-w-0">
            <div className="text-[14px] font-bold tracking-[0.08em] text-white">MARKET OBJECT PASSPORT</div>
            <div className="text-[12px]" style={{ color: "#C8C0AE" }}>
              {z.side === "DEMAND" ? "Demand" : "Supply"} zone · {z.origin.toLowerCase()} <span style={{ color: stateColor }}>●</span>
            </div>
          </div>
          <button className="ml-auto" aria-label="Close the passport" onClick={() => onOpenChange(false)}><X size={14} /></button>
        </div>
        <div className="divide-y divide-wm-border/70">
          <div className="space-y-1 px-4 py-3">
            <Head icon={CalendarDays}>BIRTH</Head>
            <Row k="Created" v={t(z.birthTime)} />
            <Row k="Origin" v={<><span className="text-wm-gold">{z.side === "DEMAND" ? "Swing low" : "Swing high"}</span> · {String(+z.object.priceLow.toPrecision(8))} – {String(+z.object.priceHigh.toPrecision(8))}</>} />
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={Hourglass}>AGE</Head>
            <Row k="Age" v={age} />
            <Row k="Since creation" v={`${lc.barsSinceBirth} bars`} />
          </div>
          <div className="space-y-2 px-4 py-3">
            <Head icon={Target}>TOUCHES</Head>
            <Row k="Total touches" v={`${lc.touches.length}${lc.touches.length ? ` · ${lc.touches.filter(x => x.response !== "OPEN").length} completed` : ""}`} />
            {lc.touches.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "#C8C0AE" }}>None since birth.</p>
            ) : (
              <div className="relative mt-1 flex justify-between px-1" data-testid="passport-touch-timeline">
                <div className="absolute left-2 right-2 top-[6px] h-px bg-wm-gold/30" aria-hidden />
                {lc.touches.map(tc => (
                  <div key={tc.start} className="relative flex flex-col items-center gap-1">
                    <span className="h-[12px] w-[12px] rounded-full" style={{ background: tc.response === "INVALIDATED" ? "#FF4D6A" : tc.response === "OPEN" ? "transparent" : "#F0B429", border: "1px solid #F0B429" }} />
                    <span className="text-[10.5px]" style={{ color: "#C8C0AE" }}>{t(tc.start).slice(5, 16)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {lc.touches.length > 0 && (
            <div className="space-y-1 px-4 py-3">
              <Head icon={Activity}>RESPONSE HISTORY</Head>
              <ol className="space-y-0.5" data-testid="passport-response-history">
                {lc.touches.map((tc, i) => (
                  <li key={tc.start} className="grid grid-cols-[14px_1fr_auto_auto] gap-2 text-[12.5px]">
                    <span style={{ color: "#8B8676" }}>{i + 1}</span>
                    <span className="text-white">{t(tc.start).slice(5, 16)}</span>
                    <span style={{ color: tc.response === "REJECTED" ? "#F0B429" : tc.response === "INVALIDATED" ? "#FF4D6A" : "#EDE6D3" }}>
                      {tc.response === "REJECTED" ? "Rejection" : tc.response === "INVALIDATED" ? "Close beyond" : "Open"}{tc.swept ? " · swept" : ""}
                    </span>
                    <span style={{ color: "#8B8676" }}>{tc.response === "REJECTED" ? heldWord : "—"}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="space-y-1 px-4 py-3">
            <Head icon={Activity}>CURRENT STATE</Head>
            <div className="text-[12.5px]"><span className="font-bold" style={{ color: stateColor }}>{lc.state}</span> <span style={{ color: "#C8C0AE" }}>· {stateNote[lc.state]}</span></div>
            {lc.touches.length > 0 && <div className="text-[12.5px]" style={{ color: "#C8C0AE" }}>Price last touched {t(lc.touches[lc.touches.length - 1].end)}</div>}
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={Clock}>DECAY</Head>
            <p className="text-[12.5px]" style={{ color: "#C8C0AE" }}>
              Decay is stated, not projected: age and tests only. No half-life or invalidation probability is published — nothing measured one.
            </p>
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={ShieldCheck}>SOURCE FIDELITY</Head>
            <Row k="Fidelity" v={z.object.fidelityAtBirth} />
            <Row k="Origin" v="Confirmed swing from the structure owner" />
          </div>
          {/* GARDEN 12 · THE TRUTH MICROSCOPE — LINEAGE, by id, from the owners
              verbatim (selectZoneLineage): the object, its session, the birth
              bar's admitted source and provenance, every evidence id, both
              owners and the lifecycle version, and the chain BAR → OBJECT →
              DECISION. Calm on the glass, deep here. The Decision_ID sits in
              the chain BESIDE the object, never merged; nothing reprints the bar. */}
          <div className="space-y-1 px-4 py-3" data-testid="passport-provenance"
            data-inspect-lineage={lineage ? lineage.birth.state : "NOT_COMPILED"}>
            <Head icon={FileText}>LINEAGE</Head>
            <Row k="Object" v={<span className="break-all font-mono text-[11px]">{z.object.objectId}</span>} />
            {lineage ? (
              <>
                <Row k="Kind" v={`${lineage.kind} · session ${lineage.sessionId}`} />
                <Row k="Birth bar" v={lineage.birth.state === "READ"
                  ? <span className="break-all font-mono text-[11px]">{lineage.birth.line}</span>
                  : <span style={{ color: UNREAD_COLOR }}>{lineage.birth.absence} <span className="break-all font-mono text-[11px]">{lineage.birth.barId}</span></span>} />
                <Row k="Evidence" v={lineage.evidence.length === 0 ? "none attached" : (
                  <ol className="space-y-0.5" data-testid="passport-evidence">
                    {lineage.evidence.map(e => (
                      <li key={e.id}><span className="break-all font-mono text-[11px]">{e.id}</span> <span style={{ color: "#8B8676" }}>· {e.role === "BIRTH" ? "birth" : "test"}</span></li>
                    ))}
                  </ol>
                )} />
                <Row k="Method" v={lineage.method} />
                <Row k="As of" v={t(Math.floor(lineage.asOf / 1000))} />
                <div data-inspect-chain={lineage.chain.state}>
                  <Row k="Chain" v={lineage.chain.state === "READ"
                    ? <span className="break-all font-mono text-[11px]">{lineage.chain.line}</span>
                    : <span style={{ color: UNREAD_COLOR }}>{lineage.chain.reason}</span>} />
                </div>
              </>
            ) : (
              <>
                <Row k="Born on bar" v={<span className="break-all font-mono text-[11px]">{z.object.birthBarId}</span>} />
                <Row k="Decision" v={activeDecisionId ? <span className="break-all font-mono text-[11px]">{activeDecisionId}</span> : "none born on this camera"} />
                <Row k="Lineage" v={<span style={{ color: UNREAD_COLOR }}>Not compiled for this object.</span>} />
              </>
            )}
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={AlertTriangle}>INVALIDATION CONDITION</Head>
            <div className="text-[12.5px]" style={{ color: "#C8C0AE" }}>
              Invalidated if a close {z.side === "DEMAND" ? "below" : "above"} <span style={{ color: "#FF4D6A" }}>{String(+lc.invalidationPrice.toPrecision(8))}</span>
              {lc.invalidatedAt != null ? ` — happened ${t(lc.invalidatedAt)}` : ""}
            </div>
            <div className="text-[11px]" style={{ color: "#8B8676" }}>(Bar close beyond the far edge · a wick through is a sweep, not a break)</div>
          </div>
        </div>
      </section>
    );
  }

  /*
    F11 · MARKET OBJECT PASSPORT for a LEVEL. "Kind only changes the noun on
    the door. The drawer layout does not change." A selected swing level fell
    through to the bar ticket; it now reads its own slots (SHARED_ATTACHMENT_
    SLOTS) and the same LINEAGE owner as a zone. The level owner publishes only
    CONFIRMED, UNTOUCHED swing levels and has no lifecycle owner yet — so
    touches, response history and an invalidation rule are stated as absent,
    never inferred.
  */
  if (selectedLevel) {
    const o = selectedLevel;
    const lineage = levelLineage?.objectId === o.objectId ? levelLineage : null;
    const t = clock.stamp;
    // Full precision (a 1.08347 FX level is not "1.08").
    const px = (v: number) => String(+v.toPrecision(8));
    const price = o.priceLow === o.priceHigh ? px(o.priceHigh) : `${px(o.priceLow)} – ${px(o.priceHigh)}`;
    const memoryKind = memoryLevelKindOf(o.objectId);
    const side = memoryKind ? `Prior-session ${memoryKind}`
      : o.objectId.endsWith(":HIGH") ? "Swing high" : o.objectId.endsWith(":LOW") ? "Swing low" : null;
    const Head = ({ icon: Icon, children }: { icon: typeof Crosshair; children: React.ReactNode }) => (
      <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.1em] text-wm-gold">
        <Icon size={15} aria-hidden /> {children}
      </div>
    );
    const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
      <div className="grid grid-cols-[104px_1fr] gap-2 text-[12.5px] leading-[1.45]"><span style={{ color: "#8B8676" }}>{k}</span><span className="text-white">{v}</span></div>
    );
    return (
      <section className="absolute top-2 left-2 w-[372px] max-w-[calc(100%-1rem)] max-h-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-wm-gold/40 shadow-2xl"
        style={{ background: "#0d0c0a", zIndex: 80 }}
        data-testid="chart-inspect-ticket" data-inspect-object={o.objectId} data-inspect-kind={o.kind}
        aria-label={`Market object passport. ${o.kind} ${price}. ${o.state}.`}>
        <div className="flex items-start gap-2 border-b border-wm-border px-4 py-3">
          <FileText size={22} className="mt-0.5 text-wm-gold" aria-hidden />
          <div className="min-w-0">
            <div className="text-[14px] font-bold tracking-[0.08em] text-white">MARKET OBJECT PASSPORT</div>
            <div className="text-[12px]" style={{ color: "#C8C0AE" }}>{o.kind === "LEVEL" ? "Level" : o.kind} · {price}{side ? ` · ${side.toLowerCase()}` : ""}</div>
          </div>
          <button className="ml-auto" aria-label="Close the passport" onClick={() => onOpenChange(false)}><X size={14} /></button>
        </div>
        <div className="divide-y divide-wm-border/70">
          <div className="space-y-1 px-4 py-3">
            <Head icon={CalendarDays}>BIRTH</Head>
            {side && <Row k="Origin" v={<span className="text-wm-gold">{side}</span>} />}
            <Row k="Price" v={price} />
            <Row k="Fidelity" v={o.fidelityAtBirth} />
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={Hourglass}>AGE · STATE</Head>
            <Row k="Since birth" v={`${o.decay} bars`} />
            <Row k="State" v={o.state} />
            <Row k="Touches" v={o.testBarIds.length === 0
              ? (memoryKind ? "None since birth — still naked" : "None since birth — the level owner publishes only untouched levels; a touched level leaves the glass")
              : `${o.testBarIds.length} recent — each test bar is in the evidence list${memoryKind ? " (Profile Memory keeps the most recent)" : ""}`} />
            <Row k="Invalidation" v={o.invalidationPrice == null ? <span style={{ color: UNREAD_COLOR }}>No rule stated — this level has no lifecycle owner yet</span> : px(o.invalidationPrice)} />
          </div>
          <div className="space-y-1 px-4 py-3" data-testid="passport-provenance"
            data-inspect-lineage={lineage ? lineage.birth.state : "NOT_COMPILED"}>
            <Head icon={FileText}>LINEAGE</Head>
            <Row k="Object" v={<span className="break-all font-mono text-[11px]">{o.objectId}</span>} />
            {lineage ? (
              <>
                <Row k="Kind" v={`${lineage.kind} · session ${lineage.sessionId}`} />
                <Row k="Birth bar" v={lineage.birth.state === "READ"
                  ? <span className="break-all font-mono text-[11px]">{lineage.birth.line}</span>
                  : <span style={{ color: UNREAD_COLOR }}>{lineage.birth.absence} <span className="break-all font-mono text-[11px]">{lineage.birth.barId}</span></span>} />
                <Row k="Evidence" v={lineage.evidence.length === 0 ? "none attached" : (
                  <ol className="space-y-0.5" data-testid="passport-evidence">
                    {lineage.evidence.map(e => (
                      <li key={e.id}><span className="break-all font-mono text-[11px]">{e.id}</span> <span style={{ color: "#8B8676" }}>· {e.role === "BIRTH" ? "birth" : "test"}</span></li>
                    ))}
                  </ol>
                )} />
                <Row k="Method" v={lineage.method} />
                <Row k="As of" v={t(Math.floor(lineage.asOf / 1000))} />
                <div data-inspect-chain={lineage.chain.state}>
                  <Row k="Chain" v={lineage.chain.state === "READ"
                    ? <span className="break-all font-mono text-[11px]">{lineage.chain.line}</span>
                    : <span style={{ color: UNREAD_COLOR }}>{lineage.chain.reason}</span>} />
                </div>
              </>
            ) : (
              <>
                <Row k="Born on bar" v={<span className="break-all font-mono text-[11px]">{o.birthBarId}</span>} />
                <Row k="Decision" v={activeDecisionId ? <span className="break-all font-mono text-[11px]">{activeDecisionId}</span> : "none born on this camera"} />
                <Row k="Lineage" v={<span style={{ color: UNREAD_COLOR }}>Not compiled for this object.</span>} />
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (selectedAnatomy) {
    return <AnatomyTicket sel={selectedAnatomy} onClose={() => onOpenChange(false)} timeZone={timeZone} />;
  }

  if (selectedProfileSlice) {
    const sl = selectedProfileSlice;
    const fmt = (n: number) => n.toFixed(2);
    return (
      <section className="absolute top-16 right-[76px] z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
        data-testid="chart-inspect-ticket"
        data-inspect-profile-slice={sl.found ? String(sl.price) : sl.miss}
        aria-label={sl.found ? `Inspect profile slice at ${fmt(sl.price)}` : "Inspect profile slice: no traded bucket at that price"}>
        <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
          <Crosshair size={11} /> PROFILE SLICE · LIVING
          <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
        </div>
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
      </section>
    );
  }

  if (selectedPrint) {
    const p = selectedPrint;
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
    if (p.kind === "delta") {
      // A DELTA ZONE is a net across a price bucket, not a print: no
      // "executed", no "at", no execution identity (bubbleClaim.ts).
      const net = p.ask - p.bid;
      return (
        <section className="absolute top-16 right-[76px] z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
          data-testid="chart-inspect-ticket" data-inspect-delta-zone={p.printKey}
          aria-label={`Inspect selected delta zone for ${p.symbol}`}>
          <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
            <Crosshair size={11} /> SELECTED DELTA ZONE
            <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
          </div>
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
      <section className="absolute top-16 right-[76px] z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
        data-testid="chart-inspect-ticket" data-inspect-print={p.printKey}
        aria-label={`Inspect selected print for ${p.symbol}`}>
        <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
          <Crosshair size={11} /> SELECTED PRINT
          <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
        </div>
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
      </section>
    );
  }

  const time =
    vm.barOpenMs !== null
      ? new Date(vm.barOpenMs).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : null;

  return (
    <div
      /* `right-[76px]` clears the price scale; `top-16` clears the chart's own
         top chrome; `max-h` + `overflow-y-auto` is what stops a fully-refused
         ticket from having its last sentences cut off by the pane floor. */
      className="absolute top-16 right-[76px] z-[75] w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-border bg-wm-surface/95 p-2 shadow-2xl backdrop-blur-md"
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
        {vm.rows.map(row => (
          <Row key={row.id} row={row} />
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
          <div>Method {fusion.method} v{fusion.version} · grid {fusion.step} · asOf {fusion.asOf != null ? clock.stamp(fusion.asOf) : "—"} · fidelity {fusion.fidelity ?? "not carried on these bars"}</div>
        </div>
      )}

      {profileDna && <ProfileDnaBlock dna={profileDna} onGlass={profileDnaOnGlass} />}

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
        <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug" data-inspect-memory-ghost={memoryGhost.reason} style={{ color: "#C8C0AE" }}>
          <div className="font-bold tracking-wide text-wm-gold">MEMORY GHOST · {memoryGhost.drawn ? "ANALOGUE" : "NO ANALOGUE DRAWN"}</div>
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
