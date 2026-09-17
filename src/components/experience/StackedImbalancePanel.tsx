"use client";

/**
 * STACKED IMBALANCE + RESPONSE ENGINE — the claim, drawn above its test.
 *
 * THE VERDICT IS A PICTURE, NOT A WORD. DEFENDED, BROKEN and UNTESTED are
 * three claims a reader cannot check, so the panel draws the stack as a band
 * and the response as a mark against it. Whether price stopped inside the
 * band, tore out the far side, or never came near it is then a thing the
 * reader SEES, and the word underneath is a label on the picture rather than
 * a substitute for it.
 *
 * Three things here exist because leaving them out would flatter the reading:
 *
 *   · THE 60/40 SPLIT IS PRINTED. It is the one arbitrary number in the whole
 *     module, and the entire verdict depends on it. A reader who does not know
 *     where the line fell cannot judge whether the test was a real one.
 *
 *   · THE AGGRESSOR DISCLOSURE IS UNCONDITIONAL. Its neighbour
 *     `LiquidityWeatherPanel` shows provenance only as context, because that
 *     module never reads `side`. This one is built entirely out of who paid,
 *     so on a tick-rule tape every level on screen is downstream of a guess.
 *     That is not a footnote about the feed, it is the standing of the
 *     finding, and it is rendered at full strength every time.
 *
 *   · RATIOS GO THROUGH `formatImbalanceRatio`. That module owns the 300
 *     sentinel and the unbounded tail, both of which were real screen defects
 *     before it existed. A panel that formats them itself is a panel that
 *     brings both bugs back.
 */

import * as React from "react";
import type {
  StackedImbalanceVM,
  StackVerdict,
} from "@/lib/marketData/viewModels/selectStackedImbalance";
import formatImbalanceRatio from "@/lib/marketData/formatImbalanceRatio";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const BULL = "#00D4AA";
const BEAR = "#FF4D6A";
const PRICE = "#4FA3E0";

/**
 * Tone follows the STANDING of the claim, not its direction. A defended buy
 * stack and a defended sell stack are the same KIND of information — a level
 * that was tested and held — and colouring them by side would tell the reader
 * which way to lean, which is not this panel's job.
 */
const VERDICT_TONE: Record<StackVerdict, string> = {
  DEFENDED: BULL,
  BROKEN: BEAR,
  UNTESTED: GOLD,
  NO_STACK: MUTED,
  UNMEASURED: MUTED,
};

const VERDICT_GLOSS: Record<StackVerdict, string> = {
  DEFENDED: "price came back and did not get through",
  BROKEN: "price came back and went straight through",
  UNTESTED: "price never came back — nothing is proven",
  NO_STACK: "no run of levels leaned one way",
  UNMEASURED: "not enough sided tape to build a ladder",
};

function priceText(v: number | null | undefined, tick: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const dp = tick == null ? 2 : tick >= 1 ? 0 : tick >= 0.01 ? 2 : 4;
  return v.toFixed(dp);
}

export default function StackedImbalancePanel({
  vm,
  symbol,
  window: windowLabel,
}: {
  vm: StackedImbalanceVM;
  symbol?: string;
  window?: string;
}) {
  const tone = VERDICT_TONE[vm.verdict];
  const isBuy = vm.direction === "BUY";
  const hasStack = vm.levels.length > 0 && vm.stackLow != null && vm.stackHigh != null;

  // Heaviest level sets the bar scale, so the rows are comparable to each
  // other rather than each one filling its own width.
  const heaviest = hasStack ? Math.max(...vm.levels.map((l) => l.dominantVolume)) : 0;

  // Levels are drawn HIGH PRICE FIRST, the way a ladder is read.
  const rows = [...vm.levels].sort((a, b) => b.price - a.price);

  const totalPrints = vm.formationPrints + vm.responsePrints;
  const splitPct = totalPrints > 0 ? Math.round((vm.formationPrints / totalPrints) * 100) : 0;

  return (
    <div
      data-testid="stacked-imbalance-panel"
      aria-label="Stacked imbalance and response"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 8,
        background: "linear-gradient(180deg, rgba(20,17,10,0.92), rgba(10,9,6,0.92))",
        padding: "10px 12px 11px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: 1.2, color: GOLD, textTransform: "uppercase" }}>
          Stacked imbalance
        </span>
        <span style={{ fontSize: 9, color: MUTED, marginLeft: "auto" }}>
          {symbol ?? "—"}
          {windowLabel ? ` · ${windowLabel}` : ""}
        </span>
      </div>

      {/* ── THE LADDER ──────────────────────────────────────────────────────
          One row per stacked level: the price, a bar for the size that
          dominated it, and the diagonal ratio spoken by its owning module. */}
      {hasStack ? (
        <div style={{ display: "grid", gap: 2, marginBottom: 8 }}>
          {rows.map((l) => (
            <div
              key={l.price}
              style={{
                display: "grid",
                gridTemplateColumns: "62px 1fr 64px",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  color: PRICE,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                }}
              >
                {priceText(l.price, vm.tickSize)}
              </span>
              <div style={{ height: 11, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                <div
                  title={`${l.dominantVolume.toLocaleString("en-US")} ${
                    isBuy ? "bought" : "sold"
                  } here against ${l.opposingVolume.toLocaleString("en-US")} on the diagonal`}
                  style={{
                    width: `${heaviest > 0 ? (l.dominantVolume / heaviest) * 100 : 0}%`,
                    height: "100%",
                    background: isBuy ? BULL : BEAR,
                    opacity: 0.75,
                    borderRadius: 2,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  color: MUTED,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                }}
              >
                {formatImbalanceRatio(l.ratio, l.oneSided)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: MUTED, padding: "10px 0 12px" }}>
          No stack in this window.
        </div>
      )}

      {/* ── THE TEST, DRAWN ────────────────────────────────────────────────
          The band is the stack. The mark is how far the response got. A
          reader who disagrees with the word below can disagree with this
          first, which is the only reason the word is allowed on screen. */}
      {hasStack ? (
        <ResponseTrack vm={vm} tone={tone} isBuy={isBuy} />
      ) : null}

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 9 }}>
        <span
          style={{
            fontSize: 13,
            letterSpacing: 1.4,
            color: tone,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {vm.verdict.replace("_", " ")}
        </span>
        <span style={{ fontSize: 10, color: MUTED }}>{VERDICT_GLOSS[vm.verdict]}</span>
      </div>

      <p style={{ fontSize: 10.5, lineHeight: 1.45, color: TEXT, margin: "5px 0 0" }}>
        {vm.detail}
      </p>

      {/* ── WHAT THIS READING RESTS ON ─────────────────────────────────────
          The split and the grid are the two choices that could have been made
          differently, and the disclosure is the standing of the evidence.
          None of the three belongs in a tooltip. */}
      <div
        data-testid="stack-scope"
        style={{
          marginTop: 8,
          paddingTop: 7,
          borderTop: `1px solid ${HAIR}`,
          fontSize: 9.5,
          lineHeight: 1.45,
          color: MUTED,
        }}
      >
        {vm.tickSize != null ? (
          <>
            Levels are <span style={{ color: GOLD_DIM }}>{priceText(vm.tickSize, vm.tickSize)}</span>{" "}
            wide, measured off this tape&apos;s own price grid, not assumed.{" "}
          </>
        ) : null}
        {totalPrints > 0 ? (
          <>
            The stack was built from the first{" "}
            <span style={{ color: GOLD_DIM }}>{splitPct}%</span> of {totalPrints} prints and tested
            against the rest — it is never graded on the prints that made it.{" "}
          </>
        ) : null}
        Every level here is a claim about who was the aggressor, and aggressor side on this tape is{" "}
        <span style={{ color: vm.provenance === "PROVIDER" ? GOLD_DIM : BEAR }}>
          {vm.provenance.toLowerCase().replace(/_/g, " ")}
        </span>
        {vm.provenance === "PROVIDER"
          ? "."
          : " — so these levels are downstream of a guess, not of a venue stamp."}
      </div>
    </div>
  );
}

/**
 * The response track. The stack occupies a band in the middle; the response
 * marker sits where price actually reached, on the same axis. Untested draws
 * the marker OUTSIDE the band deliberately — an absent marker would read as
 * "no data" when the real finding is "price stayed away".
 */
function ResponseTrack({
  vm,
  tone,
  isBuy,
}: {
  vm: StackedImbalanceVM;
  tone: string;
  isBuy: boolean;
}) {
  const low = vm.stackLow!;
  const high = vm.stackHigh!;
  const depth = high - low || vm.tickSize || 1;
  const reached = vm.retestedTo;

  // THE AXIS MUST CONTAIN ITS OWN DATA. It runs one stack-height beyond each
  // edge as a floor, but a response that travelled further than that STRETCHES
  // it rather than being clamped to the rim. Clamping was the bug: a 2σ break
  // and a 20σ break both pinned to the same pixel, so the picture stopped
  // distinguishing the two cases it exists to distinguish. Stretching instead
  // shrinks the band, which is the correct reading — a big break makes the
  // level it broke look small.
  const pad = depth * 0.25;
  const axisLow = Math.min(low - depth, reached != null ? reached - pad : Infinity);
  const axisHigh = Math.max(high + depth, reached != null ? reached + pad : -Infinity);
  const span = axisHigh - axisLow;
  const pos = (p: number) => Math.max(0, Math.min(100, ((p - axisLow) / span) * 100));

  // UNTESTED is drawn in the MIDDLE of the away-zone, not at the axis rim.
  // `pos(axisHigh)` is 100% by construction, which rendered the marker flush
  // against the track edge where it read as a border rather than as a mark —
  // exactly the "no data" misreading this marker exists to prevent.
  const awayAt = isBuy ? high + depth / 2 : low - depth / 2;
  const markAt = pos(reached != null ? reached : awayAt);

  return (
    <div style={{ marginTop: 2 }}>
      <div
        style={{
          position: "relative",
          height: 16,
          borderRadius: 3,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {/* the stack itself */}
        <div
          title={`Stack band ${low}–${high}`}
          style={{
            position: "absolute",
            left: `${pos(low)}%`,
            width: `${pos(high) - pos(low)}%`,
            top: 0,
            bottom: 0,
            background: isBuy ? "rgba(0,212,170,0.18)" : "rgba(255,77,106,0.18)",
            border: `1px solid ${isBuy ? BULL : BEAR}`,
            borderRadius: 2,
          }}
        />
        {/* how far the response got */}
        <div
          title={
            reached == null
              ? "price never came back to the stack"
              : `response reached ${reached}`
          }
          style={{
            position: "absolute",
            left: `calc(${markAt}% - 1px)`,
            top: -2,
            bottom: -2,
            width: 2,
            background: tone,
            boxShadow: `0 0 4px ${tone}`,
          }}
        />
      </div>
      <div style={{ display: "flex", fontSize: 9, color: MUTED, marginTop: 3 }}>
        <span>{isBuy ? "through the stack" : "under the stack"}</span>
        <span style={{ marginLeft: "auto" }}>
          {isBuy ? "above the stack" : "above and through"}
        </span>
      </div>
    </div>
  );
}
