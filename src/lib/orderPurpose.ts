/**
 * §7 ORDER PURPOSE BEFORE ORDER TYPE.
 *
 * A trader does not wake up wanting a "stop-limit". They want a PURPOSE:
 * "get me in now", "exit if my thesis fails", "flatten everything".
 * Order types are the broker's vocabulary, not the human's.
 *
 * This module compiles a human purpose into a broker primitive, and — this is
 * the part that matters — REFUSES when it cannot do so honestly:
 *
 *   - broker cannot express the primitive  -> UNSUPPORTED (never substitute)
 *   - required price level missing/absurd  -> INCOMPLETE  (never fabricate)
 *   - geometry contradicts the purpose     -> REFUSED     (never mis-execute)
 *
 * The canon rule this exists to enforce: "If the broker cannot do it, say so.
 * Do not fake it." A silent downgrade of a limit to a market order is not a
 * convenience — it is an unbounded price risk the trader never accepted.
 *
 * Companion law, surfaced on every triggered primitive:
 *   TRIGGER PRICE != FILL PRICE.  MID != GUARANTEED FILL.
 */

import type { BrokerCapabilities } from "./broker/BrokerAdapter";

export type BrokerOrderType = "market" | "limit" | "stop" | "stop-limit";

export type OrderPurpose =
  | "GET_ME_IN_NOW"
  | "GET_ME_IN_DO_NOT_CHASE"
  | "WORK_FOR_A_BETTER_PRICE"
  | "EXIT_IF_THESIS_FAILS"
  | "EXIT_NOW_CERTAINTY"
  | "EXIT_WITH_PRICE_CONTROL"
  | "HARVEST_INTO_STRENGTH"
  | "FLATTEN_EVERYTHING";

export type PositionSide = "long" | "short" | "flat";

/** What the trader gives up, stated before they commit. */
export interface PurposeTradeoff {
  /** What this purpose optimises for. */
  readonly prioritises: string;
  /** What it knowingly sacrifices. Never omitted — every choice costs something. */
  readonly sacrifices: string;
}

interface PurposeSpec {
  readonly purpose: OrderPurpose;
  /** Human sentence, trader vocabulary — not broker vocabulary. */
  readonly sentence: string;
  readonly type: BrokerOrderType;
  readonly tradeoff: PurposeTradeoff;
  /** Exit purposes act against an existing position; entries open one. */
  readonly intent: "entry" | "exit";
  /** Whether a price level is structurally required. */
  readonly needsLevel: boolean;
  /** True when the primitive is trigger-based (fill price is NOT the level). */
  readonly triggered: boolean;
}

const SPECS: Readonly<Record<OrderPurpose, PurposeSpec>> = {
  GET_ME_IN_NOW: {
    purpose: "GET_ME_IN_NOW",
    sentence: "Get me in now.",
    type: "market",
    intent: "entry",
    needsLevel: false,
    triggered: false,
    tradeoff: {
      prioritises: "Certainty that you get filled",
      sacrifices: "Any control over the price you pay",
    },
  },
  GET_ME_IN_DO_NOT_CHASE: {
    purpose: "GET_ME_IN_DO_NOT_CHASE",
    sentence: "Get me in, but do not chase.",
    type: "limit",
    intent: "entry",
    needsLevel: true,
    triggered: false,
    tradeoff: {
      prioritises: "A ceiling on what you pay",
      sacrifices: "Certainty of getting in at all",
    },
  },
  WORK_FOR_A_BETTER_PRICE: {
    purpose: "WORK_FOR_A_BETTER_PRICE",
    sentence: "Work for a better price.",
    type: "limit",
    intent: "entry",
    needsLevel: true,
    triggered: false,
    tradeoff: {
      prioritises: "Entry quality",
      sacrifices: "The trade may never happen",
    },
  },
  EXIT_IF_THESIS_FAILS: {
    purpose: "EXIT_IF_THESIS_FAILS",
    sentence: "Exit if my thesis fails.",
    type: "stop",
    intent: "exit",
    needsLevel: true,
    triggered: true,
    tradeoff: {
      prioritises: "Capping the loss when you are wrong",
      sacrifices: "The exit fill can be worse than your trigger",
    },
  },
  EXIT_NOW_CERTAINTY: {
    purpose: "EXIT_NOW_CERTAINTY",
    sentence: "Get me out now.",
    type: "market",
    intent: "exit",
    needsLevel: false,
    triggered: false,
    tradeoff: {
      prioritises: "Certainty that you are out",
      sacrifices: "Any control over the exit price",
    },
  },
  EXIT_WITH_PRICE_CONTROL: {
    purpose: "EXIT_WITH_PRICE_CONTROL",
    sentence: "Get me out, but not below my price.",
    type: "limit",
    intent: "exit",
    needsLevel: true,
    triggered: false,
    tradeoff: {
      prioritises: "A floor under your exit price",
      sacrifices: "You may stay in the position",
    },
  },
  HARVEST_INTO_STRENGTH: {
    purpose: "HARVEST_INTO_STRENGTH",
    sentence: "Take profit into strength.",
    type: "limit",
    intent: "exit",
    needsLevel: true,
    triggered: false,
    tradeoff: {
      prioritises: "Selling where you planned, not where you panicked",
      sacrifices: "Upside beyond your target",
    },
  },
  FLATTEN_EVERYTHING: {
    purpose: "FLATTEN_EVERYTHING",
    sentence: "Flatten everything.",
    type: "market",
    intent: "exit",
    needsLevel: false,
    triggered: false,
    tradeoff: {
      prioritises: "Being flat, immediately",
      sacrifices: "Every dollar of price control",
    },
  },
};

export const ORDER_PURPOSES = Object.freeze(
  Object.keys(SPECS) as OrderPurpose[],
);

/** Surfaced verbatim on any trigger-based primitive. */
export const TRIGGER_NOT_FILL_WARNING =
  "TRIGGER PRICE ≠ FILL PRICE. A stop becomes a market order when it triggers; " +
  "in a fast market you can fill materially worse than your trigger.";

export interface CompileRequest {
  readonly purpose: OrderPurpose;
  readonly capabilities: BrokerCapabilities;
  /** Direction the trader wants to be in. Required for entry purposes. */
  readonly direction?: "long" | "short";
  /** Current position. Required for exit purposes — you cannot exit flat. */
  readonly positionSide?: PositionSide;
  /** Price level for purposes that need one. Never defaulted. */
  readonly level?: number;
  /** Last observed price, used only for geometry sanity. Optional. */
  readonly referencePrice?: number;
}

export interface CompiledPrimitive {
  readonly type: BrokerOrderType;
  readonly side: "buy" | "sell";
  readonly limitPx?: number;
  readonly stopPx?: number;
}

export type CompileResult =
  | {
      readonly status: "COMPILED";
      readonly purpose: OrderPurpose;
      readonly sentence: string;
      readonly primitive: CompiledPrimitive;
      readonly tradeoff: PurposeTradeoff;
      /** Non-blocking cautions the UI must render. */
      readonly warnings: readonly string[];
    }
  | {
      readonly status: "UNSUPPORTED" | "INCOMPLETE" | "REFUSED";
      readonly purpose: OrderPurpose;
      readonly sentence: string;
      readonly reason: string;
    };

function fail(
  status: "UNSUPPORTED" | "INCOMPLETE" | "REFUSED",
  spec: PurposeSpec,
  reason: string,
): CompileResult {
  return { status, purpose: spec.purpose, sentence: spec.sentence, reason };
}

/**
 * Compile a human purpose into a broker primitive, or refuse with a reason
 * the trader can act on. Never substitutes a different order type.
 */
export function compileOrderPurpose(req: CompileRequest): CompileResult {
  const spec = SPECS[req.purpose];
  if (!spec) {
    throw new Error(`Unknown order purpose: ${String(req.purpose)}`);
  }

  // 1. Broker capability. A missing primitive is a hard stop — substituting
  //    market for an unsupported stop would remove the trader's loss cap.
  if (!req.capabilities.orderTypes.includes(spec.type)) {
    return fail(
      "UNSUPPORTED",
      spec,
      `This broker does not support ${spec.type} orders, which is what ` +
        `"${spec.sentence}" requires. WM will not substitute a different ` +
        `order type on your behalf.`,
    );
  }

  // 2. Direction / position resolution.
  let side: "buy" | "sell";
  if (spec.intent === "entry") {
    if (req.direction !== "long" && req.direction !== "short") {
      return fail(
        "INCOMPLETE",
        spec,
        "No direction chosen. An entry needs long or short before it can be built.",
      );
    }
    side = req.direction === "long" ? "buy" : "sell";
  } else {
    if (req.positionSide !== "long" && req.positionSide !== "short") {
      // Exiting while flat would OPEN a position in the opposite direction.
      return fail(
        "REFUSED",
        spec,
        "There is no open position to exit. Sending this would open a NEW " +
          "position in the opposite direction, which is not what you asked for.",
      );
    }
    side = req.positionSide === "long" ? "sell" : "buy";
  }

  // 3. Level. Never invented, never defaulted to the market price.
  let level: number | undefined;
  if (spec.needsLevel) {
    if (typeof req.level !== "number" || !Number.isFinite(req.level)) {
      return fail(
        "INCOMPLETE",
        spec,
        `"${spec.sentence}" needs a price level. WM will not pick one for you ` +
          `— an invented level is an invented risk.`,
      );
    }
    if (req.level <= 0) {
      return fail(
        "INCOMPLETE",
        spec,
        `A price level of ${req.level} is not tradeable.`,
      );
    }
    level = req.level;
  }

  const warnings: string[] = [];
  const ref = req.referencePrice;
  const refUsable = typeof ref === "number" && Number.isFinite(ref) && ref > 0;

  // 4. Geometry sanity — a level on the wrong side changes what the order DOES.
  if (level !== undefined && refUsable) {
    if (spec.purpose === "EXIT_IF_THESIS_FAILS") {
      // A protective stop must sit on the losing side of the position.
      const wrongSide =
        req.positionSide === "long" ? level >= ref : level <= ref;
      if (wrongSide) {
        return fail(
          "REFUSED",
          spec,
          `A ${req.positionSide} stop at ${level} is already through the ` +
            `market at ${ref}. It would trigger immediately — that is "exit ` +
            `now", not "exit if my thesis fails". Move the stop or choose ` +
            `"Get me out now" deliberately.`,
        );
      }
    }

    if (spec.purpose === "GET_ME_IN_DO_NOT_CHASE") {
      const chasing = side === "buy" ? level >= ref : level <= ref;
      if (chasing) {
        warnings.push(
          `Your limit of ${level} is already through the market at ${ref}, so ` +
            `it will likely fill immediately — that is chasing. It still caps ` +
            `your price, but it is not the patient entry you asked for.`,
        );
      }
    }

    if (spec.purpose === "HARVEST_INTO_STRENGTH") {
      const alreadyThrough =
        req.positionSide === "long" ? level <= ref : level >= ref;
      if (alreadyThrough) {
        warnings.push(
          `Your target of ${level} is already through the market at ${ref}; ` +
            `this will fill right away rather than harvesting into strength.`,
        );
      }
    }
  }

  if (spec.triggered) {
    warnings.push(TRIGGER_NOT_FILL_WARNING);
  }

  if (level !== undefined && !refUsable) {
    warnings.push(
      "No live reference price was available, so WM could not check that your " +
        "level sits on the correct side of the market.",
    );
  }

  const primitive: CompiledPrimitive =
    spec.type === "stop"
      ? { type: spec.type, side, stopPx: level }
      : spec.type === "limit"
        ? { type: spec.type, side, limitPx: level }
        : { type: spec.type, side };

  return {
    status: "COMPILED",
    purpose: spec.purpose,
    sentence: spec.sentence,
    primitive,
    tradeoff: spec.tradeoff,
    warnings,
  };
}

/** Purposes this broker can actually honour — for building an honest menu. */
export function supportedPurposes(
  capabilities: BrokerCapabilities,
): readonly OrderPurpose[] {
  return ORDER_PURPOSES.filter((p) =>
    capabilities.orderTypes.includes(SPECS[p].type),
  );
}

/** The human sentence for a purpose. */
export function purposeSentence(purpose: OrderPurpose): string {
  return SPECS[purpose].sentence;
}

/** The tradeoff a purpose carries, for pre-commit disclosure. */
export function purposeTradeoff(purpose: OrderPurpose): PurposeTradeoff {
  return SPECS[purpose].tradeoff;
}

/* ------------------------------------------------------------------ */
/* Order-ticket level resolution                                       */
/* ------------------------------------------------------------------ */

/**
 * Real defect (2026-09-03), /paper Order Ticket:
 *
 *   limitPx: type==="limit" ? +limitPx||px : undefined
 *   stopPx:  type==="stop"  ? +stopPx ||px : undefined
 *
 * `+""` is 0, which is falsy, so a BLANK field fell through to `px` — the
 * current market price. A trader who chose "limit" precisely to control their
 * price, and left the box empty, silently got an order priced at the market.
 * The same path swallowed a typed `0` and any unparseable text (`+"abc"` is
 * NaN, also falsy).
 *
 * On the stop side it was worse than a lost limit: a protective stop placed AT
 * the market triggers immediately, converting "protect me if I'm wrong" into
 * an instant market exit.
 *
 * A level is a risk decision. The software does not get to make it.
 */
export interface TicketLevelIssue {
  readonly field: "limit" | "stop";
  readonly reason: string;
}

export type TicketLevels =
  | { readonly ok: true; readonly limitPx?: number; readonly stopPx?: number }
  | { readonly ok: false; readonly issues: readonly TicketLevelIssue[] };

export interface TicketLevelInput {
  readonly type: BrokerOrderType;
  readonly side: "buy" | "sell";
  readonly limitRaw: string;
  readonly stopRaw: string;
  /** Last observed price. Used only to detect an instantly-triggering stop. */
  readonly referencePrice?: number;
}

function parseLevel(
  raw: string,
  field: "limit" | "stop",
): { value: number } | { issue: TicketLevelIssue } {
  const label = field === "limit" ? "limit" : "stop";
  if (raw.trim() === "") {
    return {
      issue: {
        field,
        reason: `Enter a ${label} price. WM will not fill this in with the market price for you.`,
      },
    };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { issue: { field, reason: `"${raw}" is not a usable ${label} price.` } };
  }
  if (n <= 0) {
    return { issue: { field, reason: `A ${label} price of ${n} is not tradeable.` } };
  }
  return { value: n };
}

/**
 * Resolve the price levels an order ticket needs, or report every reason it
 * cannot. Never substitutes the market price for a missing level.
 */
export function validateTicketLevels(input: TicketLevelInput): TicketLevels {
  const needsLimit = input.type === "limit" || input.type === "stop-limit";
  const needsStop = input.type === "stop" || input.type === "stop-limit";

  const issues: TicketLevelIssue[] = [];
  let limitPx: number | undefined;
  let stopPx: number | undefined;

  if (needsLimit) {
    const r = parseLevel(input.limitRaw, "limit");
    if ("issue" in r) issues.push(r.issue);
    else limitPx = r.value;
  }

  if (needsStop) {
    const r = parseLevel(input.stopRaw, "stop");
    if ("issue" in r) issues.push(r.issue);
    else stopPx = r.value;
  }

  // A stop on the wrong side of the market fires the moment it is accepted.
  // A sell stop protects below; a buy stop breaks out above.
  const ref = input.referencePrice;
  if (
    stopPx !== undefined &&
    typeof ref === "number" &&
    Number.isFinite(ref) &&
    ref > 0
  ) {
    const instant = input.side === "sell" ? stopPx >= ref : stopPx <= ref;
    if (instant) {
      issues.push({
        field: "stop",
        reason:
          `A ${input.side} stop at ${stopPx} is already through the market at ` +
          `${ref}, so it would trigger immediately as a market order. ` +
          `Move the stop, or place a market order deliberately.`,
      });
    }
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, limitPx, stopPx };
}
