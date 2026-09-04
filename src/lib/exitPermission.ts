/**
 * BUILD ORDER §14.6 — "Nectar being down cannot block a flatten."
 *
 * The generalised law, because the defect is not specific to Nectar: NO
 * auxiliary dependency — market memory, quotes, analytics, account/buying-power
 * — may remove the trader's ability to REDUCE risk. Degradation is allowed to
 * take away the ability to ADD risk. It is never allowed to take away the exit.
 *
 * This is §9 applied to a control rather than to a label: "a failure may reduce
 * capability, it may not increase certainty" — and the capability it may never
 * reduce is getting out.
 *
 * The live defect this was written against, in AlpacaTradingPanel.tsx:
 *
 *     disabled={orderStatus === "submitting" || !account}
 *
 * `account` is null whenever the ACCOUNT BALANCE fetch fails. So a failure on a
 * read-only, informational endpoint greyed out the entire order form — SELL
 * included. A trader holding a losing position during a data outage could watch
 * it move against them behind a disabled button. Nothing about a failed balance
 * lookup makes it unsafe to close a position you already hold.
 *
 * A pure SELECTOR. Per §15 it owns no state and is not a second order store; it
 * answers one question about inputs the caller already has.
 */

export type OrderSide = "buy" | "sell";

export type RiskEffect =
  /** Moves the position toward flat, and no further. */
  | "REDUCES_RISK"
  /** Opens or grows exposure — including an order that crosses through flat. */
  | "INCREASES_RISK"
  /** The book is unknown, so which of the two this is cannot be determined. */
  | "UNKNOWN_EFFECT";

export interface ExitPermissionInput {
  readonly side: OrderSide;
  readonly qty: number;
  /**
   * Signed net quantity held in this symbol. Positive long, negative short.
   * `null` means the book is UNKNOWN — which per §14.1 is not the same as zero
   * and must never be coerced to it.
   */
  readonly heldQty: number | null;
  /**
   * True only when account / buying-power data was actually observed. A failed
   * or unparseable account response is `false`, never an optimistic `true`.
   */
  readonly accountObserved: boolean;
  /** Degraded dependencies, named so the disclosure can be specific. */
  readonly degraded?: readonly string[];
  /**
   * A submit is already in flight. This is a single-flight guard, not a data
   * outage, and it is the ONLY reason an exit may be temporarily unavailable.
   */
  readonly inFlight?: boolean;
}

export interface ExitPermission {
  readonly allowed: boolean;
  readonly effect: RiskEffect;
  /**
   * The largest quantity on this side that would only reduce risk.
   * `null` when the book is unknown, `0` when nothing is held to close.
   */
  readonly riskReducingQty: number | null;
  /** Why it is refused. `null` whenever `allowed` is true. */
  readonly reason: string | null;
  /**
   * What the trader must be told when the order is allowed but something the
   * screen would normally rely on is missing. `null` when nothing is degraded.
   */
  readonly disclosure: string | null;
}

/**
 * The sentence the surface renders when it lets an exit through under
 * degradation. Exported so the UI and the tests cannot drift apart.
 */
export const EXIT_NEVER_BLOCKED_NOTE =
  "Closing a position is never blocked by unavailable data.";

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * How much of this order merely walks the position back toward flat.
 * Returns null when the book is unknown — the honest answer, not zero.
 */
function riskReducingCapacity(side: OrderSide, heldQty: number | null): number | null {
  if (!finite(heldQty)) return null;
  if (heldQty > 0 && side === "sell") return heldQty;
  if (heldQty < 0 && side === "buy") return -heldQty;
  return 0;
}

export function selectExitPermission(input: ExitPermissionInput): ExitPermission {
  const degraded = input.degraded ?? [];
  const capacity = riskReducingCapacity(input.side, input.heldQty);

  const effect: RiskEffect =
    capacity === null
      ? "UNKNOWN_EFFECT"
      : // An order LARGER than the position does not just close it; it crosses
        // through flat and opens the other way. That surplus is new risk, so
        // the order as a whole adds risk even though part of it reduces.
        capacity > 0 && finite(input.qty) && input.qty <= capacity
        ? "REDUCES_RISK"
        : "INCREASES_RISK";

  const deny = (reason: string): ExitPermission => ({
    allowed: false,
    effect,
    riskReducingQty: capacity,
    reason,
    disclosure: null,
  });

  const allow = (disclosure: string | null): ExitPermission => ({
    allowed: true,
    effect,
    riskReducingQty: capacity,
    reason: null,
    disclosure,
  });

  if (input.inFlight) {
    return deny("An order is already being submitted. Wait for it to settle.");
  }
  if (!finite(input.qty) || input.qty <= 0) {
    return deny("Enter a quantity greater than zero.");
  }

  const degradedNote =
    degraded.length > 0
      ? `${degraded.join(", ")} unavailable. ${EXIT_NEVER_BLOCKED_NOTE}`
      : null;

  // §14.6 — the exit goes through. Always. No dependency gets a vote here.
  if (effect === "REDUCES_RISK") return allow(degradedNote);

  if (effect === "UNKNOWN_EFFECT") {
    // We cannot tell an exit from an entry, so refusing would sometimes trap a
    // trader in a live position — and that is the failure with no backstop. An
    // unfunded ENTRY, by contrast, is refused by the broker itself. Between a
    // screen that wrongly blocks and a broker that correctly rejects, the
    // broker is the safer place for the refusal to happen.
    const unknownBook =
      "Your position could not be confirmed, so this order cannot be confirmed to reduce risk.";
    return allow(degradedNote ? `${unknownBook} ${degradedNote}` : unknownBook);
  }

  // Adding risk is the one thing a degraded screen may legitimately withhold:
  // it cannot show that the account can fund it.
  if (!input.accountObserved) {
    const base =
      "Buying power is unknown, so an order that adds risk cannot be shown as funded.";
    return deny(
      capacity !== null && capacity > 0
        ? `${base} You can still close up to ${capacity}.`
        : base,
    );
  }

  return allow(degradedNote);
}
