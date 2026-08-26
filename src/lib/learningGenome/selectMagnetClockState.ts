/**
 * selectMagnetClockState — canon §5 MAGNET CLOCK / PATH QUALITY (LAB)
 * (Top-Down Process amendment 2026-08-25 §5).
 *
 * Canon verbatim:
 *   "For retained market-memory destinations, support explainable
 *    lifecycle language without fake countdown precision:
 *    DORMANT → AWAKENING → PULLING → APPROACHING → TAPPED
 *          → REJECTED / ACCEPTED / CONSUMED.
 *    This state must derive from actual evidence such as structure
 *    progression, value/profile migration, participation, displacement/
 *    consequence, aggression→response, CLC and obstacle/path
 *    conditions. It is never a timer predicting exactly when a level
 *    will hit."
 *
 * Deterministic state machine over an ordered sequence of evidence
 * observations. Input is a monotonic list of state transitions the
 * trader has recorded; output is the CURRENT lifecycle state plus a
 * validity check that transitions honored the canon graph.
 *
 * Canonical transitions (LAB):
 *   DORMANT     → AWAKENING
 *   AWAKENING   → PULLING | DORMANT (regression allowed)
 *   PULLING     → APPROACHING | DORMANT
 *   APPROACHING → TAPPED | DORMANT
 *   TAPPED      → REJECTED | ACCEPTED | CONSUMED
 *   REJECTED    → DORMANT (destination inert until re-awakened)
 *   ACCEPTED    → (terminal within this session; may spawn a new object)
 *   CONSUMED    → (terminal)
 *
 * Rejection guarantees:
 *  - Empty transitions → current: DORMANT (canon default lifecycle)
 *  - Any transition not in the canon graph → invalid=true with the
 *    offending step reported (canon: no fake state jumps)
 *  - Terminal states (ACCEPTED / CONSUMED) reject further transitions
 */

export type MagnetState =
  | "DORMANT"
  | "AWAKENING"
  | "PULLING"
  | "APPROACHING"
  | "TAPPED"
  | "REJECTED"
  | "ACCEPTED"
  | "CONSUMED";

const ALLOWED_TRANSITIONS: Record<MagnetState, readonly MagnetState[]> = {
  DORMANT: ["AWAKENING"],
  AWAKENING: ["PULLING", "DORMANT"],
  PULLING: ["APPROACHING", "DORMANT"],
  APPROACHING: ["TAPPED", "DORMANT"],
  TAPPED: ["REJECTED", "ACCEPTED", "CONSUMED"],
  REJECTED: ["DORMANT"],
  ACCEPTED: [],
  CONSUMED: [],
};

export interface MagnetClockInput {
  /**
   * Chronological transitions the trader recorded. Each entry is
   * the STATE THE MAGNET ENTERED AT THIS EVIDENCE POINT. Start of
   * lifecycle (before any observation) is DORMANT.
   */
  transitions: readonly MagnetState[];
}

export interface MagnetClockResult {
  current: MagnetState;
  valid: boolean;
  invalid_step: {
    index: number;
    from: MagnetState;
    to: MagnetState;
  } | null;
  history: readonly MagnetState[];
  canon: string;
}

export function selectMagnetClockState(
  input: MagnetClockInput,
): MagnetClockResult {
  const history: MagnetState[] = ["DORMANT"];
  let current: MagnetState = "DORMANT";

  for (let i = 0; i < input.transitions.length; i++) {
    const to = input.transitions[i]!;
    const allowed: readonly MagnetState[] = ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(to)) {
      return {
        current,
        valid: false,
        invalid_step: { index: i, from: current, to },
        history,
        canon: `§5 MAGNET CLOCK — invalid transition ${current} → ${to} at step ${i}`,
      };
    }
    current = to;
    history.push(current);
  }

  return {
    current,
    valid: true,
    invalid_step: null,
    history,
    canon: `§5 MAGNET CLOCK — current lifecycle: ${current}`,
  };
}
