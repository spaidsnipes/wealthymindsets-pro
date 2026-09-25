/**
 * selectWaitPlaque — the WAIT organism's words, in the canon's voice.
 *
 * ── The canon, read side by side with the glass (2026-09-25) ────────────────
 *
 *   H-101  "EVIDENCE DEBT — WAIT IS A FINISHED ORGANISM": a brass WAIT tag
 *          LIVES ON THE EVENT candle with a leader; the market stays alive;
 *          "GO circuit is dark while debt is open"; asOf STAMP REQUIRED; WAIT
 *          is a complete decision state, not a spinner or a modal; same
 *          Decision_ID; the WAIT ROOM is a demolition zone.
 *   F05A   right panel: one large serif WAIT, a ⚖, and "STAY DISCIPLINED.
 *          CLARITY PRECEDES ENTRY." Nothing else.
 *   F06A   one WAIT plaque, one reason ("ABSORPTION IN PROGRESS · LET
 *          STRUCTURE FINISH"), a glyph; context panels only beneath it.
 *   P110   one WAIT plaque: "LET STRUCTURE DEVELOP".
 *
 * MEASURED on serving /charts, desktop, the same afternoon: the rail drew FOUR
 * stacked cards at rest — DECISION · NOT BORN + a dotted pill; NOW · STATE ·
 * WAIT · 2 TO RESOLVE · SESSION ?; RISK · WHY · DETAIL › with an integrity
 * chip; NEXT · Resolve available R + PERMISSION WITHHELD. No plaque, no reason
 * in the canon's voice, nothing on the chart at the event.
 *
 * ── WHAT THIS MODULE IS NOT ─────────────────────────────────────────────────
 *
 * It is NOT a second decision owner. It computes no verdict, no debt, no
 * standing and no permission. The word is `decision.value` VERBATIM — the
 * compiled Right-of-Way reading from `computeRightOfWay` — and the standing is
 * `selectWaitStanding`'s, called, never re-derived. What this module owns is
 * exactly one thing: which already-compiled fact the plaque's ONE sentence is
 * about, and how that fact is said in the room's voice.
 *
 * ── NEVER INVENTED ──────────────────────────────────────────────────────────
 *
 * Every sentence below is keyed on a fact an owner already published:
 *
 *   WORKABLE      → the FIRST PAYABLE node in the roll, i.e. the very node
 *                   `selectOneNextThing` names under NEXT ("Resolve available
 *                   R"). The plaque and NEXT cannot name different nodes: both
 *                   read the ledger's own chain order, and a test pins it.
 *   VENUE_BLOCKED → the first venue-blocked node.
 *   FINISHED      → the first outstanding COMPOSITION, which resolves only
 *                   when its own inputs do — "let structure develop" is the
 *                   literal meaning of that, not a mood.
 *
 * "ABSORPTION IN PROGRESS" (F06A) is deliberately NOT in this vocabulary. No
 * owner reachable from the decision rail publishes an absorption reading, and
 * printing the phrase because a mockup shows it would be design theater — the
 * LIVING-PIXEL LAW forbids exactly that. When an absorption owner is handed to
 * the rail, that sentence gets a row here keyed on it, and not before.
 *
 * Pure / deterministic. No clock, no I/O.
 */

import type {
  EvidenceDebt,
  EvidenceRollEntry,
  RightOfWay,
  RightOfWayReading,
  RightOfWayTone,
} from "./decisionPermissionCompiler";
import { selectWaitStanding, type WaitStanding } from "./selectWaitStanding";
import type { AggressorFlowSnapshot, AggressorProvenance } from "../selectAggressorFlow";

/** Why the sentence says what it says. Published on the plaque for inspection. */
export type WaitPlaqueBasis =
  /** WAIT, workable: the first node something can pay now. */
  | "FIRST_PAYABLE"
  /** WAIT, blocked: the first node this venue does not publish. */
  | "VENUE_BLOCKED"
  /** WAIT, finished: only compositions remain. */
  | "COMPOSITIONS_ONLY"
  /** WAIT, finished: the ledger is clear and permission is still withheld. */
  | "LEDGER_CLEAR"
  /** WAIT with no ledger compiled — the plaque says so rather than guess. */
  | "NO_LEDGER"
  /** NO TRADE — a hard rule. */
  | "RULE"
  /** CAUTION — flagged evidence. */
  | "FLAGGED"
  /** UNKNOWN — required evidence not evaluated. */
  | "UNEVALUATED"
  /** ACTION — evidence paid; the intent circuit is not measured on this rail. */
  | "PAID";

export interface WaitPlaqueVM {
  /** The compiled verdict, VERBATIM. Never composed here. */
  readonly word: RightOfWay;
  readonly tone: RightOfWayTone;
  /** ONE sentence in the room's voice. Uppercase, one line of meaning. */
  readonly reason: string;
  readonly basis: WaitPlaqueBasis;
  /** The ledger node the sentence is about, verbatim, or null. */
  readonly node: string | null;
  /** WAIT's own standing, from `selectWaitStanding` — null for other verdicts. */
  readonly standing: WaitStanding | null;
}

/**
 * THE ROOM'S VOICE FOR A PAYABLE NODE, keyed on the chain's own node keys
 * (`selectDecisionChain`). A key this record does not know falls back to the
 * node's own label — the owed fact is still named, only less beautifully.
 */
const PAYABLE_VOICE: Readonly<Record<string, string>> = Object.freeze({
  direction: "DIRECTION UNRESOLVED · LET STRUCTURE DEVELOP",
  location: "LOCATION UNRESOLVED · LET STRUCTURE DEVELOP",
  aggression: "AGGRESSION UNREAD · LET FLOW DECLARE ITSELF",
  // Available R is paid by a DECLARED entry and a DECLARED invalidation —
  // both human acts. F05A's own line is the honest instruction.
  risk: "RISK NOT DECLARED · CLARITY PRECEDES ENTRY",
  permission: "NO RULES SUPPLIED · CLARITY PRECEDES ENTRY",
});

/**
 * THE ROOM'S VOICE FOR A COMPOSITION — a node that mints nothing and clears
 * only when its inputs do. P110's plate, verbatim, for the structural ones.
 */
const COMPOSITION_VOICE: Readonly<Record<string, string>> = Object.freeze({
  regime: "LET STRUCTURE DEVELOP",
  auction: "LET STRUCTURE DEVELOP",
  clc: "LET STRUCTURE DEVELOP",
  // Management is a readout of the trade phase: with no position there is no
  // structure left to wait on — only the discipline F05A names.
  management: "STAY DISCIPLINED · CLARITY PRECEDES ENTRY",
});

function upper(label: string): string {
  return label.trim().toUpperCase();
}

function payableSentence(key: string | null, label: string): string {
  if (key && Object.prototype.hasOwnProperty.call(PAYABLE_VOICE, key)) return PAYABLE_VOICE[key];
  return `${upper(label)} OWED · CLARITY PRECEDES ENTRY`;
}

function firstIn(
  roll: readonly EvidenceRollEntry[] | undefined,
  pick: (e: EvidenceRollEntry) => boolean,
): EvidenceRollEntry | null {
  if (!roll) return null;
  for (const e of roll) if (pick(e)) return e;
  return null;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * The plaque's word and its one sentence. Null only when nothing was compiled
 * at all — a plaque over no verdict would be a picture of a decision.
 */
export function selectWaitPlaque(
  decision: RightOfWayReading | null | undefined,
  debt: EvidenceDebt | null | undefined,
): WaitPlaqueVM | null {
  if (!decision) return null;
  const base = { word: decision.value, tone: decision.tone } as const;

  switch (decision.value) {
    case "WAIT": {
      // THE STANDING HAS ONE OWNER. Called, never re-derived: a plaque that
      // recomputed `missingPayable > 0` would be a second answer to the
      // question the WAIT standing line already answers.
      const standing = selectWaitStanding(decision, debt ?? null);
      if (!standing || !debt) {
        return { ...base, reason: "NO LEDGER EXPLAINS THIS WAIT", basis: "NO_LEDGER", node: null, standing: null };
      }
      if (standing.standing === "WORKABLE") {
        // The roll carries keys; the label sample is the fallback for a debt
        // built without one. Both are in chain order, so they name the same
        // node `selectOneNextThing` names.
        const entry = firstIn(debt.roll, (e) => e.standing === "MISSING" && e.payableNow);
        const label = entry?.label ?? debt.missingPayableLabels[0] ?? null;
        if (label === null) {
          return {
            ...base,
            reason: `${standing.payable} ${plural(standing.payable, "CONDITION", "CONDITIONS")} OWED · CLARITY PRECEDES ENTRY`,
            basis: "FIRST_PAYABLE",
            node: null,
            standing: standing.standing,
          };
        }
        return {
          ...base,
          reason: payableSentence(entry?.key ?? null, label),
          basis: "FIRST_PAYABLE",
          node: label,
          standing: standing.standing,
        };
      }
      if (standing.standing === "VENUE_BLOCKED") {
        const entry = firstIn(debt.roll, (e) => e.standing === "MISSING" && e.venueBlocked);
        const label = entry?.label ?? debt.venueBlockedLabels?.[0] ?? null;
        return {
          ...base,
          reason: label ? `THIS FEED CANNOT SUPPLY ${upper(label)}` : "THIS FEED CANNOT SUPPLY WHAT IS OWED",
          basis: "VENUE_BLOCKED",
          node: label,
          standing: standing.standing,
        };
      }
      // FINISHED.
      if (debt.missing > 0) {
        const entry = firstIn(debt.roll, (e) => e.standing === "MISSING" && !e.payableNow && !e.venueBlocked);
        const key = entry?.key ?? null;
        const reason =
          key && Object.prototype.hasOwnProperty.call(COMPOSITION_VOICE, key)
            ? COMPOSITION_VOICE[key]
            : "LET STRUCTURE DEVELOP";
        return { ...base, reason, basis: "COMPOSITIONS_ONLY", node: entry?.label ?? null, standing: standing.standing };
      }
      return {
        ...base,
        reason: "LEDGER CLEAR · STAY DISCIPLINED",
        basis: "LEDGER_CLEAR",
        node: null,
        standing: standing.standing,
      };
    }
    case "NO TRADE":
      return { ...base, reason: "A HARD RULE IS ENGAGED · WAIT FOR ITS RELEASE", basis: "RULE", node: null, standing: null };
    case "CAUTION":
      return { ...base, reason: "EVIDENCE FLAGGED · RE-READ BEFORE ENTRY", basis: "FLAGGED", node: null, standing: null };
    case "UNKNOWN":
      return { ...base, reason: "REQUIRED EVIDENCE NOT EVALUATED", basis: "UNEVALUATED", node: null, standing: null };
    case "ACTION":
      // PAID IS NOT RIPE. This rail holds no broker owner, so the intent
      // circuit of GO is unmeasured (see selectGoInterlock) — the plaque must
      // never read as a green light.
      return { ...base, reason: "EVIDENCE PAID · PERMISSION NOT EVALUATED", basis: "PAID", node: null, standing: null };
  }
}

/**
 * H-101 · THE DEBT TAG — "lives on the event".
 *
 * The tag is the SAME plaque word, on the chart, attached by a leader to the
 * bar the ledger was read at. That bar is not chosen here: it is
 * `canonicalState.lastBar` — the newest PROVABLY CLOSED bar, produced only by
 * `deriveLastBarClose` from the loaded candles, in the very snapshot the
 * decision chain and its evidence debt were compiled from (one store, one
 * identity). The debt is a reading OF that bar; that is the event it lives on.
 *
 * Refusals, each a way the tag could lie:
 *   · not WAIT              → no tag. H-101 is the WAIT organism; other verdicts
 *                             have no debt tag in the canon.
 *   · no open debt          → no tag. "GO circuit is dark while debt is open";
 *                             with nothing open there is no debt to tag.
 *   · no event bar          → no tag. Guessing "the newest candle" would put the
 *                             tag on a bar the ledger never read.
 *   · a replay camera walks → no tag. The ledger is about the live snapshot, and
 *                             pinning it onto a replayed frame would date a live
 *                             reading to history (companion-camera law).
 */
export interface DebtTagVM {
  /** The compiled verdict word, verbatim — always "WAIT" when a tag exists. */
  readonly word: RightOfWay;
  /** The event bar's open time in epoch SECONDS (the chart's own time unit). */
  readonly barTimeSec: number;
  /** The canonical capture instant — the tag's asOf, never a render clock. */
  readonly asOfMs: number | null;
  /** Outstanding nodes, from the ledger's authoritative count. */
  readonly owed: number;
}

export interface DebtTagInput {
  readonly decision: RightOfWayReading | null | undefined;
  readonly debt: EvidenceDebt | null | undefined;
  /** `canonicalState.lastBar.barOpenedAtMs`, or null when no bar has provably closed. */
  readonly eventBarOpenedAtMs: number | null | undefined;
  readonly capturedAt: number | null | undefined;
  readonly replayEngaged: boolean;
}

export function selectDebtTag(input: DebtTagInput): DebtTagVM | null {
  const { decision, debt, eventBarOpenedAtMs, capturedAt, replayEngaged } = input;
  if (replayEngaged) return null;
  if (!decision || decision.value !== "WAIT") return null;
  if (!debt || !(debt.missing > 0)) return null;
  if (typeof eventBarOpenedAtMs !== "number" || !Number.isFinite(eventBarOpenedAtMs) || eventBarOpenedAtMs <= 0) {
    return null;
  }
  return {
    word: decision.value,
    barTimeSec: Math.round(eventBarOpenedAtMs / 1000),
    asOfMs: typeof capturedAt === "number" && Number.isFinite(capturedAt) && capturedAt > 0 ? capturedAt : null,
    owed: debt.missing,
  };
}

/**
 * F06A · ORDER FLOW CONTEXT — the one panel the plate allows beneath the WAIT
 * plaque, and only where an owner has a lawful reading.
 *
 * F06A draws "BID STACK 72% / ASK STACK 28%". Those are BOOK stacks, and no
 * book reaches this room ("PULLED refused (no book)" is the liquidity layer's
 * own receipt), so the stack words are refused. What the room DOES own is the
 * per-trade tape's aggressor split — `selectAggressorFlow`, which the fidelity
 * chip already reads — so the panel says exactly that: aggressor BUY (lifted
 * the ask) against aggressor SELL (hit the bid), as shares of the tape's
 * sided volume, WITH its provenance, because the owner's contract is that a
 * display layer MUST disclose anything that is not venue-stamped.
 *
 * Refusals: no flow observed → null (an empty 50/50 bar would claim balance);
 * the tape does not yet belong to this symbol (the transition render) → null.
 * The replay camera is handled by the rail, which already withholds every
 * live claim while a camera walks history.
 */
export interface PlaqueFlowContextVM {
  /** Aggressor-buy share of sided tape volume, whole percent. */
  readonly buyPct: number;
  /** 100 − buyPct, so the two can never disagree about the whole. */
  readonly sellPct: number;
  readonly provenance: AggressorProvenance;
  /** How the sides are known, in words — printed, never hovered. */
  readonly basis: string;
}

const FLOW_BASIS: Readonly<Record<AggressorProvenance, string>> = Object.freeze({
  PROVIDER: "VENUE-STAMPED SIDES",
  INFERRED: "TICK-RULE SIDES · INFERRED",
  MIXED: "MIXED SIDE METHODS",
  UNDISCLOSED: "SIDE METHOD UNDISCLOSED",
});

export function selectPlaqueFlowContext(
  snap: AggressorFlowSnapshot | null | undefined,
  opts: { readonly symbolOwnsTape: boolean },
): PlaqueFlowContextVM | null {
  if (!opts.symbolOwnsTape) return null;
  if (!snap || !snap.hasFlow) return null;
  const total = snap.askVol + snap.bidVol;
  if (!(total > 0) || !Number.isFinite(total)) return null;
  const buyPct = Math.round((snap.askVol / total) * 100);
  return { buyPct, sellPct: 100 - buyPct, provenance: snap.provenance, basis: FLOW_BASIS[snap.provenance] };
}

export default selectWaitPlaque;
