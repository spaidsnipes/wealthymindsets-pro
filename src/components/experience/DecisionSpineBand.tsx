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
import type { QuestionLensVM } from "@/lib/marketData/viewModels/selectQuestionLens";
import type { AbsorptionRailRead } from "@/lib/marketData/selectAbsorptionAnatomy";

import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { DecisionWhyVM } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";
import { selectAvailableRDetail } from "@/components/experience/AvailableRChip";
import { formatSpinePrice, qualifyMarketQuality } from "@/lib/marketData/formatSpinePrice";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";
import { selectOneNextThing } from "@/lib/marketData/viewModels/selectOneNextThing";
import {
  selectWaitStanding,
  type WaitStanding,
} from "@/lib/marketData/viewModels/selectWaitStanding";
import {
  selectGoInterlock,
  type GoInterlockState,
} from "@/lib/marketData/viewModels/selectGoInterlock";
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
import { MarketHonestyPlaque } from "@/components/experience/MarketHonestyPlaque";
import { selectFoldEscalation } from "@/lib/marketData/viewModels/selectFoldEscalation";
import { selectWaitPlaque, type PlaqueFlowContextVM } from "@/lib/marketData/viewModels/selectWaitPlaque";
import type { MarketFidelityReading } from "@/lib/marketData/marketFidelityAlgebra";

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
  /**
   * THIRD PRICE OWNER — the live display quote and the provider that said it.
   *
   * MEASURED on the serving Worker 2026-09-20, BTCUSDT · 5m: the chart header
   * read `81738.08 +492.44 (+0.61%)` while this cell, in the same viewport,
   * read `BTCUSDT · 5m · PRICE UNKNOWN`. Same shape as the bar-close defect
   * two fields up, through a door this cell did not have — that chart had no
   * bars at all, so `lastBarClose` could not speak for it.
   *
   * BOTH OR NEITHER. A price whose provider cannot be named is exactly the
   * uncheckable reading `formatSpinePrice` refuses, so passing one without the
   * other renders nothing rather than an anonymous number.
   */
  readonly quoteLast?: number | null;
  readonly quoteSource?: string | null;
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
  /**
   * WHETHER A COMPANION CAMERA IS WALKING HISTORY IN THIS ROOM RIGHT NOW.
   *
   * MEASURED on production AFTER the masthead and both chart overlays had
   * already been cured: with Bar Replay engaged, this band's MARKET cell was
   * still printing `LIVE · asOf 06:43:40Z` at (1216,409). Fourth clock, third
   * owner, same single-sentence law — "Backtest historical replay and LIVE/LAST
   * context must be impossible to confuse."
   *
   * REQUIRED for the reason `now` above it is required. This band's whole job
   * is to state the conditions a decision is being made under, and "which
   * camera am I looking through" is such a condition. An optional flag defaults
   * to `false`, and the next surface to grow a replay engine would inherit the
   * live claim in silence — which is precisely how this one survived three
   * previous fixes to the same bug.
   */
  readonly replayEngaged: boolean;
  readonly market: SpineMarketEvidence;
  readonly oneStory: OneStoryVM | null;
  readonly availableR: AvailableRVM | null;
  readonly decisionWhy: DecisionWhyVM | null;
  /** Human label for the attached expression, or null when the answer is WAIT. */
  readonly expression: string | null;
  /** Opens the full WHY drawer. The band is the summary, not a replacement. */
  readonly onOpenWhy?: (trigger: HTMLButtonElement) => void;
  /**
   * Already-compiled canonical canvas verdict. Desktop may attach this to
   * the rail; the horizontal fallback keeps it in the orientation strip.
   *
   * A FUNCTION, NOT A NODE, AND FOR ONE REASON ONLY. This band decides — in
   * this render, from `rail && nowDecision` — whether it is about to print the
   * verdict word itself as the NOW · STATE headline. Anything nested in the
   * DECISION cell must not print that same word a second time forty-five
   * pixels above it. Handing the attachment a rendered node would mean the
   * CALLER asserting "the surface prints the verdict", which can silently
   * become false. Handing it a function lets this component pass down the very
   * boolean it used for its own headline, so the two cannot disagree.
   */
  readonly canvasSummary?: (ctx: { readonly verdictOwnedBySurface: boolean }) => React.ReactNode;
  /** Desktop charts attach the same compiled spine beside MARKET. Other
   * surfaces retain the horizontal band without forking truth ownership. */
  readonly presentation?: "band" | "rail";
  /**
   * THE HONESTY PLAQUE'S READING — the organ transplanted off /command-deck.
   *
   * Tri-state, deliberately, and mirroring `barsSettled` above so the two
   * optional evidence props in this file mean the same thing by the same
   * convention:
   *
   *   `undefined` — this surface did not attach a fidelity at all. No plate is
   *                 rendered, and every caller that predates this prop keeps
   *                 its exact pixels.
   *   `null`      — a fidelity WAS attached and could not be established. The
   *                 plaque renders its own UNMEASURED state, because an
   *                 unmeasured canvas that renders nothing looks exactly like
   *                 a certified one.
   *
   * What it must never be is a literal. The plaque spent its first day mounted
   * once, as `reading={null}` hard-coded on the quarantined deck — a picture of
   * disclosure rather than disclosure. `ChartsDashboard` composes the real
   * reading from the same badge grading its masthead chip reads, which is why
   * the chip and this plate cannot disagree.
   */
  readonly honesty?: MarketFidelityReading | null;
  /**
   * F06A · ORDER FLOW CONTEXT beneath the plaque — the tape's aggressor split,
   * already compiled by `selectPlaqueFlowContext` from `selectAggressorFlow`.
   * Optional: `undefined`/`null` draws nothing (an empty bar would claim a
   * balanced tape). Withheld on the rail while a replay camera walks history,
   * for the same reason the asOf clock is: it is a LIVE reading.
   */
  readonly flowContext?: PlaqueFlowContextVM | null;
  /**
   * UI-04 · the Question Lens's column BESIDE the market: the active question,
   * its evidence debt (or WHAT CHANGED ledger) and the effort/displacement
   * pair, read verbatim from the chart's own `selectQuestionLens` reading.
   * The canvas no longer paints these cards over the candles when the rail
   * carries them. Null/undefined → nothing drawn.
   */
  readonly questionLens?: QuestionLensVM | null;
  /** F06A · the chart's own newest absorption zone, for the flow card's ABSORPTION row. */
  readonly absorptionRead?: AbsorptionRailRead | null;
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
 * ── F24 TYPE SCALE, SUPERSEDED BY THE PLAQUE (2026-09-25) ───────────────────
 *
 * F24 (measured 2026-09-21) set the rail's four blocks at ~17px because a
 * trader cannot read 9px brass out of the corner of an eye. The finding stands;
 * the four blocks do not. H-101 / F05A / F06A draw the decision surface at rest
 * as ONE plaque, and the plaque carries the large type now — a 44px serif
 * state word (see PLAQUE_WORD), far above F24's 24px headline. The 17px
 * RAIL_LABEL / RAIL_VALUE / RAIL_MUTED scale is retired with the blocks it
 * sized: everything that is not the plaque lives inside the fold, and the fold
 * is disclosed detail, which keeps LABEL / VALUE / MUTED — inflating detail to
 * headline scale would re-create the overflow one click deeper.
 */

/**
 * THE S-501 FOLD — the plate the fifth-through-eighth chunks collapse behind.
 *
 * Drawn as one seam in the attached instrument, not as another card. V12's
 * finished-WAIT frame gives the whole right edge one boundary and lets the
 * internal readings share it. A bare underlined "show more" would still be
 * the wrong material, so the summary keeps the same brass divider language.
 *
 * `listStyle: "none"` plus the WebKit pseudo-element rule below removes the
 * native triangle, which is drawn in the UA's own grey and cannot be recoloured
 * into the palette. The chevron is supplied in the palette's own gold instead.
 */
const DETAIL_DRAWER: React.CSSProperties = {
  border: "none",
  borderBottom: "1px solid rgba(196,165,116,0.18)",
  borderRadius: 0,
  background: "transparent",
  padding: "0 0 2px",
  marginBottom: 0,
};

const DETAIL_SUMMARY: React.CSSProperties = {
  // THE HANDLE IS A DOOR, NOT A FIFTH CARD. It was set at canon scale while it
  // was one of four stacked statements; under the H-101 plaque it is the only
  // other thing on the rail at rest, and a door set at headline size competes
  // with the one statement the plates allow. Brass small caps, one line.
  ...LABEL,
  fontSize: 11,
  lineHeight: "16px",
  letterSpacing: "0.16em",
  listStyle: "none",
  cursor: "pointer",
  // 44px is the touch floor this repo already enforces elsewhere; the rail is
  // desktop-only but the same hand-size arithmetic is what makes a label
  // clickable with confidence by a mouse as well.
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 11px",
  userSelect: "none",
};

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
 * THE LEDGER, NAMED — canon WM_NewMockup_123_F16_Evidence_Debt_WAIT_Finished.
 *
 * The mockup draws the debt as five NAMED first-class conditions:
 *
 *     [DIRECTION ✓] [LOCATION ✓] [AVAILABLE R ✓] [AGGRESSION ?] [CLC ?]
 *
 * The shipped bar above draws the same ledger as anonymous dots. MEASURED LIVE
 * 2026-09-20 on /charts, BTC · 1h, the rail read `WAIT ●●●■■■■` — a trader
 * could see that four conditions were owed and could not see WHICH FOUR. One
 * of them was then named in the sentence below ("Resolve available R"),
 * sampled from a capped array; the other three appeared nowhere on the screen.
 *
 * ── WHY THE GLYPH AND NOT THE COLOUR CARRIES THE STATE ───────────────────────
 *
 * Each chip states its standing in a MARK — ✓ settled, ! flagged, ? owed,
 * · observed-only — and only then tints. A chip that distinguished paid from
 * owed by tint alone would be unreadable to a colour-blind trader and invisible
 * in a screenshot printed in grey, which is how most of this product gets
 * reviewed.
 *
 * ── WHY THESE CHIPS ARE NOT aria-hidden AND THE BAR IS ───────────────────────
 *
 * The bar is `aria-hidden` because it re-draws facts the sentence beneath it
 * already states. These chips do NOT: they carry the names of every outstanding
 * node, including the ones the capped sample never reaches. Hiding them from a
 * screen reader would make the debt legible to sighted traders only.
 */
/**
 * A FINISHED WAIT IS THE CALMEST THING ON THE RAIL, AND IT IS NOT GREEN.
 *
 * FINISHED is ivory — the same settled ink the RESOLVED ledger segments use,
 * because it IS a settled reading. It is deliberately NOT green: green is the
 * colour this product reserves for nothing, since a wait that turned out badly
 * was still a correctly finished wait, and colouring it as a win would grade an
 * outcome WM never measured (§ selectWaitStanding refusal 3).
 *
 * WORKABLE is gold — the rail's one colour for "your move".
 *
 * VENUE_BLOCKED is dimmed, because the reader can do nothing about it HERE and
 * a loud chip would read as an alarm they are expected to answer.
 *
 * Colour is a second channel in every case: the headline word already says it.
 */
const WAIT_STANDING_TONE: Record<WaitStanding, React.CSSProperties> = {
  FINISHED: { color: "#c9c2a7" },
  WORKABLE: { color: "#d4af37" },
  VENUE_BLOCKED: { color: "rgba(139,143,168,0.82)" },
};

const LADDER_MARK: Record<EvidenceLadderState, string> = {
  RESOLVED: "✓",
  WARN: "!",
  MISSING: "?",
  WATCH: "·",
};

/**
 * Said aloud, for the mark. A screen reader must not be handed "✓" and left to
 * guess — nor "check", which says nothing about a ledger.
 */
const LADDER_SPOKEN: Record<EvidenceLadderState, string> = {
  RESOLVED: "settled",
  WARN: "flagged, still owed",
  MISSING: "owed",
  WATCH: "observed, outside the ledger",
};

const LADDER_CHIP_TONE: Record<EvidenceLadderState, React.CSSProperties> = {
  RESOLVED: { color: "#c9c2a7", borderColor: "rgba(201,194,167,0.42)" },
  WARN: { color: "#d4af37", borderColor: "rgba(212,175,55,0.55)" },
  MISSING: { color: "rgba(201,162,89,0.82)", borderColor: "rgba(201,162,89,0.30)" },
  WATCH: { color: "rgba(139,143,168,0.78)", borderColor: "rgba(139,143,168,0.26)" },
};

/**
 * THE PLAQUE IS THE SENTENCE THAT TURNS A NAG INTO A LOCK.
 *
 * Canon WM_NewMockup_123 heads the roster with "EVIDENCE DEBT — FIRST-CLASS
 * CONDITION · PERMISSION WITHHELD". Without it the chips are a list of things
 * the product happens to be missing, sitting beside a decision the trader may
 * take anyway. With it they are the reason the door is shut.
 *
 * HELD is the rail's gold, because it is the state that owns the reader's
 * attention. NOT_EVALUATED is dimmed — nothing here is asking to be answered,
 * and a loud chip over an unevaluated chain would read as an alarm.
 *
 * CLEAR is ivory and NEVER green, for the same reason FINISHED is not: green
 * would read as approval of a trade, and this product grades no outcome. The
 * door being open is not a recommendation to walk through it.
 *
 * Colour is the second channel throughout. The plaque word says it first.
 */
const INTERLOCK_TONE: Record<GoInterlockState, React.CSSProperties> = {
  HELD: { color: "#d4af37", borderColor: "rgba(212,175,55,0.45)" },
  NOT_EVALUATED: { color: "rgba(139,143,168,0.82)", borderColor: "rgba(139,143,168,0.26)" },
  CLEAR: { color: "#c9c2a7", borderColor: "rgba(201,194,167,0.42)" },
};

function LadderChip({ segment }: { segment: EvidenceLadderSegment }) {
  const label = segment.label;
  if (!label) return null;
  return (
    <span
      data-testid="evidence-ladder-chip"
      data-state={segment.state}
      data-next={segment.isNext ? "true" : undefined}
      /* The whole chip is one phrase to a screen reader. Splitting the name
         from its mark would read as two unrelated tokens in a list. */
      aria-label={`${label}: ${LADDER_SPOKEN[segment.state]}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 5px",
        borderRadius: 2,
        border: "1px solid",
        fontSize: 8.5,
        lineHeight: "12px",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...LADDER_CHIP_TONE[segment.state],
        /* Same rule as the bar: the next thing is the only chip that is lit
           from behind, because it is the subject of the sentence beneath. */
        ...(segment.isNext ? { background: "rgba(212,175,55,0.12)", borderColor: "#d4af37" } : null),
      }}
    >
      <span aria-hidden="true">{label}</span>
      <span aria-hidden="true" style={{ opacity: 0.85 }}>
        {LADDER_MARK[segment.state]}
      </span>
    </span>
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

/**
 * ── H-101 / F05A / F06A / P110: THE RAIL AT REST IS ONE CALM WAIT PLAQUE ────
 *
 * MEASURED on serving /charts beside the canon plates, 2026-09-25: the rail
 * drew four stacked cards at rest (DECISION · NOT BORN + pill; NOW · STATE;
 * RISK · WHY · DETAIL; NEXT + PERMISSION WITHHELD). Every plate that draws the
 * decision surface draws ONE thing: a large serif state word, a small glyph,
 * one sentence in the room's voice, and (H-101) the asOf stamp. Depth lives
 * behind the fold. The Founder's words: "a lot of just cards, not the actual
 * designs within the canon".
 *
 * The plaque is ink only. Its word is the compiled verdict, its sentence is
 * `selectWaitPlaque`'s (which reads the compiled ledger and selectWaitStanding
 * — no second decision owner), its stamp is the canonical capture instant.
 *
 * Material: F06A's framed brass plate — ONE hairline frame with an inner rule,
 * a faint lamp-light from above, obsidian ground. The six brass/pearl values
 * are the rail's own (#c4a574 GOLD, #ede6d3 PEARL, #8a8271 MUTED, #d4af37 the
 * verdict gold, #c9c2a7 the settled ivory); no fourth brass is introduced.
 */
const PLAQUE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 6,
  margin: "4px 2px 10px",
  padding: "18px 12px 14px",
  border: "1px solid rgba(196,165,116,0.40)",
  boxShadow: "inset 0 0 0 3px rgba(5,5,6,0.92), inset 0 0 0 4px rgba(196,165,116,0.16)",
  borderRadius: 2,
  background:
    "radial-gradient(ellipse 90% 60% at 50% 18%, rgba(212,175,55,0.085) 0%, rgba(212,175,55,0.02) 55%, rgba(5,5,6,0) 80%)",
};

const PLAQUE_WORD: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 44,
  lineHeight: "48px",
  letterSpacing: "0.10em",
  fontWeight: 400,
  // Engraved, not lit: the word is brass on the plate, not a neon sign.
  textShadow: "0 1px 0 rgba(0,0,0,0.65), 0 0 18px rgba(212,175,55,0.14)",
};

/**
 * THE WORD FITS THE PLATE, IT IS NEVER CUT. 44px serif is F05A's WAIT on the
 * narrowest rail (232px → ~184px inside the frame), but NO TRADE at 44px is
 * ~270px wide and would break mid-letter or overflow the frame. Georgia caps
 * with 0.10em tracking advance ≈ 0.8em each, so the size is solved from the
 * word's own length against the narrowest inner width and capped at 44.
 */
function plaqueWordSize(word: string): number {
  return Math.max(24, Math.min(44, Math.floor(176 / (Math.max(1, word.length) * 0.8))));
}

const PLAQUE_GLYPH: React.CSSProperties = {
  color: "#c4a574",
  // Measured in the geometry gate's Chrome screenshot: at 20px the ⚖ drew
  // about 12px tall, a speck under a 44px word. F05A draws it a third the
  // word's height.
  fontSize: 26,
  lineHeight: "28px",
  opacity: 0.9,
};

const PLAQUE_LINE: React.CSSProperties = {
  display: "block",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 11.5,
  lineHeight: "16px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  overflowWrap: "anywhere",
};

const PLAQUE_RULE: React.CSSProperties = {
  display: "block",
  width: "62%",
  height: 1,
  margin: "5px auto",
  background: "linear-gradient(90deg, rgba(196,165,116,0) 0%, rgba(196,165,116,0.55) 50%, rgba(196,165,116,0) 100%)",
};

/**
 * THE STAMP IS SMALL, NOT FINE PRINT. 11px is the readable floor the interior
 * geometry gate enforces (measure-experience-geometry.mjs, TINY law,
 * PHRASE_MIN_PX). Shipped at 9.5px it failed CI on main (829a3a37, run
 * 36181652895): "SESSION UNKNOWN" and "asOf 14:46:05Z" measured 10px against
 * an 11px floor. "Small" on the plate means quiet colour and tracking, never a
 * size a trader cannot read out of the corner of an eye. The line box is set
 * above the glyph height so the stamp is never vertically crushed either.
 */
const PLAQUE_STAMP: React.CSSProperties = {
  fontSize: 11,
  lineHeight: "16px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#8a8271",
  fontVariantNumeric: "tabular-nums",
};

export function DecisionSpineBand(props: DecisionSpineBandProps) {
  const { decisionId, decisionIdAbsence, market, oneStory, availableR, decisionWhy, expression, replayEngaged } = props;
  const flowContext = props.flowContext ?? null;
  const presentation = props.presentation ?? "band";
  const rail = presentation === "rail";
  // NOW owns the compiled posture on the rail. Name that projection here so
  // the value cannot drift back into NEXT, whose source guard deliberately
  // rejects the old raw-decision expression anywhere in this component.
  const nowDecision = oneStory?.decision ?? null;
  /* ONE WORD, TWO MOUTHS — the single condition under which this surface puts
     the verdict word on screen in its own ink. Measured on the serving Worker
     2026-09-22: the pill printed WAIT inside the DECISION cell and this
     headline printed WAIT again 45px below it at the same x. Not two engines
     agreeing — `selectDecisionWhyNot` reads `oneStory.decision.value`, and so
     does this line. One value, painted twice.

     This const is the reason the duplicate cannot come back: the SAME boolean
     gates the headline below AND is handed to the canvas-summary attachment,
     in this render. If this surface stops printing the word, the attachment is
     told so in the same breath. */
  const surfaceOwnsVerdict = Boolean(rail && nowDecision);
  /* The attachment is rendered HERE, with the flag this render computed, so
     there is exactly one place the answer is produced and one place it is
     consumed. An attachment that decides it has nothing left to say returns
     null, and the wrapper below disappears with it rather than drawing an
     empty frame. */
  const canvasSummaryNode = props.canvasSummary
    ? props.canvasSummary({ verdictOwnedBySurface: surfaceOwnsVerdict })
    : null;
  const priceDisplay = formatSpinePrice(
    market.last,
    market.lastBarClose,
    market.lastBarTimeframe,
    market.barsSettled,
    { last: market.quoteLast, source: market.quoteSource },
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
  /* WAIT IS A FINISHED STATE, OR IT ISN'T — canon 064 / 094 / 123. The rail
     printed the verdict alone, so "stand down" and "you have work" rendered
     identically. See selectWaitStanding for where the answer is derived from. */
  const waitStanding = selectWaitStanding(nowDecision, oneStory ? oneStory.debt : null);
  /* THE DEBT IS THE LOCK, NOT A NOTE BESIDE ONE — canon 123's "FIRST-CLASS
     CONDITION · PERMISSION WITHHELD". The rail drew the verdict and the chips
     as two neighbouring facts and left the trader to infer the connection
     between them; this plaque states it. Derived from the SAME verdict and the
     SAME roll — a second caller, never a second answer (§24).

     NO THIRD ARGUMENT, AND THAT IS THE HONEST CALL, NOT AN OVERSIGHT. E-301
     draws GO as two contactors in series: the evidence gates AND the intent
     circuit (bars EXECUTABLE, broker answered). This band is handed `honesty`
     but NOBODY hands it a broker reading — the broker domain is explicitly
     "not tied to the market panel" — so the intent circuit has never been
     measured here. Passing `{ broker: null }` would be worse than passing
     nothing: it would report a measurement this surface never took. So the
     plaque reads PERMISSION NOT EVALUATED over a paid chain, which is true.

     To make this rail able to say GRANTED, give it a real broker-honesty
     owner and pass all three keys. Do not reach that state by inventing one. */
  const interlock = selectGoInterlock(nowDecision, oneStory ? oneStory.debt : null);
  /* H-101 / F05A / F06A — the plaque's ONE sentence. A third caller of the
     same verdict and the same ledger, never a third answer: the word is
     `nowDecision.value` verbatim and the standing is selectWaitStanding's. */
  const plaque = selectWaitPlaque(nowDecision, oneStory ? oneStory.debt : null);
  const ladder = selectEvidenceLadder(oneStory ? oneStory.debt : null);
  /* The ledger first, then the observations outside it — the same two groups
     the bar draws, in the same order, so the chips and the bar can never tell
     two different stories about one chain. */
  const ladderAll = ladder ? [...ladder.segments, ...ladder.watch] : [];
  const ladderChips =
    ladderAll.length > 0 && ladderAll.every((s) => s.label && s.key) ? ladderAll : null;
  /* H-101 / V12 ATTENTION GOVERNOR — the rail is an instrument, not a card
     catalog. The current mockup permits three named conditions plus one +N
     disclosure on the always-visible surface. Nothing is discarded: the
     summary chip's title and spoken label carry every collapsed condition,
     while Full Evidence continues to render the unabridged owner. Non-rail
     presentations remain unabridged because this is a desktop silhouette law,
     not a mutation of the evidence ledger. */
  const visibleLadderChips =
    ladderChips && rail ? ladderChips.slice(0, 3) : ladderChips;
  const collapsedLadderChips =
    ladderChips && rail ? ladderChips.slice(visibleLadderChips?.length ?? 0) : [];
  const collapsedLadderDetail = collapsedLadderChips
    .map((segment) => `${segment.label}: ${LADDER_SPOKEN[segment.state]}`)
    .join("; ");
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
        // ── V12 FINISHED WAIT: ONE INSTRUMENT, NOT GOLD CARDS ────────────
        // F24 established the rail's brass material. V12 resolves the later,
        // more specific WAIT silhouette: one continuous right-side field with
        // internal rules, not four separately raised rectangles. The Founder
        // called the shipped stack "paragraphs and gold cards"; preserving a
        // border, warm ground and gutter on every cell would preserve exactly
        // that hierarchy even after the prose itself was collapsed.
        //
        // The section owns the material plane. Cells now own only a quiet
        // bottom divider, so DECISION → NOW → WHY → NEXT reads as one state
        // instrument while every semantic region and truth owner survives.
        border: "none",
        borderBottom: "1px solid rgba(196,165,116,0.18)",
        borderRadius: 0,
        background: "transparent",
        padding: "10px 11px",
        marginBottom: 0,
      }
    : CELL;
  const decisionValue = decisionId ? (
    <code
      style={{
        // Detail scale in both projections: on the rail the id now opens the
        // fold (the plaque is the headline), and the fold is disclosed detail.
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
  ) : rail ? (
    <>
      <span
        style={{ ...VALUE, color: "#c9c2a7", fontWeight: 700, letterSpacing: 0.45 }}
        data-testid="spine-decision-absent"
        title={decisionIdAbsence}
      >
        NOT BORN
      </span>
      {/* Inside the fold the reason is detail, so it is printed, not hidden:
          "no decision has been born yet" and "a decision exists and we lost
          it" are different facts and the trader who opened the fold asked. */}
      <span style={MUTED}>{decisionIdAbsence}</span>
    </>
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
      {/* THE OWL WITH TWO CLOCKS, fourth clock, third owner. MEASURED on
          production at (1216,409) with Bar Replay engaged and the masthead
          already correctly reading "HISTORICAL BARS VERIFIED · bar replay":
          this cell was still printing `LIVE · asOf 06:43:40Z`.

          Two things are withheld and they are withheld for different reasons.
          THE QUALITY WORD is a grade of the LIVE PRINT CHANNEL; it remains
          true of that channel while the camera walks history, but it is
          pinned beneath bars it no longer describes, so it is withheld rather
          than falsified — the same distinction the two live-tape overlays are
          gated on. THE WALL CLOCK is withheld for the sharper reason written
          into `compileFeedStanding`: a label is a claim a trader can question,
          but `asOf 06:43:40Z` beside a bar from last Tuesday reads as a fact.
          The compiler answers `observedAtMs: null` there; this cell prints no
          timestamp here, so the two owners cannot disagree.

          The replacement is the canon's own word for what the camera is
          showing — not a dialect invented in this component. */}
      <span style={MUTED} data-replay-camera={replayEngaged ? "engaged" : undefined}>
        {replayEngaged
          ? `${CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED} · BAR REPLAY`
          : `${qualifyMarketQuality(market.quality, priceDisplay.provenance)} · ${asOfText(market.capturedAt)}`}
      </span>
    </>
  );

  // ── S-501 FOUR CHUNK ATTENTION BUDGET (IFC 19 SEP 2026) ────────────────
  // The blueprint budgets the 1440 desktop frame at FOUR chunks — 1° MARKET
  // CANVAS, 2° WAIT/DECISION, 3° LIVING PROFILE, 4° ONE optional overlay —
  // and states the failure condition literally: "FIFTH CHUNK MUST COLLAPSE OR
  // THE FRAME FAILS."
  //
  // MEASURED on a live 1440x900 /charts render 2026-09-19: this rail carried
  // EIGHT chunks — DECISION, MARKET, NOW, the honesty plaque (itself three
  // stacked readings), RISK, WHY, FULL EVIDENCE, NEXT — as a single scrolling
  // column of small prose beside the candles. The rail alone is supposed to be
  // chunk 2. It was spending the whole budget by itself, which is also the
  // S-501 note "PROSE SHALL NOT OUTWEIGH PRICE" failing in the plainest way.
  //
  // COLLAPSE, NOT DELETE. D-701's salvage note is explicit — "MIGRATE
  // LEGITIMATE ORGANS INTO WORKSPACE/TOOLS DRAWERS" — and RISK, WHY and the
  // fidelity plaque are all legitimate organs. They move behind ONE native
  // <details> disclosure that ships closed. Native, not React state, for three
  // reasons: it survives SSR with the content really present in the markup (so
  // the spine's own label assertions still read it), it needs no hydration to
  // open, and a screen reader is handed the whole rail regardless of the
  // visual collapse. Nothing is computed here that was not computed before.
  //
  // The horizontal BAND keeps all six cells inline. It is the phone/narrow
  // projection, it is not the 1440 frame S-501 governs, and its cells already
  // scroll rather than stack.
  /* ── THE HANDLE MUST NAME THE STATE OF WHAT IT HIDES ──────────────────────
     MEASURED prod /charts 2026-09-22 (eb63292b): the closed fold read only
     "Risk · Why · Detail" while the plaque one click behind it already said
     chart integrity WOUNDED and fidelity DEGRADED — over a chart that was
     painting. S-501 made the handle name its REGIONS; it never made the handle
     name its STATE, so a wounded canvas and a certified one drew identically.

     Nothing moves out of the fold. S-501's four-chunk budget is untouched and
     the six organs stay exactly where they are. The only change is that a
     NON-NOMINAL fold stops being mute about it.

     Derived from the SAME reading the plaque renders, through the SAME
     `paintTreatment` owner — no second evidence engine, and INTACT emits
     nothing at all, so the calm rail is byte-identical to the one shipping. */
  const foldEscalation = selectFoldEscalation(props.honesty);

  const honestyCell = props.honesty !== undefined && (
    <div style={{ padding: rail ? "8px 10px" : "6px 8px", display: "flex" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <MarketHonestyPlaque reading={props.honesty} />
      </div>
    </div>
  );

  const riskCell = (
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
  );

  /* ── THE LEDGER'S TWO DRAWN FORMS, HOISTED SO THEY CAN BE PLACED ─────────
     Identical markup, identical producers, identical testids. The only thing
     the F24 pass changes is WHERE they mount: the horizontal band keeps them
     inline under NEXT, and the 1440 rail renders them inside the S-501 fold
     under an "Evidence ledger" heading.

     Why these two and not the interlock plaque beside them: both are RESTATED
     evidence. The bar is `aria-hidden` by its own long-standing argument — it
     "adds no fact a screen reader is not already given by the sentence beneath
     it" — and the roster names the same nodes that sentence counts. At F24
     scale they were also the only two runs in the column set below 9px, i.e.
     the literal fine print. The plaque stays primary, because its own comment
     is right that it "states a fact that appears nowhere else on the rail". */
  /* DRAWN BEFORE READ. The bar is decoration in the accessibility tree —
     `aria-hidden` — because it adds no fact a screen reader is not already
     given by the sentence beneath it. Removing it removes a rendering of the
     ledger, never the ledger. */
  const ladderBar = ladder ? (
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
  ) : null;

  /* NAMED ONLY IF EVERY NODE IS NAMED.
     A partial roster is worse than none: four chips over a seven-segment bar
     reads as "these four are the debt", and the three it could not name would
     vanish behind a number that no longer has a name for its own parts. All or
     nothing is the only honest gate. */
  const ladderRoster = ladderChips ? (
    <span
      data-testid="evidence-ladder-roster"
      data-named={ladderChips.length}
      data-visible={visibleLadderChips?.length ?? 0}
      data-collapsed={collapsedLadderChips.length}
      style={{ display: "flex", flexWrap: "wrap", gap: 3, margin: "3px 0 1px" }}
    >
      {visibleLadderChips?.map((segment) => (
        <LadderChip key={`chip-${segment.key}`} segment={segment} />
      ))}
      {collapsedLadderChips.length > 0 ? (
        <span
          data-testid="evidence-ladder-more"
          title={collapsedLadderDetail}
          aria-label={`${collapsedLadderChips.length} more conditions. ${collapsedLadderDetail}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "1px 5px",
            borderRadius: 2,
            border: "1px solid rgba(139,143,168,0.26)",
            color: "rgba(139,143,168,0.82)",
            fontSize: 8.5,
            lineHeight: "12px",
            letterSpacing: "0.09em",
            whiteSpace: "nowrap",
          }}
        >
          +{collapsedLadderChips.length}
        </span>
      ) : null}
    </span>
  ) : null;

  const whyCell = (
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
  );

  /* The plaque's sentence, or — when nothing was compiled — the rail's own
     long-standing words for that absence, in the plaque's voice. Never a
     verdict-shaped placeholder: with no story there is no word above it. */
  const plaqueReason = plaque ? plaque.reason : "NO STORY COMPILED · EVIDENCE INSUFFICIENT";

  /* A NEXT THAT REPEATS NOW IS NOT A NEXT.
     This cell used to print the Right-of-Way verdict itself, so the rail
     said WAIT in the header chip and WAIT again here, under two different
     labels, from one producer. (The reverted form is named literally in
     the Sentinel `× THE RESURRECTED ECHO`, which is why it is not spelled
     out here — the spelling must appear nowhere but the guard.) NEXT now
     compiles the single thing capable of CHANGING the job. The attached
     expression, when one exists, remains the literal next object.

     A VOID BETWEEN TWO CELLS IS A CLAIM THAT THEY ARE UNRELATED. This cell
     once carried `marginTop: "auto"` in the rail, parking NEXT ~200px below
     WHY (measured live 2026-09-15). NEXT is DERIVED from the very evidence
     WHY displays, so no spacer may sever them.

     ON THE RAIL it now lives inside the fold, directly under the DECISION_ID
     it is the next act of (H-101 plaque pass, 2026-09-25). At rest the plaque
     already says the same node in the room's voice — `selectWaitPlaque` names
     the node NEXT names, and a test pins that they agree. */
  const nextCell = (
    <div style={cellStyle}>
      <span style={LABEL}>Next</span>
      <span style={VALUE} data-testid="spine-next" data-next-kind={expression ? "ATTACHED_EXPRESSION" : nextThing.kind}>
        {expression ?? nextThing.headline}
      </span>
      {rail ? null : ladderBar}
      {/* THE PLAQUE GOES ABOVE THE ROSTER, BECAUSE IT IS WHAT THE ROSTER IS.
          Read downward: the lock, then the conditions holding it, then the
          sentence naming the first one to pay. H-101: "GO circuit is dark
          while debt is open" — this is that circuit, in words.

          NOT aria-hidden. Unlike the bar, this states a fact that appears
          nowhere else on the rail — that the debt is what withholds
          permission — and the `title` carries the full release sentence. */}
      {rail ? (
        <span
          data-testid="go-interlock"
          data-interlock={interlock.state}
          data-held-by={interlock.heldBy.length}
          title={interlock.release}
          aria-label={`${interlock.plaque}. ${interlock.release}`}
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            padding: "1px 5px",
            margin: "4px 0 0",
            borderRadius: 2,
            border: "1px solid",
            // The 11px readable floor (geometry gate, TINY law). 10.5px failed
            // CI on main as "PERMISSION WITHHELD" — the one line that says
            // whether the trader may act cannot be the smallest in the fold.
            fontSize: 11,
            lineHeight: "16px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            ...INTERLOCK_TONE[interlock.state],
          }}
        >
          {interlock.plaque}
        </span>
      ) : null}
      {rail ? null : ladderRoster}
      <span style={MUTED}>
        {expression ? "Attached expression" : nextThing.detail}
      </span>
    </div>
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
        //
        // ── C-101 CAMERA FLOOR AREA (IFC 19 SEP 2026) ────────────────────
        // Sheet C-101 note 2: "V01+V02+V12 MARKET CANVAS GOVERN FIRST PAINT.
        // charts 70% FLOOR AREA". MEASURED on a live 1440x900 render
        // 2026-09-19: the market camera occupied 1087x483 of a 1440x723
        // viewport = 50.4%. Nineteen and a half points under the drawing.
        //
        // The old clamp resolved to 316.8px at 1440 (22vw), and the rail no
        // longer needs that width: the S-501 fold below moved RISK, WHY and
        // the fidelity plaque behind one disclosure, so what stays open is
        // identity, NOW and NEXT — short lines, not paragraphs. 17vw resolves
        // to 244.8px at 1440 and hands ~72px straight back to the candles.
        //
        // THE FLOOR IS RAISED, NOT REMOVED. 232px is below the old 260px
        // minimum because the open content shrank with it; it is not a licence
        // to keep shaving. Narrower than this and `Available R -1.20R ·
        // risk/unit 0.35R` wraps to three lines inside the fold, which trades
        // reclaimed width for reclaimed height and gains nothing.
        width: rail ? "clamp(232px, 17vw, 288px)" : undefined,
        // The plates need a gutter, or their hairlines fuse with the seam
        // border on the left and the room edge on the right.
        padding: rail ? "8px 9px 2px" : undefined,
        overflowY: rail ? "auto" : undefined,
        flexShrink: 0,
      }}
      data-material-plane={rail ? "sanctuary-seam" : undefined}
      data-rail-composition={rail ? "continuous-instrument" : undefined}
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
        .wm-decision-spine details > summary::-webkit-details-marker { display: none; }
        .wm-spine-fold-chevron {
          transition: transform 120ms ease;
          color: #c4a574;
          font-size: 11px;
        }
        .wm-decision-spine details[open] .wm-spine-fold-chevron {
          transform: rotate(90deg);
        }
        .wm-spine-sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }
      `}</style>
      {/* ── H-101 / F05A / F06A / P110 — THE RAIL AT REST IS ONE PLAQUE ────
          The plates agree: at rest the decision surface is ONE calm WAIT
          plaque with ONE reason sentence; depth is behind a fold. MEASURED on
          serving /charts 2026-09-25 the rail drew four stacked cards instead
          (DECISION + pill, NOW · STATE, RISK · WHY · DETAIL, NEXT + PERMISSION
          WITHHELD). This block replaces the first two and the fourth AT REST;
          all four remain, whole, one click away in the fold below.

          WHAT STAYS ON THE PLATE, and why each is lawful:
            · the word — `nowDecision.value`, the compiled verdict, gated by
              the SAME `surfaceOwnsVerdict` const the canvas pill is told about;
            · ⚖ — F05A's glyph. Ornament, aria-hidden, no claim;
            · ONE sentence — `selectWaitPlaque`, keyed on the ledger node NEXT
              names (or the composition a FINISHED wait waits on);
            · the WAIT standing ("2 TO RESOLVE" / FINISHED / VENUE) and the NOW
              session token — the debt count and the moment, at stamp size;
            · the asOf stamp — H-101 "asOf STAMP REQUIRED". Withheld under a
              replay camera for the companion-camera law's reason: a wall clock
              beside a replayed bar reads as a fact about that bar.

          The DECISION_ID birth, MARKET provenance, the fidelity plaque, RISK,
          WHY, NEXT with the GO interlock, and the evidence ledger all moved
          INTO the fold. The horizontal band (phone / options-open) is not the
          1440 frame and keeps every cell inline, unchanged. */}
      {rail ? (
        <div
          data-testid="spine-wait-plaque"
          data-plaque-basis={plaque ? plaque.basis : "NONE"}
          data-plaque-node={plaque?.node ?? undefined}
          role="group"
          aria-label={oneStory && nowDecision
            ? `Now. State ${nowDecision.value}. ${plaque ? plaque.reason : ""}. ${props.now.token}. ${oneStory.primary}`
            : `Now. No story compiled. ${props.now.token}.`}
          style={PLAQUE}
        >
          {surfaceOwnsVerdict && nowDecision ? (
            <span
              data-testid="spine-now-state"
              data-state={nowDecision.value}
              style={{
                ...PLAQUE_WORD,
                fontSize: plaqueWordSize(nowDecision.value),
                lineHeight: `${plaqueWordSize(nowDecision.value) + 4}px`,
                whiteSpace: "nowrap",
                color: nowDecision.tone === "resolved" ? "#c9c2a7" : "#d4af37",
              }}
            >
              {nowDecision.value}
            </span>
          ) : null}
          <span aria-hidden="true" data-testid="spine-plaque-glyph" style={PLAQUE_GLYPH}>
            ⚖
          </span>
          {/* ONE sentence. A two-clause sentence is set F06A's way — first
              clause, a brass rule, second clause — never as two statements. */}
          <span
            data-testid="spine-plaque-reason"
            aria-label={plaqueReason}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
          >
            {plaqueReason.split(" · ").map((clause, i) => (
              <React.Fragment key={`clause-${i}`}>
                {i > 0 ? <span aria-hidden="true" style={PLAQUE_RULE} /> : null}
                <span aria-hidden="true" style={{ ...PLAQUE_LINE, color: i === 0 ? "#ede6d3" : "#c4a574" }}>
                  {clause}
                </span>
              </React.Fragment>
            ))}
          </span>
          <span aria-hidden="true" style={{ ...PLAQUE_RULE, width: "34%", margin: "6px auto 1px", opacity: 0.55 }} />
          <span data-testid="spine-plaque-stamp" style={PLAQUE_STAMP}>
            {/* THE WORD ALONE WAS AMBIGUOUS — "stand down" and "you have work"
                both rendered as WAIT. The standing is the difference, derived
                by selectWaitStanding and never asserted. */}
            {waitStanding ? (
              <span
                data-testid="spine-wait-standing"
                data-standing={waitStanding.standing}
                title={waitStanding.detail}
                aria-label={`Wait standing. ${waitStanding.detail}`}
                style={WAIT_STANDING_TONE[waitStanding.standing]}
              >
                {waitStanding.headline}
              </span>
            ) : null}
            {waitStanding ? <span aria-hidden="true"> · </span> : null}
            <span
              style={{ color: NOW_TOKEN_TONE[props.now.established ? "established" : "unestablished"].color }}
              data-testid="spine-now-session"
              data-session-established={props.now.established ? "true" : "false"}
              title={props.now.detail}
              aria-label={`${props.now.token} — ${props.now.detail}`}
            >
              {props.now.token}
            </span>
          </span>
          <span
            data-testid="spine-plaque-asof"
            data-replay-camera={replayEngaged ? "engaged" : undefined}
            // H-101 spells the stamp "asOf"; the plate's small caps printed
            // it as "ASOF" (seen in the gate's Chrome screenshot).
            style={{ ...PLAQUE_STAMP, textTransform: "none" }}
          >
            {replayEngaged ? "BAR REPLAY · NO LIVE CLOCK" : asOfText(market.capturedAt)}
          </span>
          <span className="wm-spine-sr-only">
            {oneStory ? oneStory.primary : "No story compiled — evidence insufficient."}
          </span>
        </div>
      ) : (
        <div style={{ ...cellStyle, flex: "1 1 220px", minWidth: 200, maxWidth: "100%", borderLeft: "none", borderTop: "none" }}>
          <span style={LABEL}>Decision</span>
          {decisionValue}
        </div>
      )}

      {/* UI-04 · THE QUESTION AND ITS DEBT, BESIDE THE MARKET — the chart's own
          lens reading, verbatim. Order as the plate: question, focus, the debt
          ledger item by item, posture, next question, then who is in control. */}
      {rail && props.questionLens && !replayEngaged && (props.questionLens.active || props.questionLens.refusal) ? (() => {
        const lens = props.questionLens!;
        const changes = lens.ledger === "CHANGES";
        const rows = lens.debt.length;
        const paid = changes ? lens.debt.filter(d => d.paid).length : rows - lens.openDebt;
        return (
          <div
            data-testid="spine-question-lens"
            data-lens-kind={lens.kind ?? "REFUSED"}
            data-lens-open={lens.openDebt}
            style={{ display: "flex", flexDirection: "column", gap: 6, margin: "0 2px 10px", padding: "9px 11px 9px", border: `1px solid ${lens.openDebt > 0 ? "rgba(226,92,92,0.45)" : "rgba(196,165,116,0.28)"}`, borderRadius: 2 }}
          >
            <span style={{ ...LABEL, fontSize: 11, lineHeight: "16px", letterSpacing: "0.14em" }}>Active question</span>
            {lens.active ? (
              <>
                <span style={{ fontSize: 14, lineHeight: "19px", color: "#f7f1df", fontWeight: 600 }}>“{lens.question}”</span>
                {lens.focus ? <span style={{ ...PLAQUE_STAMP, color: "#c8c0ae", textTransform: "none", letterSpacing: "0.02em" }}>Focus · {lens.focus}</span> : null}
                <span style={{ ...LABEL, fontSize: 11, lineHeight: "16px", color: lens.openDebt > 0 ? "#ff9696" : "#c9a55c", marginTop: 2 }}>
                  {changes ? `What changed · ${paid} of ${rows} moved` : `Evidence debt · ${paid}/${rows} paid${lens.openDebt ? ` · ${lens.openDebt} open` : ""}`}
                </span>
                {lens.debt.map(d => (
                  <span key={d.label} data-lens-item={d.paid ? "PAID" : "OWED"} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 11, lineHeight: "15px", fontWeight: 700, color: d.paid ? "#c9a55c" : changes ? "#c8c0ae" : "#ff9696" }}>
                      {changes ? (d.paid ? "Changed" : "Same") : d.paid ? "Paid" : "Missing"} · {d.label}
                    </span>
                    <span style={{ fontSize: 11, lineHeight: "15px", color: "#a9a191" }}>{d.evidence}</span>
                  </span>
                ))}
                {lens.posture ? <span style={{ fontSize: 11, lineHeight: "15px", fontWeight: 800, color: lens.openDebt > 0 ? "#ff9696" : "#c9a55c" }}>{lens.posture}</span> : null}
                {lens.nextQuestion ? <span style={{ fontSize: 11, lineHeight: "15px", color: "#c8c0ae" }}>Next question → {lens.nextQuestion}</span> : null}
                {lens.control ? (
                  <span data-testid="spine-lens-control" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, borderTop: "1px solid rgba(196,165,116,0.18)", paddingTop: 6 }}>
                    <span style={{ fontSize: 11, lineHeight: "15px", color: "#e25c5c", fontWeight: 700 }}>{lens.control.effortWord} {Math.round(lens.control.aggression * 100)}%</span>
                    <span style={{ fontSize: 11, lineHeight: "15px", color: "#78a0dc", fontWeight: 700 }}>DISPLACEMENT {Math.round(lens.control.displacement * 100)}%</span>
                    <span style={{ gridColumn: "1 / span 2", fontSize: 11, lineHeight: "15px", fontWeight: 800, color: lens.control.verdict === "EFFORT ABSORBED" ? "#78a0dc" : "#e25c5c" }}>Verdict: {lens.control.verdict}</span>
                  </span>
                ) : null}
              </>
            ) : (
              <span style={{ fontSize: 11, lineHeight: "15px", color: "#c8c0ae" }}>{lens.refusal}</span>
            )}
          </div>
        );
      })() : null}

      {/* F06A · ORDER FLOW CONTEXT — beneath the plaque, at rest, ONLY with a
          lawful reading. The tape's aggressor split (not F06A's book "stacks",
          which no owner here publishes), with its provenance printed. Absent
          reading → absent panel; replay camera → withheld like the clock. */}
      {rail && flowContext && !replayEngaged ? (
        <div
          data-testid="spine-flow-context"
          data-provenance={flowContext.provenance}
          aria-label={`Order flow context. Aggressor buy ${flowContext.buyPct} percent, aggressor sell ${flowContext.sellPct} percent of sided tape volume. ${flowContext.basis}.`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            margin: "0 2px 10px",
            padding: "9px 11px 8px",
            border: "1px solid rgba(196,165,116,0.24)",
            borderRadius: 2,
          }}
        >
          {/* Every line here is aria-hidden (the panel speaks once, through its
              aria-label), which also hides it from the geometry gate's TINY
              law. Humans still read it, so it keeps the same 11px floor the
              gate enforces on the plaque — a floor held, not merely unprobed. */}
          <span aria-hidden="true" style={{ ...LABEL, fontSize: 11, lineHeight: "16px", letterSpacing: "0.14em", textAlign: "center" }}>
            Order flow context
          </span>
          {([
            ["Aggressor buy", flowContext.buyPct, "#c4a574"],
            ["Aggressor sell", flowContext.sellPct, "#8a8271"],
          ] as const).map(([label, pct, ink]) => (
            <span
              key={label}
              aria-hidden="true"
              style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", columnGap: 8, rowGap: 3 }}
            >
              <span style={{ ...PLAQUE_STAMP, color: "#ede6d3", letterSpacing: "0.1em" }}>{label}</span>
              <span style={{ ...PLAQUE_STAMP, color: "#ede6d3" }}>{pct}%</span>
              {/* A proportional bar, never quantized squares: 72% draws as
                  72% of the track, so the geometry is the number. */}
              <span style={{ gridColumn: "1 / span 2", height: 4, background: "rgba(196,165,116,0.10)", borderRadius: 1 }}>
                <span style={{ display: "block", width: `${pct}%`, height: "100%", background: ink, borderRadius: 1 }} />
              </span>
            </span>
          ))}
          {/* F06A's ABSORPTION row — the chart's own newest zone, never re-derived.
              FORMING while the run reaches the newest bar; ON RECORD once it closed. */}
          {props.absorptionRead && props.absorptionRead.state !== "UNMEASURED" ? (
            <span
              aria-hidden="true"
              data-testid="spine-flow-absorption"
              data-absorption-state={props.absorptionRead.state}
              style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", columnGap: 8, borderTop: "1px solid rgba(196,165,116,0.14)", paddingTop: 5 }}
            >
              <span style={{ ...PLAQUE_STAMP, color: "#ede6d3", letterSpacing: "0.1em" }}>Absorption</span>
              <span style={{ ...PLAQUE_STAMP, color: props.absorptionRead.state === "NONE" ? "#8a8271" : "#c4a574" }}>
                {props.absorptionRead.state === "NONE" ? "None in window" : `${props.absorptionRead.state === "FORMING" ? "Forming" : "On record"} · ${props.absorptionRead.strength}`}
              </span>
            </span>
          ) : null}
          <span aria-hidden="true" data-testid="spine-flow-basis" style={{ ...PLAQUE_STAMP, textAlign: "center" }}>
            {flowContext.basis}
          </span>
        </div>
      ) : null}

      {!rail && (
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
      )}

      {!rail && (
        <div style={cellStyle}>
          <span style={LABEL}>Market</span>
          {marketValue}
        </div>
      )}

      {/* THE HONESTY CHIP, RESTORED TO THE SPINE.
          WM_NewMockup_64_F24_Surface_One_Canvas names six things in this rail —
          DECISION_ID, STATE, MARKET, RISK, WHY, and the honesty chip — and the
          shipped rail had five. The sixth was not missing from the codebase; it
          was mounted on the quarantined deck, hard-coded to null. It belongs
          here, beside MARKET, where the fidelity is a fact about the very cell
          above it.

          NOT wrapped in `cellStyle`. The plaque carries its own brass hairline
          at rgba(139,106,41,0.22) and the rail's cell frame sits at
          rgba(196,165,116,0.20) — near enough that nesting them reads as a
          double frame, a drawing error rather than a plate. The wrapper
          supplies the rail's spacing and nothing else, so the plaque's own
          frame IS the plate the mockup draws.

          Rendered only on an explicit prop. `undefined` means the caller
          attached no fidelity, and inventing an UNMEASURED plaque for a surface
          that never claimed to measure would be its own small overclaim.

          IN THE RAIL it now rides inside the S-501 disclosure below, with RISK
          and WHY. It is still beside MARKET — one fold down. */}
      {!rail && honestyCell}
      {!rail && riskCell}
      {!rail && whyCell}
      {/* ── THE FOLD NOW CARRIES EVERY ORGAN BUT THE PLAQUE ────────────────
          S-501 collapsed RISK, WHY and the fidelity plaque behind this one
          disclosure; the F24 pass added MARKET provenance and the two drawn
          forms of the evidence ledger. The H-101 plaque pass (2026-09-25) adds
          the DECISION_ID birth (with its canvas pill) and NEXT (with the GO
          interlock), for the same stated reason and by the same rule:
          COLLAPSE, NOT DELETE. Order inside: identity, the next act and its
          permission, then provenance, fidelity, risk, why, the ledger.

          EVERY ONE OF THEM IS STILL ON THE SCENE, one click away, in the
          markup at all times (native <details>, so SSR ships the content and
          a screen reader is handed the whole rail regardless of visual state).
          Nothing here is computed differently and no producer changed.

          The handle names every region it hides, and — §9 — the STATE of what
          it hides when that state is not nominal (selectFoldEscalation). It is
          set at detail scale now: the plaque is the headline, the handle is a
          door, and a door set at headline size is a fifth card. `aria-expanded`
          is supplied by the native element itself. */}
      {rail && (
        <details data-testid="spine-detail-drawer" style={DETAIL_DRAWER}>
          <summary
            style={DETAIL_SUMMARY}
            data-testid="spine-detail-summary"
            data-fold-escalation={foldEscalation.level}
            title={foldEscalation.detail}
            aria-label={foldEscalation.detail}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ whiteSpace: "normal" }}>Decision · Risk · Why · Next</span>
              {/* §9: the wound is VISIBLE, which is a different instruction
                  from the wound is RED. One parchment word on a brass hairline
                  — no severity rainbow, and absent entirely when INTACT. */}
              {foldEscalation.word ? (
                <span
                  data-testid="spine-fold-integrity"
                  data-integrity={foldEscalation.word}
                  style={{
                    alignSelf: "flex-start",
                    padding: "1px 5px",
                    borderRadius: 2,
                    border: "1px solid rgba(139,106,41,0.45)",
                    color: "#c2b892",
                    background: "rgba(139,106,41,0.10)",
                    // The 11px readable floor it shipped with before the plaque
                    // pass shrank it; the chip may wrap rather than overflow a
                    // 232px handle, because a wound that is cut off is mute.
                    fontSize: 11,
                    lineHeight: "16px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    whiteSpace: "normal",
                    maxWidth: "100%",
                    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Chart integrity · {foldEscalation.word}
                </span>
              ) : null}
            </span>
            <span aria-hidden="true" className="wm-spine-fold-chevron">
              ▸
            </span>
          </summary>
          <div style={{ paddingTop: 6 }}>
            {/* DECISION_ID — the thing every other cell is about, with the
                canvas pill beside it. MOVED, NOT DELETED: at rest the plaque
                is the decision; the identity (or the reason there is none) is
                the first thing the fold opens onto. Same testid, same pill,
                same `verdictOwnedBySurface` handed down. */}
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
              {canvasSummaryNode && (
                <div data-testid="spine-canvas-summary" style={{ paddingTop: 2 }}>
                  {canvasSummaryNode}
                </div>
              )}
            </div>
            {nextCell}
            <div style={cellStyle}>
              <span style={LABEL}>Market</span>
              {marketValue}
            </div>
            {honestyCell}
            {riskCell}
            {whyCell}
            <div style={cellStyle}>
              {/* A two-word phrase, not a one-word cell label: it takes the
                  phrase floor (11px) rather than LABEL's 9px caps. */}
              <span style={{ ...LABEL, fontSize: 11 }}>Evidence ledger</span>
              {ladderBar}
              {ladderRoster}
            </div>
          </div>
        </details>
      )}

      {!rail && nextCell}
    </section>
  );
}

export default DecisionSpineBand;
