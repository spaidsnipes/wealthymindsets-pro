"use client";

import * as React from "react";
import { priceSourceBadge } from "@/lib/priceSource";
import { provenSessionClosure } from "@/lib/marketData/canonicalIdentity";
import { CanonicalFidelityBadge } from "@/components/marketData/CanonicalFidelityBadge";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { changeWindowSuffix, describeChangeWindow, type ChangeWindow } from "@/lib/marketData/changeWindow";

/**
 * A WATCHLIST ROW MAY ABBREVIATE ITS STATUS. IT MAY NEVER LOSE ITS NAME.
 *
 * MEASURED in the Founder's own browser on prod 2026-09-12, /charts, watchlist
 * panel 199px wide, from the live DOM rather than from a screenshot:
 *
 *   div "ES1!|E-Mini S&P 500"          → width   0   (x 129)
 *   div "ES1!"                          → width   0   overflow hidden
 *   div "E-Mini S&P 500"                → width   0   overflow hidden
 *   span "SESSION CLOSED — LAST VERIFIED" → width 172  (x 133)
 *   div "7659.50"                        → width  46   (x 309 → right edge 355)
 *
 * The panel's right edge is 318. So the fidelity chip had taken 172 of the
 * row's 199px, the price and the percent had been pushed OUTSIDE the panel,
 * and the symbol column — the only sibling permitted to shrink — had been
 * squeezed to exactly zero. Sixteen rows rendered sixteen identical amber
 * sentences and not one instrument name. The identity was in the DOM the whole
 * time, which is precisely why nothing failed.
 *
 * ROOT CAUSE — not a CSS typo, a priority inversion. The row gave the price
 * cluster `flexShrink: 0` and gave the identity column `flex: 1, minWidth: 0`.
 * That is a declaration that when the row runs out of room, the NAME is what
 * yields. Then an honest atom (the canon fidelity label, correctly added so a
 * closed-session price could not wear a live price's face) arrived carrying a
 * thirty-character unbreakable string, and collected on that declaration.
 *
 * The truth atom evicted the identity atom. Both were right on their own.
 *
 * FIX — arithmetic, not taste. The shortest canon fidelity label is
 * "LIVE — CERTIFIED QUOTE": 22 characters at 9px ≈ 120px. Plus a price (~46px),
 * a gap, and a ticker that needs ~56px to read, the row needs ≥ 230px to carry
 * the chip on the price line. It has 199. The chip therefore does not belong on
 * that line AT ALL — at any watchlist width this product ships — so it gets its
 * own line beneath, full width, unabbreviated. Nothing is truncated, nothing
 * moves to a tooltip (50f1b53 already closed "the asOf was only reachable with
 * a mouse"), and the identity column gets a hard floor so it can never again be
 * the thing that disappears.
 *
 * REVIVE LEDGER — broken on purpose 2026-09-12, both restored byte-identically.
 *   1. Identity floor back to `minWidth: 0`. vitest EXIT=1, failed by name on
 *      "declares a hard floor rather than min-width 0"; tsc EXIT=0.
 *   2. The chip's own line un-marked so it rejoins the price cluster. vitest
 *      EXIT=1, failed by name on "puts the canon label on its own line, away
 *      from the symbol" and on the refusal row; tsc EXIT=0.
 * tsc stayed green through both. Layout priority is invisible to the type
 * system — which is exactly how the original shipped.
 *
 * FOUR SENTINELS FOLLOWED THE RENDER HERE. They had located the watchlist by
 * FILE PATH, so moving the markup one file over would have turned them green
 * by absence — the worst possible outcome for a truth Sentinel. Each now reads
 * the watchlist SURFACE (panel + row), and each was re-proven to still bite
 * against this file:
 *   • quoteRefusalAdoption "a refused row renders no price and no percentage"
 *     — dash replaced by a number → EXIT=1.
 *   • quoteRefusalAdoption "the refusal copy is REACHABLE" — `priced` gate
 *     narrowed to `price > 0` → EXIT=1.
 *   • sessionChangeTruth "both render a dash instead of a fabricated flat
 *     session" — `changeObserved ?` forced true → EXIT=1.
 *   • quoteReferenceRouteTruth "the watchlist RENDERS the measure it received"
 *     — suffix computed, rendered as null → EXIT=1.
 *   • CanonicalFidelityBadge enforcement breadcrumb — chip renamed → EXIT=1.
 */

/**
 * The narrowest a ticker may be rendered and still be read: five monospace-ish
 * characters at 12px bold. Below this the column is not "compressed", it is
 * absent, and an absent name is not a smaller truth — it is a different screen.
 */
export const WATCHLIST_IDENTITY_FLOOR_PX = 56;

export interface WatchlistRowProps {
  readonly sym: string;
  readonly fullName: string;
  readonly price: number;
  readonly changePct: number;
  readonly changeObserved: boolean;
  readonly changeWindow: ChangeWindow;
  readonly src?: string;
  /** SF-D01 — a provider answered and WM declined it. `price` is 0. */
  readonly refusal?: string;
  readonly isActive: boolean;
  readonly up: boolean;
  readonly dirColor: string;
  readonly dp: number;
  /** Session clock instant, or null when the clock has not resolved yet. */
  readonly sessionNow: Date | null;
  readonly onSelect: () => void;
  readonly onContextMenu: (e: React.MouseEvent) => void;
}

export function WatchlistRow({
  sym, fullName, price, changePct, changeObserved, changeWindow, src, refusal,
  isActive, up, dirColor, dp, sessionNow, onSelect, onContextMenu,
}: WatchlistRowProps): React.ReactElement {
  const priced = price > 0 || !!refusal;

  // SHIFT-R atom 5 — CanonicalFidelityBadge is the one renderer of the canon
  // fidelity strings. Computed ONCE and shared: when the chip and its own
  // tooltip each derived closure separately, the tooltip silently kept the
  // pre-closure verdict. One row, one fact — so one variable.
  const sessionOpen = sessionNow ? provenSessionClosure(sym, sessionNow) : null;
  const observation = { present: Number.isFinite(price) && price > 0 };
  const badge = priceSourceBadge(src ?? "unavailable", price > 0, sessionOpen, observation);
  const capabilityReport = selectPerCapabilityFidelity({
    source: src ?? "unavailable",
    connected: price > 0,
    hasCandles: false, // A quote is not an OHLCV bar receipt.
    quoteObservation: observation,
    sessionOpen,
  });

  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      style={{
        display: "flex", flexDirection: "column",
        padding: "5px 8px", cursor: "pointer",
        background: isActive ? "rgba(255,140,0,0.06)" : "transparent",
        borderBottom: "1px solid rgba(30,32,48,0.6)",
        borderLeft: isActive ? "2px solid #FF8C00" : "2px solid transparent",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      {/* WHAT IT IS, and WHAT IT COSTS. Nothing else competes for this line. */}
      <div data-wm-row="identity" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ flex: 1, minWidth: WATCHLIST_IDENTITY_FLOOR_PX }}>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: isActive ? "#FF8C00" : "#E2E8F0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {sym}
          </div>
          <div style={{
            fontSize: 9, color: "#4A5070", marginTop: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {fullName}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {/* A refusal RETRACTS the price to 0, so gating this block on
              `price > 0` alone sent every refused row to the "quote pending"
              placeholder below — handing a designed refusal a transient
              state's vocabulary, the exact §8 failure that atom removed.
              MEASURED in the running app: with /api/yahoo forced to resolution
              UNKNOWN, all four futures rows read "quote pending". The refused
              row has no price but it DOES have something to say. */}
          {priced ? (
            <>
              <div
                style={{ fontSize: 11, color: refusal ? "#4A5070" : dirColor, fontFamily: "monospace", fontWeight: 600 }}
                title={refusal ? `${sym}: not certified — ${refusal}\n\nA provider answered and WM declined the answer. This is a refusal, not a delay.` : undefined}
              >
                {refusal ? "—" : price.toFixed(dp)}
              </div>
              {changeObserved ? (
                // The suffix is EMPTY for PRIOR_CLOSE by design: a bare percent
                // on a trading screen already means "today, vs the prior close".
                // Only the deviation gets labelled — crypto's rolling 24h
                // figure, which answers a different question than the equity row
                // directly above it.
                <div
                  style={{ fontSize: 9, color: dirColor, fontFamily: "monospace", display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 3 }}
                  title={`${sym}: ${describeChangeWindow(changeWindow)}`}
                >
                  <span>{up ? "+" : ""}{changePct.toFixed(2)}%</span>
                  {changeWindowSuffix(changeWindow) && (
                    <span style={{ fontSize: 8, color: "#6B7194", fontWeight: 600, letterSpacing: 0.2 }}>
                      {changeWindowSuffix(changeWindow)}
                    </span>
                  )}
                </div>
              ) : (
                // §8 — "this feed returned a price but no session change" is a
                // true sentence about a DIFFERENT fact. When WM refused the
                // quote outright the row has no price either, and saying
                // otherwise gives a designed refusal a transient state's
                // vocabulary.
                <div style={{ fontSize: 9, color: "#4A5070", fontFamily: "monospace" }}
                  title={refusal
                    ? `${sym}: not certified — ${refusal}`
                    : `${sym}: this feed returned a price but no session change.`}>
                  {refusal ? "not certified" : "chg —"}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 9, color: "#4A5070", fontFamily: "monospace" }}>quote pending</div>
          )}
        </div>
      </div>

      {/* HOW WELL WE KNOW IT. Its own line, because the canon strings are
          sentences and a 199px row cannot carry a sentence beside a name and a
          price. Given the whole width it is never truncated and never has to
          push anything out of the panel to be read. */}
      {priced && (
        <div data-wm-row="fidelity" style={{ marginTop: 2, minWidth: 0 }}>
          <CanonicalFidelityBadge
            badge={badge}
            variant="compact"
            titleSuffix={`— ${sym}`}
            capabilityReport={capabilityReport}
          />
        </div>
      )}
    </div>
  );
}
