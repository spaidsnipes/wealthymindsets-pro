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
import { describeAggressorMethod, formatBubbleExact, formatBubblePrice, formatBubbleVolume } from "@/lib/bubbleClaim";
import { Activity, AlertTriangle, CalendarDays, Clock, Crosshair, FileText, Hourglass, ShieldCheck, Target, X } from "lucide-react";

import type { InspectTicketVM, TicketRow } from "@/lib/marketData/viewModels/selectInspectTicket";
import type { ProfileSliceResult } from "@/lib/marketData/viewModels/selectProfileSlice";
import type { StructureZone } from "@/lib/marketData/viewModels/selectStructureZoneObjects";

/** A refused row is the WARM colour, not the alarm colour. It is a fact about
 *  the feed, not a problem the trader caused. */
const UNREAD_COLOR = "#F0B429";
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
  contradiction = null,
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
  /** H-401 · "Passport shows both family lines." */
  contradiction?: ContradictionVM | null;
}) {
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
    const t = (s: number) => new Date(s * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
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
      <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.12em] text-wm-gold">
        <Icon size={13} aria-hidden /> {children}
      </div>
    );
    const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
      <div className="grid grid-cols-[92px_1fr] gap-2 text-[11px]"><span style={{ color: "#8B8676" }}>{k}</span><span className="text-white">{v}</span></div>
    );
    return (
      // LEFT WALL, not right: a zone is born at a recent swing, so it lives at
      // the right of the camera — a right-hand passport covered the very
      // object it describes. The plate shows the zone beside its passport.
      <section className="absolute top-2 bottom-2 left-2 w-[340px] overflow-y-auto rounded-lg border border-wm-gold/40 shadow-2xl"
        // Opaque and above the chart's own chips: the passport is the object
        // being read, so nothing on the glass may show through or sit on it.
        style={{ background: "#0d0c0a", zIndex: 80 }}
        data-testid="chart-inspect-ticket" data-inspect-zone={z.object.objectId}
        aria-label={`Market object passport. ${z.side} zone ${z.object.priceLow} to ${z.object.priceHigh}. ${lc.state}.`}>
        <div className="flex items-start gap-2 border-b border-wm-border px-4 py-3">
          <FileText size={18} className="mt-0.5 text-wm-gold" aria-hidden />
          <div className="min-w-0">
            <div className="text-[12px] font-bold tracking-[0.1em] text-white">MARKET OBJECT PASSPORT</div>
            <div className="text-[10px]" style={{ color: "#C8C0AE" }}>
              {z.side === "DEMAND" ? "Demand" : "Supply"} zone · {z.origin.toLowerCase()} <span style={{ color: stateColor }}>●</span>
            </div>
          </div>
          <button className="ml-auto" aria-label="Close the passport" onClick={() => onOpenChange(false)}><X size={14} /></button>
        </div>
        <div className="divide-y divide-wm-border/70">
          <div className="space-y-1 px-4 py-3">
            <Head icon={CalendarDays}>BIRTH</Head>
            <Row k="Created" v={t(z.birthTime)} />
            <Row k="Origin" v={<><span className="text-wm-gold">{z.side === "DEMAND" ? "Swing low" : "Swing high"}</span> · {z.object.priceLow.toFixed(2)} – {z.object.priceHigh.toFixed(2)}</>} />
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
              <p className="text-[11px]" style={{ color: "#C8C0AE" }}>None since birth.</p>
            ) : (
              <div className="relative mt-1 flex justify-between px-1" data-testid="passport-touch-timeline">
                <div className="absolute left-2 right-2 top-[5px] h-px bg-wm-gold/30" aria-hidden />
                {lc.touches.map(tc => (
                  <div key={tc.start} className="relative flex flex-col items-center gap-1">
                    <span className="h-[11px] w-[11px] rounded-full" style={{ background: tc.response === "INVALIDATED" ? "#FF4D6A" : tc.response === "OPEN" ? "transparent" : "#F0B429", border: "1px solid #F0B429" }} />
                    <span className="text-[9px]" style={{ color: "#C8C0AE" }}>{t(tc.start).slice(5, 16)}</span>
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
                  <li key={tc.start} className="grid grid-cols-[14px_1fr_auto_auto] gap-2 text-[11px]">
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
            <div className="text-[11px]"><span className="font-bold" style={{ color: stateColor }}>{lc.state}</span> <span style={{ color: "#C8C0AE" }}>· {stateNote[lc.state]}</span></div>
            {lc.touches.length > 0 && <div className="text-[11px]" style={{ color: "#C8C0AE" }}>Price last touched {t(lc.touches[lc.touches.length - 1].end)}</div>}
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={Clock}>DECAY</Head>
            <p className="text-[11px]" style={{ color: "#C8C0AE" }}>
              Decay is stated, not projected: age and tests only. No half-life or invalidation probability is published — nothing measured one.
            </p>
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={ShieldCheck}>SOURCE FIDELITY</Head>
            <Row k="Fidelity" v={z.object.fidelityAtBirth} />
            <Row k="Origin" v="Confirmed swing from the structure owner" />
          </div>
          <div className="space-y-1 px-4 py-3">
            <Head icon={AlertTriangle}>INVALIDATION CONDITION</Head>
            <div className="text-[11px]" style={{ color: "#C8C0AE" }}>
              Invalidated if a close {z.side === "DEMAND" ? "below" : "above"} <span style={{ color: "#FF4D6A" }}>{lc.invalidationPrice.toFixed(2)}</span>
              {lc.invalidatedAt != null ? ` — happened ${t(lc.invalidatedAt)}` : ""}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (selectedProfileSlice) {
    const sl = selectedProfileSlice;
    const fmt = (n: number) => n.toFixed(2);
    return (
      <section className="absolute top-16 right-[76px] z-20 w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
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
              <dt>As of · UTC</dt><dd>{profileSliceAsOf != null ? new Date(profileSliceAsOf * 1000).toISOString() : "UNKNOWN"}</dd>
            </dl>
            <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>A bucket is where size traded, not who traded it or why. Intent: UNKNOWN.</p>
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
    const relation = p.relation
      ? `#${p.relation.rank} of ${p.relation.of} retained ${p.kind === "delta" ? "delta zones" : "big prints"} on this chart · median ${formatBubbleVolume(p.relation.median)}`
      : "not ranked — no other bubble of this kind is retained";
    if (p.kind === "delta") {
      // A DELTA ZONE is a net across a price bucket, not a print: no
      // "executed", no "at", no execution identity (bubbleClaim.ts).
      const net = p.ask - p.bid;
      return (
        <section className="absolute top-16 right-[76px] z-20 w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
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
            <dt>Bar · UTC</dt><dd>{Number.isFinite(p.barTime) ? new Date(p.barTime * 1000).toISOString() : "UNKNOWN"}</dd>
            <dt>Side fidelity</dt><dd>{stamped ? "OBSERVED" : inferred ? "INFERRED" : "UNKNOWN"} · {describeAggressorMethod(p.aggressorMethod)}</dd>
            <dt>Size relation</dt><dd>{relation}</dd>
          </dl>
          <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>A net across a price bucket — not a single print. Participant and intent: UNKNOWN. Raw tape is session-only; refresh may remove it.</p>
        </section>
      );
    }
    return (
      <section className="absolute top-16 right-[76px] z-20 w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
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
          <dt>Execution time · UTC</dt><dd>{p.timeMs != null ? new Date(p.timeMs).toISOString() : "UNKNOWN"}</dd>
          <dt>Side fidelity</dt><dd>{stamped ? "OBSERVED" : inferred ? "INFERRED" : "UNKNOWN"}{stamped || inferred ? ` · ${p.ask >= p.bid ? "buy" : "sell"} classification` : " · classification not verified"}</dd>
          <dd>{describeAggressorMethod(p.aggressorMethod)}</dd>
          <dt>Execution identity</dt><dd>{p.printKey ?? "UNKNOWN"}</dd>
          <dt>Size relation</dt><dd>{relation}</dd>
        </dl>
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
      className="absolute top-16 right-[76px] z-20 w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-border bg-wm-surface/95 p-2 shadow-2xl backdrop-blur-md"
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
