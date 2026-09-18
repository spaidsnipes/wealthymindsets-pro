"use client";

/**
 * LivingProfileView — the Founder's Asset 06, the PRO LIVING PROFILE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE PANEL SAYS
 *
 * Where volume actually went, at price. The histogram IS the view: one bar per
 * price bucket, drawn descending so it reads the way a profile reads beside a
 * chart. VAH / POC / VAL are marked on it, and the high- and low-volume nodes
 * are labelled where they were found.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE NODES CAN BE REFUSED, AND THE REFUSAL IS THE POINT
 *
 * When the profile was estimated from candles rather than built from trades,
 * this panel prints NO nodes and says why. A candle-estimated profile spreads
 * each bar's volume evenly across its range, so its low-volume dips are bars
 * failing to overlap, not price refusing to trade. Those are different claims,
 * and only the compiler is allowed to decide which one the data supports —
 * this file never re-derives that judgement, it prints the sentence it was
 * handed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANTI-FABRICATION
 *
 * No bar is drawn from a level this panel invented: every bucket, its width,
 * its value-area membership and its node label arrive already decided in the
 * view model. Absent levels render as an em dash, never as 0 — a price of zero
 * is a claim about the market, and an em dash is a statement about the feed.
 */

import React from "react";
import type {
  LivingProfileVM,
  ProfileNode,
} from "@/lib/marketData/viewModels/selectLivingProfile";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const PANEL = "rgba(18,16,12,0.72)";
const VA_FILL = "rgba(212,175,55,0.55)";
const OUT_FILL = "rgba(139,106,41,0.30)";

/**
 * THE PROFILE MUST FIT. A scrolled profile is not a profile.
 *
 * The whole claim of this view is the SHAPE — where the distribution bulges
 * and where it thins. That claim is only readable if the entire distribution
 * is on screen at once. A fixed row height inside a scroll box breaks it
 * silently at exactly the moment the profile gets interesting: 248 buckets at
 * 7px is 1736px of content in a 460px window, so the trader sees a quarter of
 * the distribution, the POC is very likely off-screen, and nothing on the
 * panel says so. It reads as a thin column rather than a profile.
 *
 * The fix is to scale the ROW HEIGHT, never to merge buckets. Merging is the
 * one thing this view may not do — it would move the POC, and a POC that moves
 * because of a layout decision is not a POC (the compiler refuses the same
 * thing at MAX_CURVE for the same reason). Thinner rows change nothing about
 * what was measured; they only change how much ink each bucket gets.
 */
const CURVE_HEIGHT = 460;
const ROW_MAX = 7;
const ROW_MIN = 1;
/** Below this a row has no vertical room for a 9px label, so price and node
 *  captions are withheld rather than overlapping into an unreadable smear. */
const ROW_LABEL_MIN = 5;

/** Price as measured; only the DISPLAY is rounded, never the datum. */
function px(v: number | null): string {
  if (v == null) return "—";
  return v >= 100 ? v.toFixed(2) : v.toFixed(4);
}

function qty(v: number | null): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 4;
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function pct(v: number | null): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

function Level({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED }}>{label}</div>
      <div style={{ fontSize: 18, color: TEXT, lineHeight: 1.25 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{note}</div>
    </div>
  );
}

function NodeRow({ n }: { n: ProfileNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 8,
        padding: "3px 0",
        borderBottom: `1px solid ${HAIR}`,
      }}
    >
      <span style={{ fontSize: 11.5, color: TEXT }}>{px(n.price)}</span>
      <span style={{ fontSize: 9.5, color: MUTED, textAlign: "right" }}>
        {/* An untraded bucket says so in words. Printing "0" here would read as
            a measured volume of zero rather than as a price nothing reached. */}
        {n.untraded ? "no trade at this price" : `${pct(n.shareOfTotal)} of volume`}
        {n.insideValueArea ? " · in value" : " · outside value"}
      </span>
    </div>
  );
}

export interface LivingProfileViewProps {
  readonly vm: LivingProfileVM;
  readonly symbol: string;
  readonly timeframe?: string;
}

export default function LivingProfileView({ vm, symbol, timeframe }: LivingProfileViewProps) {
  // Every bucket keeps its own row; only the row's thickness adapts.
  const rowHeight = vm.curve.length > 0
    ? Math.max(ROW_MIN, Math.min(ROW_MAX, CURVE_HEIGHT / vm.curve.length))
    : ROW_MAX;
  const showRowLabels = rowHeight >= ROW_LABEL_MIN;

  return (
    <div data-testid="living-profile-view" style={{ padding: 14, color: TEXT, fontFamily: "inherit" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 13, letterSpacing: "0.12em", color: GOLD }}>LIVING PROFILE</span>
          <span style={{ fontSize: 10.5, color: MUTED }}>
            {symbol}
            {timeframe ? ` · ${timeframe}` : ""} · {vm.populatedRows} price buckets took volume
          </span>
        </div>
        <span
          data-testid="living-profile-quality"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.1em",
            color: vm.quality === "trade-based" ? GOLD_DIM : MUTED,
            border: `1px solid ${HAIR}`,
            borderRadius: 3,
            padding: "3px 7px",
          }}
        >
          {vm.quality === "trade-based" ? "BUILT FROM TRADES" : "ESTIMATED FROM CANDLES"}
        </span>
      </div>

      {/* The quality sentence sits at the top, not in a footnote, because it
          decides what every level below it is allowed to mean. */}
      <p data-testid="living-profile-quality-note" style={{ fontSize: 10.5, color: MUTED, margin: "8px 0 0" }}>
        {vm.qualityNote}
      </p>

      {!vm.measured ? (
        <p data-testid="living-profile-missing" style={{ fontSize: 11, color: MUTED, marginTop: 14 }}>
          {vm.missingInputNote}
        </p>
      ) : (
        <div className="wm-lp-grid">
          <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: MUTED, marginBottom: 8 }}>
              VOLUME AT PRICE · {qty(vm.totalVolume)} total
            </div>

            {vm.curve.length === 0 ? (
              <p data-testid="living-profile-curve-note" style={{ fontSize: 10.5, color: MUTED }}>
                {vm.curveNote}
              </p>
            ) : (
              <div data-testid="living-profile-curve" style={{ height: CURVE_HEIGHT, overflow: "hidden" }}>
                {vm.curve.map((b) => (
                  <div
                    key={b.price}
                    style={{ display: "flex", alignItems: "center", gap: 8, height: rowHeight }}
                  >
                    <span
                      style={{
                        fontSize: 8.5,
                        color: b.isPoc ? GOLD : MUTED,
                        minWidth: 58,
                        textAlign: "right",
                        opacity: b.isPoc || b.node ? 1 : 0.55,
                      }}
                    >
                      {showRowLabels && (b.isPoc || b.node) ? px(b.price) : ""}
                    </span>
                    <div style={{ flex: 1, height: 5, position: "relative" }}>
                      <div
                        style={{
                          width: `${Math.max(b.volume > 0 ? 1 : 0, b.share * 100)}%`,
                          height: "100%",
                          background: b.isPoc ? GOLD : b.insideValueArea ? VA_FILL : OUT_FILL,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 8,
                        letterSpacing: "0.08em",
                        color: b.isPoc ? GOLD : MUTED,
                        minWidth: 34,
                      }}
                    >
                      {showRowLabels ? (b.isPoc ? "POC" : (b.node ?? "")) : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 9.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
              A brighter bar sits inside the {Math.round(vm.valueAreaPct * 100)}% value area. Bucket
              size is {qty(vm.tickSize)}, chosen by the profile engine from this sample&apos;s price
              range — it is not a display setting.
              {/* The thinning is disclosed because it is a change to what the
                  trader can READ, even though it changes nothing that was
                  measured. No bucket was merged: every one still has its own
                  row, so the POC is exactly where the engine put it. */}
              {!showRowLabels && (
                <>
                  {" "}
                  <span data-testid="living-profile-fit-note">
                    All {vm.curve.length} buckets are drawn at once so the shape can be read whole —
                    none were merged — but the rows are too thin to caption, so the levels are named
                    beside the histogram instead of on it.
                  </span>
                </>
              )}
            </p>
          </div>

          <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: MUTED, marginBottom: 10 }}>
              THE LEVELS
            </div>

            <Level
              label="VALUE AREA HIGH"
              value={px(vm.vah)}
              note={`the top of the ${Math.round(vm.valueAreaPct * 100)}% of volume nearest the POC`}
            />
            <Level
              label="POINT OF CONTROL"
              value={px(vm.poc)}
              note="the single price bucket that took the most volume in this sample"
            />
            <Level
              label="VALUE AREA LOW"
              value={px(vm.val)}
              note={`the bottom of that same ${Math.round(vm.valueAreaPct * 100)}%`}
            />

            <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 10, marginTop: 2 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED }}>WHERE PRICE IS NOW</div>
              <div
                data-testid="living-profile-location"
                style={{ fontSize: 12, color: vm.locationNote ? TEXT : MUTED, marginTop: 3, lineHeight: 1.45 }}
              >
                {/* The location sentence is the compiler's, printed verbatim, so
                    no second surface can word the same position differently. */}
                {vm.locationNote ?? "no live price was handed to this panel, so its position is not stated"}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 10, marginTop: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: MUTED, marginBottom: 6 }}>
                NODES
              </div>

              {!vm.nodesMeasured ? (
                <p data-testid="living-profile-nodes-missing" style={{ fontSize: 10, color: MUTED, lineHeight: 1.5, margin: 0 }}>
                  {vm.nodesNote}
                </p>
              ) : (
                <div data-testid="living-profile-nodes">
                  <div style={{ fontSize: 9, letterSpacing: "0.1em", color: GOLD_DIM, marginBottom: 2 }}>
                    HIGH VOLUME · price spent time here
                  </div>
                  {vm.hvn.length === 0 ? (
                    <p style={{ fontSize: 9.5, color: MUTED, margin: "0 0 8px" }}>
                      no bucket stood far enough above its neighbours to be called a node
                    </p>
                  ) : (
                    <div style={{ marginBottom: 10 }}>
                      {vm.hvn.map((n) => (
                        <NodeRow key={`h-${n.price}`} n={n} />
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 9, letterSpacing: "0.1em", color: GOLD_DIM, marginBottom: 2 }}>
                    LOW VOLUME · price passed through
                  </div>
                  {vm.lvn.length === 0 ? (
                    <p style={{ fontSize: 9.5, color: MUTED, margin: 0 }}>
                      no trough with volume on both sides — the thin prices in this sample are its
                      tails, and a tail is not a rejection
                    </p>
                  ) : (
                    vm.lvn.map((n) => <NodeRow key={`l-${n.price}`} n={n} />)
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wm-lp-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 290px);
          gap: 12px;
          margin-top: 12px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .wm-lp-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
