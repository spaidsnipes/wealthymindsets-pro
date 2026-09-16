/**
 * selectHumility — the third RISK pixel, and the one the compiler protects
 * hardest.
 *
 * ── The gap ──────────────────────────────────────────────────────────────────
 *
 * `compileScene` admits `HUMILITY_PANEL` in ALL TEN scenes. It is the only
 * surface element with that property — even `MARKET_CANVAS` is unconditional
 * only by coincidence of the branches, while humility is unconditional as a
 * LAW (`compileScene.test.ts`, §14.1 LAW: no scene may withhold the admission
 * that we do not know). `SceneAdmissionPanel` has carried its human label,
 * "What we do not know", since it was written.
 *
 * On 2026-09-16 a grep for the identifier found ZERO renderers in the repo.
 * The OS stated a law that humility may never be taken away from the trader,
 * and every screen took it away.
 *
 * ── Why this is NOT the provenance chips again ───────────────────────────────
 *
 * `SceneAdmissionPanel` already reports which signal GROUPS came back
 * UNOBSERVED, and duplicating that would be INVASIVE_DUPLICATE_TRUTH. It is not
 * duplicated here; it is one of two halves, and the smaller one.
 *
 *   PROVENANCE says:  we asked, and nothing came back.
 *   HUMILITY says:    there is no one to ask, structurally, and here is what
 *                     that costs you.
 *
 * The second is the half no chip can carry, because it is not a fact about
 * this render — it is a fact about the BUILD. `/paper`'s own adapter states
 * two of them in prose that no human ever sees: the paper ledger has no
 * DECISION_ID, so "did capital move on THIS decision" cannot be established at
 * all; and §B5 makes the paper book silent about live money by construction. A
 * trader reading a confident MANAGE scene has no way to learn either.
 *
 * ── The invariant that makes this a safety surface ───────────────────────────
 *
 * The returned list is NEVER empty. An empty "what we do not know" panel is a
 * claim of omniscience, and it is the single most dangerous thing this file
 * could render — far worse than not existing, because it converts a blind spot
 * into a positive assurance. If every enumerated unknown resolves, the floor
 * item fires instead. The invariant is asserted, not just documented.
 *
 * PURE — no React, no I/O, no clock.
 */

import {
  SIGNAL_GROUPS,
  type SignalGroup,
  type SignalProvenance,
} from "./deckSceneSignals";

/**
 * Why the product cannot tell you something.
 *
 * The split is load-bearing for TONE. `UNOBSERVED` may resolve on the next
 * render — connect a broker, wait for a session. `STRUCTURAL` will not resolve
 * until someone ships something, and presenting it as though the trader's next
 * action might clear it would be a promise with no owner behind it. That is the
 * same distinction `CAPITAL_UNREAD_DETAIL` draws by refusing the future tense.
 */
export type HumilityKind = "UNOBSERVED" | "STRUCTURAL";

export interface HumilityItem {
  /** Stable key. Also what a guard test pins, so wording can change freely. */
  readonly id: string;
  /** Short read: the thing WM cannot tell you. */
  readonly title: string;
  /** One sentence naming the CONSEQUENCE, not just the gap. */
  readonly detail: string;
  readonly kind: HumilityKind;
}

/**
 * The environment the calling surface speaks for.
 *
 * Caller-owned on purpose, exactly as in `paperSceneSignals`: this module must
 * never infer an environment, because inferring one wrong is the §B5 firewall
 * breach it exists to disclose.
 */
export type HumilityEnvironment = "PAPER" | "LIVE" | "BACKTEST";

export interface HumilityInput {
  readonly provenance: Readonly<Record<SignalGroup, SignalProvenance>>;
  readonly environment: HumilityEnvironment;
  /**
   * Does a DECISION_ID scope this screen?
   *
   * When false, no episode boundary exists (§B1), so `hadCapitalEvent` and
   * `receiptWritten` are not merely unknown — they are unaskable. RECEIPT and
   * receipt-earned DONE are unreachable, and the trader is entitled to know
   * that the room cannot close a loop it never opened.
   */
  readonly decisionEpisodeIdentified: boolean;
}

/**
 * What each unobserved signal group COSTS the reader.
 *
 * Deliberately not "Position: unobserved". That sentence is already on screen
 * in the provenance chips and it tells a trader nothing they can act on. Each
 * line here names the question the screen cannot answer while that group is
 * dark, and — where the confusion is dangerous — says what the silence is NOT.
 */
const UNOBSERVED_COST: Record<SignalGroup, { title: string; detail: string }> = {
  SESSION: {
    title: "Whether this market is open",
    detail:
      "No session was established for this instrument, so nothing on this screen " +
      "should be read as live or as closed.",
  },
  DECISION: {
    title: "Whether you have right of way",
    detail:
      "The permission compiler produced no verdict here. Absence of a refusal is " +
      "not a permission.",
  },
  POSITION: {
    title: "What you are holding",
    detail:
      "No book was read for this symbol. This is not a confirmation that you are flat.",
  },
  ORDERS: {
    title: "What is working in the market",
    detail:
      "No order list was read, so WM cannot tell you whether something is queued " +
      "that would change your exposure without you acting again.",
  },
  LINK: {
    title: "Whether your last write survived",
    detail:
      "The link was not verified, so the state on this screen may already have " +
      "been superseded by another session.",
  },
};

/**
 * The floor.
 *
 * Reached when every enumerated unknown has resolved. It is not filler: WM's
 * evidence is bounded by the sources it reached, and "every source we asked
 * agreed" is a materially different claim from "this is what the market did".
 * The panel must keep saying so, or a fully-observed screen becomes the one
 * screen that claims certainty.
 */
export const HUMILITY_FLOOR: HumilityItem = {
  id: "BOUNDED_EVIDENCE",
  title: "The limits of what was reached",
  detail:
    "Every source WM could reach answered. That bounds this screen to those " +
    "sources — it does not make it complete.",
  kind: "STRUCTURAL",
};

export function selectHumility(input: HumilityInput): readonly HumilityItem[] {
  const items: HumilityItem[] = [];

  // ── 1. Structural first ─────────────────────────────────────────────────────
  // Ordered ahead of the observational gaps on purpose. A structural limit
  // frames how much the rest of the screen can ever be worth, so it must not be
  // buried under a list that shrinks as sources connect.

  if (input.environment !== "LIVE") {
    items.push({
      id: "ENVIRONMENT_FIREWALL",
      title: `This is the ${input.environment.toLowerCase()} book`,
      detail:
        `§B5 keeps environments separate. Everything here is true of ${input.environment.toLowerCase()} ` +
        `and says nothing about live capital — including the parts that look like money.`,
      kind: "STRUCTURAL",
    });
  }

  if (!input.decisionEpisodeIdentified) {
    items.push({
      id: "NO_DECISION_EPISODE",
      title: "Whether capital moved on this decision",
      detail:
        "No decision episode scopes this room, so WM cannot tell a position you " +
        "opened here from one you already held, and cannot know whether a receipt " +
        "is owed.",
      kind: "STRUCTURAL",
    });
  }

  // ── 2. Then what was asked for and did not arrive ───────────────────────────
  // Iterated over SIGNAL_GROUPS rather than Object.keys(provenance) so the
  // order is the canonical one and a caller passing a malformed record cannot
  // reorder or smuggle in a group.
  for (const group of SIGNAL_GROUPS) {
    if (input.provenance[group] === "OBSERVED") continue;
    const cost = UNOBSERVED_COST[group];
    items.push({
      id: `UNOBSERVED_${group}`,
      title: cost.title,
      detail: cost.detail,
      kind: "UNOBSERVED",
    });
  }

  // ── 3. The floor ────────────────────────────────────────────────────────────
  // See HUMILITY_FLOOR. This return can never be an empty array.
  return items.length > 0 ? items : [HUMILITY_FLOOR];
}

export default selectHumility;
