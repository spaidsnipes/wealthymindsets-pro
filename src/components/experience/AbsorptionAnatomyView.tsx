"use client";

/**
 * AbsorptionAnatomyView — the Founder's Asset 06, as a full symbol VIEW.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A VIEW AND NOT A DRAWER TILE
 *
 * `AbsorptionAnatomyPanel` already lives in the Smart Money drawer. It answers
 * "was this window absorbed?" in two facing bars and a verdict word. That is a
 * SUMMARY of the invention. The approved mockup is a three-column surface whose
 * whole point is the RELATIONSHIP between two series in price/time space — the
 * effort field's height against the price path's slope, with the absorption
 * band pinned where the field is tall and the path is flat.
 *
 * You cannot fold that into a drawer tile without throwing away the picture,
 * which is why the Founder drew it as a picture. So it is a sibling of `Chart`
 * in the VIEW dropdown, and the drawer tile stays where it is as the summary.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT IS OFFERED ON EVERY ASSET CLASS
 *
 * On a symbol whose feed carries no aggressor side this view renders honestly
 * empty rather than being hidden. Hiding it would make the missing input
 * invisible, which is the exact opposite of what the drawer's own
 * missing-aggressor banner exists to do.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANTI-FABRICATION
 *
 * The mockup prints `CONVICTION 82%`. There is no probability model behind that
 * number and this file does not invent one: conviction renders as the real
 * `AbsorptionStrength` with the gauge filled from the efficiency ratio's actual
 * position on the code's own ladder. Every absent figure renders as an em dash,
 * never as a zero — a zero asserts that a count was taken.
 */

import React from "react";
import type {
  AbsorptionAnatomyViewVM,
  AbsorptionCriterion,
} from "@/lib/marketData/viewModels/selectAbsorptionAnatomyView";
import type { EffortBasis } from "@/lib/marketData/selectAbsorptionAnatomy";
import { selectAbsorptionQuestion } from "@/lib/experience/selectAbsorptionQuestion";
import ActiveQuestionBar from "@/components/command/ActiveQuestionBar";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const BUY = "#00D4AA";
const SELL = "#FF4D6A";
const PANEL = "rgba(18,16,12,0.72)";

const BASIS_LABEL: Record<EffortBasis, string> = {
  SIGNED_DELTA: "EFFORT · DELTA",
  INFERRED_DELTA: "EFFORT · DELTA (INFERRED)",
  VOLUME: "EFFORT · VOLUME",
  UNMEASURED: "EFFORT · UNMEASURED",
};

/** A number that is absent renders as an em dash, never as zero. */
function num(v: number | null, digits = 2): string {
  return v == null ? "—" : v.toFixed(digits);
}

function vol(v: number | null): string {
  return v == null ? "—" : Math.round(v).toLocaleString("en-US");
}

function pct(v: number | null): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section
      style={{
        border: `1px solid ${HAIR}`,
        background: PANEL,
        borderRadius: 4,
        padding: "10px 12px 12px",
        minWidth: 0,
      }}
    >
      <h3
        style={{
          fontSize: 9,
          letterSpacing: 1.1,
          color: GOLD_DIM,
          textTransform: "uppercase",
          margin: "0 0 8px",
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Reading({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: string;
}): React.ReactElement {
  return (
    <div style={{ marginBottom: 10, minWidth: 0 }}>
      <div style={{ fontSize: 9, letterSpacing: 0.7, color: MUTED, textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          color: tone ?? TEXT,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
      {note ? <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.35 }}>{note}</div> : null}
    </div>
  );
}

/**
 * §9 — NO GREEN MEANS SAFE, IN THE ROOM.
 *
 * The mockup ticks these criteria in green. A green ✓ beside "High effort" is
 * the green shield by definition: a colour telling the trader a condition has
 * been met. The glyph already carries that, and the basis line under it
 * carries the evidence, so the tick renders in ivory and the room keeps its
 * promise. Green survives in this file for exactly one job — the BUY side of a
 * directional volume split, which is a statement about who was the aggressor,
 * not about whether anything is safe.
 */
const CRITERION_MARK: Record<AbsorptionCriterion["state"], { glyph: string; tone: string }> = {
  MET: { glyph: "✓", tone: TEXT },
  NOT_MET: { glyph: "✗", tone: SELL },
  // Not a failed test — a test that was never run. It must not read as a "no".
  UNMEASURED: { glyph: "—", tone: MUTED },
};

function CriterionRow({ item }: { item: AbsorptionCriterion }): React.ReactElement {
  const mark = CRITERION_MARK[item.state];
  return (
    <li
      data-testid="absorption-criterion"
      style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: `1px solid ${HAIR}` }}
    >
      <span style={{ color: mark.tone, fontSize: 12, lineHeight: 1.4, width: 12, flexShrink: 0 }}>
        {mark.glyph}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 11, color: TEXT }}>{item.label}</span>
        <span style={{ display: "block", fontSize: 10, color: MUTED, lineHeight: 1.35 }}>
          {item.basis}
        </span>
      </span>
    </li>
  );
}

/**
 * The centre column: the effort field, the price path riding on it, and the
 * absorption band pinned at the price where the auction actually happened.
 *
 * Geometry only. Every value it draws arrived already measured.
 */
function EffortField({ vm }: { vm: AbsorptionAnatomyViewVM }): React.ReactElement {
  const W = 720;
  const H = 260;
  const PAD_T = 10;
  const PAD_B = 18;
  const bars = vm.bars;
  const n = bars.length;

  const lo = bars.reduce((m, b) => Math.min(m, b.low), Infinity);
  const hi = bars.reduce((m, b) => Math.max(m, b.high), -Infinity);
  const span = hi - lo;
  const yOf = (price: number): number =>
    span > 0 ? PAD_T + (1 - (price - lo) / span) * (H - PAD_T - PAD_B) : H / 2;
  const xOf = (i: number): number => (n > 1 ? (i / (n - 1)) * W : W / 2);
  const colW = n > 0 ? Math.max(1, (W / n) * 0.72) : 1;

  const path = bars.map((b, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(b.close).toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Effort against price displacement over the last ${vm.windowBars} bars`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Effort field — height is that bar's aggression intensity, normalised
          over this window only. Never compared to another session's number. */}
      {bars.map((b, i) => {
        const h = b.effortNorm * (H - PAD_T - PAD_B);
        return (
          <rect
            key={`e-${b.time}-${i}`}
            x={xOf(i) - colW / 2}
            y={H - PAD_B - h}
            width={colW}
            height={Math.max(0, h)}
            fill={b.absorbing ? "rgba(212,175,55,0.38)" : "rgba(212,175,55,0.14)"}
          />
        );
      })}

      {/* Absorption bands, pinned AT A PRICE. */}
      {vm.zones.map((z, i) => {
        const yHi = yOf(z.priceHi);
        const yLo = yOf(z.priceLo);
        const first = bars.findIndex(b => b.time >= z.startTime);
        const last = bars.map(b => b.time <= z.endTime).lastIndexOf(true);
        const x0 = xOf(Math.max(0, first));
        const x1 = xOf(Math.max(0, last));
        return (
          <g key={`z-${z.startTime}-${i}`}>
            <rect
              x={Math.min(x0, x1) - colW / 2}
              y={yHi}
              width={Math.max(colW, Math.abs(x1 - x0) + colW)}
              height={Math.max(2, yLo - yHi)}
              // Ivory, not green. The band marks WHERE absorption was found;
              // it does not certify that the find is good news for anyone.
              fill="rgba(237,230,211,0.07)"
              stroke="rgba(237,230,211,0.55)"
              strokeDasharray="4 3"
            />
          </g>
        );
      })}

      {/* Price displacement — flatter slope is the inefficiency the view is for. */}
      <path d={path} fill="none" stroke={GOLD} strokeWidth={1.6} />
    </svg>
  );
}

export interface AbsorptionAnatomyViewProps {
  readonly vm: AbsorptionAnatomyViewVM;
  readonly symbol: string;
  readonly timeframe?: string;
}

export function AbsorptionAnatomyView({
  vm,
  symbol,
  timeframe,
}: AbsorptionAnatomyViewProps): React.ReactElement {
  const strength = vm.conviction.strength;
  // STRONG is a GRADE, and §9 forbids rendering a grade in green. The three
  // steps read as brass intensity instead, which encodes rank without
  // promising the trader that anything has been cleared.
  const strengthTone = strength === "STRONG" ? GOLD : strength === "MODERATE" ? GOLD_DIM : MUTED;

  /**
   * ASSET 04 — the question this surface exists to answer, at the top, in the
   * largest type on the canvas.
   *
   * Asset 06 shipped as a panel grid: header, reason line, effort field,
   * checklist, gauge. Every cell true, none of them the QUESTION. The Founder's
   * ledger calls that out by name — the canon's worked example of the Active
   * Question banner IS this surface, and this surface was the one place it was
   * missing. Compiled, not written: the same VM that draws the field below.
   */
  const asked = React.useMemo(() => selectAbsorptionQuestion(vm), [vm]);

  return (
    <div
      data-testid="absorption-anatomy-view"
      style={{ padding: 14, color: TEXT, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}
    >
      <ActiveQuestionBar question={asked.question} focus={asked.focus} mode="Observe" />

      <header style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, letterSpacing: 1.4, color: GOLD, textTransform: "uppercase" }}>
          Absorption Anatomy
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>
          {symbol}
          {timeframe ? ` · ${timeframe}` : ""} · last {vm.windowBars} bars
        </span>
        <span
          data-testid="absorption-basis"
          style={{
            marginLeft: "auto",
            fontSize: 9,
            letterSpacing: 1,
            color: GOLD_DIM,
            border: `1px solid ${HAIR}`,
            borderRadius: 3,
            padding: "2px 7px",
          }}
        >
          {BASIS_LABEL[vm.basis]}
        </span>
      </header>

      {/* ONE honest line about the whole surface, in every state. */}
      <p data-testid="absorption-reason" style={{ margin: 0, fontSize: 11, color: MUTED, lineHeight: 1.45 }}>
        {vm.reason}
      </p>

      {!vm.measured ? (
        <div
          data-testid="absorption-unmeasured"
          style={{ border: `1px solid ${HAIR}`, background: PANEL, borderRadius: 4, padding: 20, fontSize: 12, color: MUTED }}
        >
          Nothing observable backs this window — no traded volume and no aggressor side reached
          this surface. No field is drawn, because a flat band would read as “no pressure”, and
          that is a different claim from “nothing was measured”.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr) minmax(0, 250px)",
            gap: 12,
            alignItems: "start",
          }}
          className="wm-absorption-anatomy-grid"
        >
          {/* ── LEFT: raw aggression metrics ─────────────────────────── */}
          <Section title="Raw aggression metrics">
            <Reading
              label="Buyer initiated"
              value={vol(vm.aggression.buyInitiated)}
              note={vm.aggression.buyShare == null ? "not carried on this tape" : `${pct(vm.aggression.buyShare)} of aggressive volume`}
              tone={vm.aggression.buyInitiated == null ? MUTED : BUY}
            />
            <Reading
              label="Seller initiated"
              value={vol(vm.aggression.sellInitiated)}
              note={vm.aggression.sellShare == null ? "not carried on this tape" : `${pct(vm.aggression.sellShare)} of aggressive volume`}
              tone={vm.aggression.sellInitiated == null ? MUTED : SELL}
            />
            <Reading
              label="Aggression delta"
              value={vol(vm.aggression.netDelta)}
              note={
                vm.aggression.netDelta == null
                  ? "aggressor side is undisclosed — no delta exists to sum"
                  : "buy minus sell, across the window"
              }
              tone={
                vm.aggression.netDelta == null
                  ? MUTED
                  : vm.aggression.netDelta > 0
                    ? BUY
                    : SELL
              }
            />
            <Reading
              label="Traded volume"
              value={vol(vm.aggression.totalVolume)}
              note="observed, unsigned — the basis the field falls back to"
            />
          </Section>

          {/* ── CENTRE: effort vs price displacement ─────────────────── */}
          <Section title="Effort (pressure) vs price displacement">
            <EffortField vm={vm} />
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 10, color: MUTED }}>
              <span>Column height = aggression intensity, normalised over this window</span>
              <span>Flatter path slope = inefficiency</span>
            </div>

            {/* The efficiency ladder — the mockup's thresholds ARE the code's. */}
            <div style={{ marginTop: 12, borderTop: `1px solid ${HAIR}`, paddingTop: 10 }}>
              <div style={{ fontSize: 9, letterSpacing: 0.8, color: MUTED, textTransform: "uppercase" }}>
                Efficiency ratio
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span
                  data-testid="absorption-efficiency"
                  style={{ fontSize: 22, color: strengthTone, fontVariantNumeric: "tabular-nums" }}
                >
                  {vm.conviction.unbounded ? "∞" : num(vm.conviction.ratio)}
                </span>
                <span style={{ fontSize: 10, color: MUTED }}>
                  &gt; 5.0 strong · 2.0–5.0 moderate · &lt; 2.0 weak
                </span>
              </div>
              {vm.conviction.unbounded ? (
                <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.35 }}>
                  the run displaced price not at all, so the ratio has no finite value — it is not
                  clamped to a large number, because a ceiling would read as a measurement
                </div>
              ) : null}
            </div>
          </Section>

          {/* ── RIGHT: characteristics + conviction ──────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <Section title="Absorption characteristics">
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {vm.checklist.map(item => (
                  <CriterionRow key={item.label} item={item} />
                ))}
              </ul>
            </Section>

            <Section title="Current conviction">
              {/* NOT a percentage. The mockup's 82% has no model behind it; this
                  is the real strength word with the bar filled from the ratio's
                  actual position on the code's own ladder. */}
              <div
                data-testid="absorption-conviction"
                style={{ fontSize: 20, letterSpacing: 1.2, color: strengthTone }}
              >
                {strength ?? "—"}
              </div>
              <div
                aria-hidden
                style={{ height: 6, background: "rgba(139,106,41,0.18)", borderRadius: 3, overflow: "hidden", margin: "8px 0 6px" }}
              >
                <div
                  style={{
                    width: `${(vm.conviction.ladderFill ?? 0) * 100}%`,
                    height: "100%",
                    background: strengthTone,
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4 }}>
                {strength == null
                  ? "no zone qualified in this window, so there is no conviction to state"
                  : "the strength of the most recent zone — the current one, not the strongest one in the window"}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* The grid folds to one column where three would be unreadable. The
          breakpoint is the same one the watchlist and the drawing rail use. */}
      <style jsx>{`
        @media (max-width: 1100px) {
          .wm-absorption-anatomy-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AbsorptionAnatomyView;
