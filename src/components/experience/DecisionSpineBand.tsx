"use client";

/**
 * DecisionSpineBand — the decision spine, on the scene, without a drawer.
 *
 * ── What was wrong ───────────────────────────────────────────────────────────
 *
 * `/charts` is the normal Founder route (`src/app/page.tsx` redirects to it).
 * Measured on 2026-09-12, the scene it renders carried ZERO references to any
 * decision identity, and of the five things the operating room is supposed to
 * show at all times:
 *
 *   NOW    — absent
 *   MARKET — present (the chart itself)
 *
 * (2026-09-15 correction: the first repair of this list added a cell LABELLED
 * "Now" that carried `oneStory.primary` — a market-structure narrative. The
 * label moved; the absence did not. See SpineNowEvidence below: the cell now
 * leads with the canonical session token, so NOW finally has an owner rather
 * than a heading.)
 *   RISK   — absent
 *   WHY    — behind `ShellModalDrawer` at ChartsDashboard.tsx:1388
 *   NEXT   — behind an `AnimatePresence` options toggle at :2024
 *
 * Three of the five were not on the scene, and two of those three required the
 * trader to already know to open a drawer. A spine you have to go looking for
 * is not a spine.
 *
 * ── What this component is NOT ───────────────────────────────────────────────
 *
 * It is not a second brain, a decision store, a status owner, or a new command
 * center. It computes NOTHING. Every field is handed in already-compiled by
 * `composeMarketCanvasVM` — the same compiler `/command-deck` and the Decision
 * Why drawer read — and this file only decides where the pixels go. If the two
 * surfaces ever disagree it will be because the compiler changed, which is the
 * only place a disagreement is allowed to come from.
 *
 * ── Absence is disclosed, never filled ───────────────────────────────────────
 *
 * Missing data is not 0.00 and UNKNOWN is not flat. Available R arrives from
 * `selectAvailableR` as the literal string "UNKNOWN" for each of its numbers
 * when inputs are missing; that string is rendered as itself. A null decision
 * id renders the REASON it is null, because "no decision has been born yet" and
 * "a decision exists and we lost it" are different facts and the trader is owed
 * the difference.
 */

import * as React from "react";

import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { DecisionWhyVM } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";
import { selectAvailableRDetail } from "@/components/experience/AvailableRChip";
import { formatSpinePrice, qualifyMarketQuality } from "@/lib/marketData/formatSpinePrice";
import { selectOneNextThing } from "@/lib/marketData/viewModels/selectOneNextThing";
import {
  selectEvidenceLadder,
  type EvidenceLadderSegment,
  type EvidenceLadderState,
} from "@/lib/marketData/viewModels/selectEvidenceLadder";
import {
  selectWhySeverityBar,
  type WhySeverityState,
} from "@/lib/marketData/viewModels/selectWhySeverityBar";
import { selectRiskReachBar } from "@/lib/traderMemory/viewModels/selectRiskReachBar";

/**
 * The NOW cell's TEMPORAL evidence — whether this market is trading at all.
 *
 * ── A DECISION SURFACE THAT CANNOT SAY WHETHER THE MARKET IS OPEN IS MISSING
 *    ITS NOW ──────────────────────────────────────────────────────────────────
 *
 * The cell labelled "Now" rendered `oneStory.primary` and nothing else. That
 * string is a STRUCTURE narrative — "Price is inside value with no resolved
 * direction" — which is a statement about the MARKET, not about the moment.
 * So the five-part spine was really NOW=∅ / MARKET=twice / RISK / WHY / NEXT,
 * and the header of this very file listing "NOW — absent" was still true after
 * the cell bearing that label had shipped. A LABEL IS NOT AN OWNER.
 *
 * What that cost, concretely: the rail renders Available R, a named
 * invalidator and an attached expression under a heading that says NEXT. On a
 * Saturday it rendered all of it identically, with nothing anywhere in the
 * market room stating that the market was closed. Permission to act was
 * projected without the one fact that can revoke it.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────────
 *
 * `established` is the caller's report of whether the token rests on a proven
 * fact. This codebase holds NO intraday exchange calendar, so on a weekday the
 * only honest token is "SESSION ?" — and that is rendered as itself, in the
 * unestablished tone, never sharpened into "OPEN". Inventing RTH is an
 * overclaim; withholding a provable Saturday closure is false humility. The
 * canonical owner `selectCanonicalSessionToken` already resolves that
 * asymmetry; this cell only places its pixels.
 */
export interface SpineNowEvidence {
  /** Straight off `selectCanonicalSessionToken().token`. Never composed here. */
  readonly token: string;
  /** Why the token says what it says. Carried on title/aria — never invented. */
  readonly detail: string;
  /** True only when the token rests on an established fact. Drives the tone. */
  readonly established: boolean;
}

/** The MARKET cell's evidence. ROLE / SOURCE / asOf, or the absence of them. */
export interface SpineMarketEvidence {
  readonly symbol: string;
  readonly timeframe: string;
  /** Quality state straight off the canonical state. Never invented. */
  readonly quality: string | null;
  /** Epoch ms the canonical state was captured, or null when nothing sealed. */
  readonly capturedAt: number | null;
  readonly last: number | null;
  /**
   * SECOND PRICE OWNER — the newest loaded bar's close, straight off
   * `canonicalState.lastBar`. Never a trade print; see `formatSpinePrice`.
   * This cell rendered PRICE UNKNOWN while the chart header a few pixels
   * away rendered this very number beside HISTORICAL BARS VERIFIED.
   */
  readonly lastBarClose?: number | null;
  readonly lastBarTimeframe?: string | null;
  /**
   * Whether the bars request for this selection has come back yet.
   *
   * OPTIONAL and tri-state: `undefined` is "this surface did not say", which
   * is what every caller but /charts says today, and it preserves their exact
   * behaviour. Only an explicit `false` withholds the price clause.
   *
   * It exists because PRICE UNKNOWN is a FINDING, and this cell printed it at
   * t=1111ms on a cold /charts mount over a request that resolved into
   * `29563.25 LAST 15m BAR CLOSE` at t=2163ms. See `formatSpinePrice`.
   */
  readonly barsSettled?: boolean;
}

export interface DecisionSpineBandProps {
  /** The one canonical id, or null when no lawful birth has occurred. */
  readonly decisionId: string | null;
  /** Why there is no id. Rendered verbatim when `decisionId` is null. */
  readonly decisionIdAbsence: string;
  /**
   * REQUIRED on purpose. An optional NOW is a NOW that every future surface
   * forgets, and forgetting it is the exact defect this prop repairs. A new
   * decision surface must state which moment it is deciding in, or fail to
   * compile.
   */
  readonly now: SpineNowEvidence;
  readonly market: SpineMarketEvidence;
  readonly oneStory: OneStoryVM | null;
  readonly availableR: AvailableRVM | null;
  readonly decisionWhy: DecisionWhyVM | null;
  /** Human label for the attached expression, or null when the answer is WAIT. */
  readonly expression: string | null;
  /** Opens the full WHY drawer. The band is the summary, not a replacement. */
  readonly onOpenWhy?: (trigger: HTMLButtonElement) => void;
  /** Already-compiled canonical canvas verdict. Desktop may attach this to
   * the rail; the horizontal fallback keeps it in the orientation strip. */
  readonly canvasSummary?: React.ReactNode;
  /** Desktop charts attach the same compiled spine beside MARKET. Other
   * surfaces retain the horizontal band without forking truth ownership. */
  readonly presentation?: "band" | "rail";
}

/**
 * WHY `flex-basis` IS A REAL NUMBER AND `minWidth` IS NOT 0.
 *
 * The band shipped as `flex: "1 1 0"` with `minWidth: 0`. That combination can
 * never wrap: `flex-wrap` only moves an item to the next line when the items
 * exceed their BASE size, and a base of 0 with no minimum simply shrinks
 * forever. Measured in Chrome at 390px — the primary device — the six cells
 * came out 240 / 30 / 30 / 30 / 30 / 30 px wide and 220px tall: five vertical
 * noodles of one character per line. Present in the DOM, addressable by every
 * test, and unreadable by a human.
 *
 * That is the defect class `scripts/audit-phone-parity.mjs` already names in
 * its own header — text crushed to nothing INSIDE the viewport — and the
 * nineteen `renderToStaticMarkup` tests beside this file were all green while
 * it was true, because static markup has no geometry.
 *
 * A real basis plus a real minimum means the row overflows honestly and wraps,
 * which is the whole reason `flexWrap: "wrap"` was on the container.
 */
const CELL_MIN = 148;

const CELL: React.CSSProperties = {
  flex: `1 1 ${CELL_MIN}px`,
  minWidth: CELL_MIN,
  padding: "6px 10px",
  borderLeft: "1px solid rgba(139,106,41,0.22)",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

/**
 * ── THE SPINE WAS PAINTED IN THE WRONG ROOM ─────────────────────────────────
 * `#8b8fa8` and `#E2E8F0` are Tailwind-slate: BLUE-grey. Every other surface
 * of the sanctuary is warm obsidian and brass, and the Visual Canon's frame
 * (WM_NewMockup_64_F24_Surface_One_Canvas) sets these same six cells in brass
 * labels over warm pearl values.
 *
 * Two cool greys against a warm field is not a small mismatch: the rail is the
 * single largest block of text in the room, so its temperature IS the room's
 * temperature. The runtime read as a dark-blue terminal for exactly this
 * reason while the approved frame read as a lit sanctuary.
 *
 * Nothing about WHAT the cells say changes — colour here is chrome, not claim.
 * Every informational colour (the ladder tones, the severity tones, the NOW
 * token tones) is still looked up from its own TOTAL record below and is
 * untouched, because those ARE claims and the canonical state owns them.
 */
const LABEL: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  // #c4a574 / #ede6d3 / #8a8271 are the OS frame's own GOLD / PEARL / MUTED.
  // Reusing those exact three keeps the rail inside the palette the
  // legibility suite has already composited against the grain and vignette —
  // a new brass would be a fourth unmeasured value on the field.
  color: "#c4a574",
  fontWeight: 700,
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const VALUE: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.35,
  color: "#ede6d3",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const MUTED: React.CSSProperties = { ...VALUE, color: "#8a8271" };

/**
 * THE LEDGER BAR — the NEXT cell's first drawn form.
 *
 * COLOUR IS A CLAIM here too, so it is looked up from a TOTAL record keyed on
 * the compiled state rather than derived from anything about the segment.
 *
 *   RESOLVED — ivory, lit. Settled evidence.
 *   WARN     — gold. Paid, and arguing.
 *   MISSING  — the field colour behind a brass hairline. Present at full width,
 *              unlit. A debt is not an absence.
 *   WATCH    — dimmer still, and drawn apart: never in the ledger's numerator
 *              or denominator, so never inside its bar.
 */
const LADDER_TONE: Record<EvidenceLadderState, React.CSSProperties> = {
  RESOLVED: { background: "#c9c2a7" },
  WARN: { background: "#d4af37" },
  MISSING: { background: "rgba(201,162,89,0.10)", boxShadow: "inset 0 0 0 1px rgba(201,162,89,0.28)" },
  WATCH: { background: "rgba(139,143,168,0.16)" },
};

const LADDER_HEIGHT = 6;

/**
 * SEVERITY HAS A HEIGHT AND A COLOUR, both looked up from TOTAL records so no
 * state can fall through to a default that flatters it.
 *
 * UNATTRIBUTED is deliberately the shortest and the dimmest. Those ticks are
 * real blockers — the census counted them — but WM cannot say how hard they
 * are, and a bar that guessed would be drawing evidence it does not hold.
 */
const SEVERITY_HEIGHT: Record<WhySeverityState, number> = {
  HARD_RULE: 12,
  CONTRADICTION: 10,
  EVIDENCE_DEBT: 8,
  EVIDENCE_WARN: 6,
  SOFT_RULE: 5,
  UNATTRIBUTED: 4,
};

const SEVERITY_TONE: Record<WhySeverityState, React.CSSProperties> = {
  HARD_RULE: { background: "#e08a8a" },
  CONTRADICTION: { background: "#d4af37" },
  EVIDENCE_DEBT: { background: "rgba(201,162,89,0.62)" },
  EVIDENCE_WARN: { background: "rgba(201,162,89,0.40)" },
  SOFT_RULE: { background: "rgba(139,143,168,0.55)" },
  UNATTRIBUTED: { background: "rgba(139,143,168,0.26)" },
};

function LadderSegment({ segment }: { segment: EvidenceLadderSegment }) {
  return (
    <span
      data-testid="evidence-ladder-segment"
      data-state={segment.state}
      data-next={segment.isNext ? "true" : undefined}
      style={{
        flex: "1 1 0",
        minWidth: 2,
        height: LADDER_HEIGHT,
        borderRadius: 1,
        ...LADDER_TONE[segment.state],
        /* The named next node is the only segment that carries an edge. It is
           the subject of the sentence directly beneath, and a reader should be
           able to point at it without reading. */
        ...(segment.isNext ? { boxShadow: "inset 0 0 0 1px #d4af37" } : null),
      }}
    />
  );
}

/**
 * COLOUR IS A CLAIM, so the session token's colour is looked up from a TOTAL
 * record keyed on the caller's `established` flag — never derived from the
 * token's spelling, its length, or "is a string present". A token that rests
 * on a proven fact is legible; one that rests on the absence of a calendar is
 * dimmed, because it IS dimmer evidence. Neither is painted green: an open
 * market is not a good market, and this cell makes no such claim.
 */
const NOW_TOKEN_TONE: Record<"established" | "unestablished", React.CSSProperties> = {
  established: { ...VALUE, color: "#c9c2a7", fontWeight: 700, letterSpacing: 0.4 },
  unestablished: { ...MUTED, fontWeight: 700, letterSpacing: 0.4 },
};

/**
 * Render an Available-R figure. The selector's UNKNOWN sentinel is a string,
 * so a naive `toFixed` would throw and a naive `?? 0` would fabricate a flat
 * risk-to-reward. Both are refused here.
 */
function rText(v: number | "UNKNOWN" | undefined): string {
  if (v === undefined || v === "UNKNOWN") return "UNKNOWN";
  return `${v.toFixed(2)}R`;
}

function asOfText(capturedAt: number | null): string {
  if (capturedAt === null) return "asOf UNKNOWN";
  return `asOf ${new Date(capturedAt).toISOString().slice(11, 19)}Z`;
}

export function DecisionSpineBand(props: DecisionSpineBandProps) {
  const { decisionId, decisionIdAbsence, market, oneStory, availableR, decisionWhy, expression } = props;
  const presentation = props.presentation ?? "band";
  const rail = presentation === "rail";
  const priceDisplay = formatSpinePrice(
    market.last,
    market.lastBarClose,
    market.lastBarTimeframe,
    market.barsSettled,
  );
  const availableRDetail = selectAvailableRDetail(availableR);
  // NEXT is compiled, not echoed. Both the reading and the ledger it was
  // computed from come from the SAME producer the verdict came from
  // (`selectOneStory` → `computeRightOfWay`), so this introduces no second
  // owner of any quantity — it derives a different QUESTION from one truth.
  const nextThing = selectOneNextThing({
    rightOfWay: oneStory ? oneStory.decision : null,
    debt: oneStory ? oneStory.debt : null,
    hasExpression: expression != null,
  });
  // The SAME ledger the sentence above counts from, re-presented as geometry.
  // No second producer, no second denominator — `selectEvidenceLadder` reads
  // the identical `oneStory.debt` object and emits one segment per node it
  // already counted.
  const ladder = selectEvidenceLadder(oneStory ? oneStory.debt : null);
  // The WHY cell's own census, re-presented. Same VM the headline reads.
  const severity = selectWhySeverityBar(decisionWhy);
  // R is a ratio; this is the only cell whose meaning IS a proportion. Same VM
  // the two numbers beside it are printed from — no second arithmetic.
  const reach = selectRiskReachBar(availableR);
  const cellStyle: React.CSSProperties = rail
    ? {
        ...CELL,
        flex: "0 0 auto",
        minWidth: 0,
        width: "100%",
        // ── THE CANON DRAWS THESE AS PLATES ──────────────────────────────
        // This used to read: "the desktop rail is one attached decision
        // context, not a stack of cards", and every border was removed. The
        // approved frame disagrees on the evidence: in
        // WM_NewMockup_64_F24_Surface_One_Canvas every rail cell — DECISION_ID,
        // STATE, MARKET, RISK, WHY, the honesty chip — sits inside its OWN
        // brass-hairline plate on a slightly raised ground.
        //
        // The old reasoning was sound about what it feared (a dashboard of
        // floating cards competing with price) and wrong about the remedy.
        // What stops the rail competing is the GROUND, not the absence of
        // edges: the plate ground here is two points of warmth over the
        // sanctuary field, and the hairline is the same 0.22-alpha brass
        // already used for the seam between MARKET and the rail. Edgeless,
        // the six cells ran together into one undifferentiated column of
        // small type — the single thing the Founder named when he said the
        // runtime looks nothing like the frame.
        border: "1px solid rgba(196,165,116,0.20)",
        borderRadius: 3,
        background: "rgba(24,20,14,0.42)",
        padding: "9px 11px",
        marginBottom: 6,
      }
    : CELL;
  const decisionValue = decisionId ? (
    <code
      style={{
        ...VALUE,
        color: "#e8b923",
        fontWeight: 700,
        whiteSpace: "normal",
        overflow: "visible",
        textOverflow: "clip",
        overflowWrap: "anywhere",
      }}
      data-testid="spine-decision-id"
    >
      {decisionId}
    </code>
  ) : (
    <span style={MUTED} data-testid="spine-decision-absent">{decisionIdAbsence}</span>
  );
  const marketValue = (
    <>
      {/* The symbol and timeframe are facts THIS SURFACE OWNS — the trader
          chose them — so they are printed in every state, including while the
          bars request is still in flight. Only the PRICE clause is withheld,
          and the separator that would introduce it goes with it: a trailing
          "NQ1! · 15m ·" is an interrupted sentence, which reads as breakage
          rather than as patience. */}
      <span style={VALUE} data-price-provenance={priceDisplay.provenance}>
        {market.symbol} · {market.timeframe}
        {priceDisplay.provenance === "AWAITING" ? null : <> · {priceDisplay.text}</>}
      </span>
      <span style={MUTED}>
        {qualifyMarketQuality(market.quality, priceDisplay.provenance)} · {asOfText(market.capturedAt)}
      </span>
    </>
  );

  return (
    <section
      className={`wm-decision-spine${rail ? " wm-decision-spine--rail" : ""}`}
      aria-label="Decision spine"
      data-presentation={presentation}
      style={{
        display: "flex",
        alignItems: "stretch",
        flexDirection: rail ? "column" : "row",
        flexWrap: rail ? "nowrap" : "wrap",
        // SCENE_FRAGMENTATION cure (Founder audit 2026-09-13): a
        // lighter-than-sanctuary background (#0D0E14) made the six-cell
        // spine read as a raised dashboard panel floating over MARKET.
        // The sanctuary field is #050506; the spine now inherits that
        // depth and is delineated only by hairlines top and bottom.
        // A static practical-light falloff crosses the MARKET/decision seam so
        // the rail reads as the room's attached inspection surface rather than
        // a flat black application column. It never animates and carries no
        // market meaning; canonical state still owns every informational
        // color and motion cue.
        background: rail
          ? "linear-gradient(90deg, rgba(232,185,35,0.045) 0%, rgba(11,11,13,0.30) 18%, rgba(5,5,6,0) 72%)"
          : "transparent",
        borderTop: rail ? "none" : "1px solid rgba(139,106,41,0.20)",
        borderBottom: "1px solid rgba(139,106,41,0.20)",
        borderLeft: rail ? "1px solid rgba(139,106,41,0.22)" : undefined,
        // MARKET is the dominant desktop surface; this rail is attached
        // decision context, not a second equal workspace. A fixed 320px rail
        // consumed almost a third of the room immediately above the 1023px
        // band fallback. Let it grow to the existing comfortable ceiling on
        // wide screens, while yielding width back to MARKET on compact
        // desktop. The responsive owner still swaps this rail for the proven
        // horizontal band at <=1023px.
        width: rail ? "clamp(260px, 22vw, 320px)" : undefined,
        // The plates need a gutter, or their hairlines fuse with the seam
        // border on the left and the room edge on the right.
        padding: rail ? "8px 9px 2px" : undefined,
        overflowY: rail ? "auto" : undefined,
        flexShrink: 0,
      }}
      data-material-plane={rail ? "sanctuary-seam" : undefined}
    >
      <style>{`
        @media (max-width: 767px) {
          .wm-decision-spine {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
          }
          .wm-decision-spine::-webkit-scrollbar { display: none; }
          .wm-decision-spine > div {
            flex: 0 0 180px !important;
            min-width: 180px !important;
            max-width: 180px !important;
          }
        }
      `}</style>
      {/* DECISION_ID — the thing every other cell is about. On the desktop
          rail, identity and MARKET provenance are one restrained header,
          because the adjacent canvas already owns MARKET as the room. Keeping
          them as separate hairlined cells made the rail read as six dashboard
          cards. The horizontal band retains the full six-cell projection. */}
      {rail ? (
        <div
          data-testid="spine-provenance-header"
          style={{
            ...cellStyle,
            borderTop: "none",
            paddingTop: 8,
            paddingBottom: 8,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={LABEL}>Decision</span>
            {decisionValue}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={LABEL}>Market</span>
            {marketValue}
          </div>
          {props.canvasSummary && (
            <div data-testid="spine-canvas-summary" style={{ paddingTop: 2 }}>
              {props.canvasSummary}
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...cellStyle, flex: "1 1 220px", minWidth: 200, maxWidth: "100%", borderLeft: "none", borderTop: "none" }}>
          <span style={LABEL}>Decision</span>
          {decisionValue}
        </div>
      )}

      <div style={cellStyle}>
        <span style={LABEL}>Now</span>
        {/* The moment comes FIRST, above the structure narrative. A trader
            reading downward learns whether this market is trading before
            reading what it is doing, because the second only means something
            under the first. */}
        <span
          style={NOW_TOKEN_TONE[props.now.established ? "established" : "unestablished"]}
          data-testid="spine-now-session"
          data-session-established={props.now.established ? "true" : "false"}
          title={props.now.detail}
          aria-label={`${props.now.token} — ${props.now.detail}`}
        >
          {props.now.token}
        </span>
        <span style={oneStory ? VALUE : MUTED}>
          {oneStory ? oneStory.primary : "No story compiled — evidence insufficient."}
        </span>
      </div>

      {!rail && (
        <div style={cellStyle}>
          <span style={LABEL}>Market</span>
          {marketValue}
        </div>
      )}

      <div style={cellStyle}>
        <span style={LABEL}>Risk</span>
        <span style={availableR ? VALUE : MUTED}>
          {availableR
            ? `Available R ${rText(availableR.conservativeR)} · risk/unit ${rText(availableR.riskPerUnit)}`
            : "Available R UNKNOWN"}
        </span>
        {/* ONE AXIS: risk is one unit by definition, reward is drawn against it.
            Absent entirely when the conservative figure is UNKNOWN, because a
            flat reward block is a confident picture of a bad trade and the
            truth in that case is that we cannot tell. */}
        {reach ? (
          <span
            data-testid="risk-reach-bar"
            data-adverse={reach.adverse ? "true" : undefined}
            aria-hidden="true"
            style={{ display: "flex", alignItems: "stretch", height: 8, margin: "3px 0 1px", gap: 1 }}
          >
            <span
              data-testid="risk-reach-risk"
              style={{
                width: `${reach.riskPct}%`,
                background: "rgba(224,138,138,0.55)",
                borderRadius: "1px 0 0 1px",
              }}
            />
            {/* The entry line. Everything left of it is what this trade can
                lose; everything right is what it can reach. */}
            <span style={{ width: 1, background: "#f3efe6", flex: "0 0 auto" }} />
            {reach.adverse ? (
              <span
                data-testid="risk-reach-adverse"
                style={{
                  flex: "1 1 auto",
                  background:
                    "repeating-linear-gradient(135deg, rgba(224,138,138,0.30) 0 3px, transparent 3px 6px)",
                }}
              />
            ) : (
              <>
                <span
                  data-testid="risk-reach-conservative"
                  style={{
                    width: `${reach.conservativePct}%`,
                    background: "#c9c2a7",
                    position: "relative",
                  }}
                >
                  {reach.costDragPct !== null ? (
                    /* Cost drag is bitten out of the far end of the reach, not
                       drawn beside it — costs do not extend the target, they
                       shorten it. */
                    <span
                      data-testid="risk-reach-cost-drag"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(reach.costDragPct / Math.max(reach.conservativePct, 0.0001)) * 100}%`,
                        background:
                          "repeating-linear-gradient(135deg, rgba(7,8,10,0.55) 0 2px, transparent 2px 4px)",
                      }}
                    />
                  ) : null}
                </span>
                {reach.optimisticPct !== null ? (
                  <span
                    data-testid="risk-reach-optimistic"
                    style={{
                      width: `${reach.optimisticPct}%`,
                      background: "rgba(201,194,167,0.30)",
                      borderRadius: "0 1px 1px 0",
                    }}
                  />
                ) : null}
              </>
            )}
          </span>
        ) : null}
        <span style={MUTED} data-testid="spine-available-r-detail">
          {availableRDetail}
        </span>
        <span style={MUTED}>
          {decisionWhy && decisionWhy.invalidators.length > 0
            ? `Invalidated by: ${decisionWhy.invalidators[0]}`
            : "No invalidator published."}
        </span>
      </div>

      <div style={cellStyle}>
        <span style={LABEL}>Why</span>
        <span style={decisionWhy ? VALUE : MUTED}>
          {decisionWhy ? decisionWhy.headline : "No verdict compiled yet."}
        </span>
        {/* HOW MANY THINGS ARE IN THE WAY, AND HOW HARD — before a word is read.
            Each tick is one blocker from the CENSUS (`blockerCount`), not from
            the capped sample, so nine blockers cannot draw as six. Ticks the
            sample can name carry their severity colour and their label on
            `title`; the rest are drawn present and honestly unlabelled. */}
        {severity && severity.segments.length > 0 ? (
          <span
            data-testid="why-severity-bar"
            data-blocker-count={severity.blockerCount}
            aria-hidden="true"
            style={{ display: "flex", gap: 2, alignItems: "flex-end", margin: "3px 0 1px" }}
          >
            {severity.segments.map((segment, i) => (
              <span
                key={`sev-${i}`}
                data-testid="why-severity-segment"
                data-state={segment.state}
                title={segment.label ?? undefined}
                style={{
                  flex: "1 1 0",
                  minWidth: 2,
                  /* Height IS severity: a hard rule stands taller than a soft
                     one. The unattributed ticks take the shortest height, which
                     under-claims rather than over-claims. */
                  height: SEVERITY_HEIGHT[segment.state],
                  borderRadius: 1,
                  ...SEVERITY_TONE[segment.state],
                }}
              />
            ))}
          </span>
        ) : null}
        {props.onOpenWhy && (
          <button
            type="button"
            onClick={(event) => props.onOpenWhy?.(event.currentTarget)}
            style={{
              alignSelf: "flex-start",
              minHeight: 44,
              marginTop: -8,
              marginBottom: -8,
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#c9a55c",
              fontSize: 11,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Full evidence
          </button>
        )}
      </div>

      {/* A NEXT THAT REPEATS NOW IS NOT A NEXT.
          This cell used to print the Right-of-Way verdict itself, so the rail
          said WAIT in the header chip and WAIT again here, under two different
          labels, from one producer. (The reverted form is named literally in
          the Sentinel `× THE RESURRECTED ECHO`, which is why it is not spelled
          out here — the spelling must appear nowhere but the guard.) NEXT now
          compiles the single thing capable of CHANGING the job. The attached
          expression, when one exists, remains the literal next object. */}
      {/* A VOID BETWEEN TWO CELLS IS A CLAIM THAT THEY ARE UNRELATED.
          In the rail, this cell carried `marginTop: "auto"`, which in a flex
          column eats every spare pixel and parks NEXT at the bottom. Measured
          on a live /charts render 2026-09-15: roughly two hundred pixels of
          nothing between WHY and NEXT, mid-column.

          That was already poor composition. It became wrong when NEXT stopped
          echoing the verdict: NEXT is now DERIVED from the very evidence WHY
          displays — "regime is the first of 9 unpaid evidence nodes" is the
          same permission story WHY is telling, one layer down. Severing them
          with a void says they are separate concerns. They are not.

          Spare space now falls at the END of the column, where empty space
          reads as margin rather than as a break in the argument. */}
      <div style={cellStyle}>
        <span style={LABEL}>Next</span>
        <span style={VALUE} data-testid="spine-next" data-next-kind={expression ? "ATTACHED_EXPRESSION" : nextThing.kind}>
          {expression ?? nextThing.headline}
        </span>
        {/* DRAWN BEFORE READ. The bar is decoration in the accessibility tree —
            `aria-hidden` — because it adds no fact a screen reader is not
            already given by the sentence beneath it. Removing it removes a
            rendering of the ledger, never the ledger. */}
        {ladder ? (
          <span
            data-testid="evidence-ladder"
            data-payable={ladder.payable}
            data-resolved={ladder.resolved}
            aria-hidden="true"
            style={{ display: "flex", gap: 2, alignItems: "center", margin: "3px 0 1px" }}
          >
            {ladder.segments.map((segment, i) => (
              <LadderSegment key={`ledger-${i}`} segment={segment} />
            ))}
            {ladder.watch.length > 0 ? (
              <>
                {/* The gap that names itself: everything right of this rule is
                    observed but ungradeable, and belongs to no numerator. */}
                <span
                  data-testid="evidence-ladder-watch-rule"
                  style={{
                    flex: "0 0 auto",
                    width: 1,
                    height: LADDER_HEIGHT + 2,
                    background: "rgba(201,162,89,0.28)",
                    margin: "0 2px",
                  }}
                />
                {ladder.watch.map((segment, i) => (
                  <LadderSegment key={`watch-${i}`} segment={segment} />
                ))}
              </>
            ) : null}
          </span>
        ) : null}
        <span style={MUTED}>
          {expression ? "Attached expression" : nextThing.detail}
        </span>
      </div>
    </section>
  );
}

export default DecisionSpineBand;
