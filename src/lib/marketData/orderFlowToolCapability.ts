/**
 * WHAT AN ORDER-FLOW BUTTON IS ALLOWED TO PROMISE.
 *
 * THE DEFECT THIS EXISTS TO END. `/charts` renders six order-flow buttons —
 * Bid × Ask, Delta, Vol Profile, Imbalance, Agg/Passive, Big Trades. Every one
 * of them is drawn from the per-bar tick accumulator, and that accumulator only
 * ever counts a print that carried an AGGRESSOR SIDE:
 *
 *     bid: existing.bid + (tick.side === "sell" ? tick.size : 0),
 *     ask: existing.ask + (tick.side === "buy"  ? tick.size : 0),
 *     …
 *     seen += rt.bid + rt.ask;  if (seen > 0) return sub;   // else null
 *
 * A print with no side contributes zero to both halves, so `seen` stays 0 and
 * `getBarSubProfile` correctly returns null rather than synthesizing a
 * footprint. THE MATH IS ALREADY HONEST. The DEFECT is one level up, in the
 * chrome: the buttons know none of this. A trader clicks "Delta" on a feed that
 * publishes no aggressor side, the button lights up green and aria-pressed, and
 * the chart draws nothing. The overlay's silence is indistinguishable from
 * "delta is flat right now" — which is a reading of the market, and a false one.
 *
 * An honest refusal must say WHICH of two very different things is true:
 *
 *   NO_AGGRESSOR_TAPE  the feed will never supply this. Waiting cannot help.
 *   AWAITING_TAPE      the feed can supply it; no sided print has arrived yet.
 *
 * Collapsing those two into one grey "unavailable" is the same class of lie the
 * change cell told: a true sentence whose SCOPE is wider than the evidence.
 *
 * WHY DISCLOSURE AND NOT `disabled`. The tape arrives DURING a session. A
 * disabled button says "this tool is not for you"; it is also unreadable to a
 * screen reader's button list and untappable on a phone. What the trader needs
 * is the tool still selectable, plus a sentence naming what is missing. Being
 * armed and empty for the next ninety seconds is a legitimate state — being
 * armed and empty while SAYING NOTHING is not.
 *
 * PURE. No clock, no I/O, no React. The registry it reads is a frozen constant.
 */
import { getRuntimeTapeCapability } from "./capabilityRegistry";

export type OrderFlowToolState = "DRAWABLE" | "AWAITING_TAPE" | "NO_AGGRESSOR_TAPE";

export interface OrderFlowToolCapability {
  /** The tool this verdict is about. Carried so a caller cannot mis-file it. */
  toolId: string;
  /** True only when sided prints have ACTUALLY been observed for this feed. */
  drawable: boolean;
  state: OrderFlowToolState;
  /**
   * One sentence, already written for a human. It names the tool, names the
   * feed, and says what is missing — never a bare "unavailable", which is the
   * wording that made the two absences look like one.
   */
  reason: string;
}

export interface OrderFlowTapeEvidence {
  /** The runtime tape source id, exactly as `useWebSocket` reports it. */
  source: string | null;
  /**
   * Has a sided print actually been counted this session? This is
   * `selectAggressorFlow(...).hasFlow` — observed volume, not a capability
   * claim. A feed being ABLE to publish a side is not evidence that one arrived.
   */
  observedAggressorFlow: boolean;
}

/** A feed's own name is better evidence than "the data provider". */
function feedName(source: string | null): string {
  return source && source.trim() ? source : "no connected feed";
}

/**
 * How this feed establishes an aggressor side, in the trader's words.
 *
 * Deliberately surfaced: `TICK_RULE` is a heuristic the relay runs over
 * consecutive prints, not something the venue asserted. A tool that draws from
 * it is drawing a reconstruction. Saying so here costs one clause.
 */
function methodPhrase(method: string): string {
  if (method === "PROVIDER") return "the venue stamps the aggressor side on every print";
  if (method === "MAKER_SIDE_INVERTED") return "the aggressor side inverts deterministically from the venue's maker flag";
  if (method === "TICK_RULE") return "the aggressor side is INFERRED by tick rule, not asserted by the venue";
  if (method === "QUOTE_TEST") return "the aggressor side is INFERRED by quote test, not asserted by the venue";
  return `the aggressor side is established by ${method}`;
}

/**
 * Compile one order-flow tool's right to claim it is drawing something.
 *
 * `toolLabel` is the string ON the button. The reason must quote the label the
 * trader actually clicked, not an internal id — an explanation that names
 * "aggressive-passive" when the button says "Agg/Passive Proxy" reads as being
 * about some other thing.
 */
export function orderFlowToolCapability(
  toolId: string,
  toolLabel: string,
  evidence: OrderFlowTapeEvidence,
): OrderFlowToolCapability {
  const entry = getRuntimeTapeCapability(evidence.source);
  const feed = feedName(evidence.source);

  // Fail closed, and say which closed door it is. An unreviewed or UNAVAILABLE
  // triple is not "probably fine" — `getRuntimeTapeCapability` already returns
  // null rather than a synthesized placeholder precisely so this branch can
  // tell the truth instead of reading provenance off a fiction.
  if (entry == null || entry.availability === "UNAVAILABLE" || entry.aggressorMethod === "NONE") {
    return {
      toolId,
      drawable: false,
      state: "NO_AGGRESSOR_TAPE",
      reason:
        `${toolLabel} cannot be drawn from ${feed}: this feed publishes no per-trade aggressor side. ` +
        `Every order-flow overlay on this chart is built from sided prints, and none will be invented from ` +
        `the OHLCV bars. Waiting will not change this — a feed that carries sides is required.`,
    };
  }

  if (!evidence.observedAggressorFlow) {
    return {
      toolId,
      drawable: false,
      state: "AWAITING_TAPE",
      reason:
        `${toolLabel} has nothing to draw YET. ${feed} does carry aggressor sides — ` +
        `${methodPhrase(entry.aggressorMethod)} — but no sided print has been observed in this session so far. ` +
        `The loaded bars are historical OHLCV and carry no per-trade side. This fills in as the tape arrives.`,
    };
  }

  return {
    toolId,
    drawable: true,
    state: "DRAWABLE",
    reason:
      `${toolLabel} is drawing from sided prints observed live on ${feed}, where ` +
      `${methodPhrase(entry.aggressorMethod)}. Bars older than this session's tape stay empty — ` +
      `historical OHLCV carries no per-trade side.`,
  };
}
