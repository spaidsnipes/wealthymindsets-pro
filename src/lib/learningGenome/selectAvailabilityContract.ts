/**
 * selectAvailabilityContract — canon §AVAILABILITY CONTRACT
 * (Top-Down Process amendment 2026-08-25 §2).
 *
 * Canon verbatim:
 *   "Before the session, declare the time windows in which the trader
 *    can actually give execution and management full attention. A valid
 *    setup that appears outside the declared window is a TRAINING
 *    OPPORTUNITY OUTSIDE EXECUTION WINDOW, not a missed obligation.
 *    If the setup does not appear while the trader is responsibly
 *    available, NO TRADE is correct."
 *
 * This selector measures a trader's ADHERENCE to a declared
 * availability window. Given a set of trade timestamps + the day's
 * declared window(s), it counts:
 *
 *   inside_window   — trades that happened during declared availability
 *   outside_window  — trades that happened when the trader had
 *                     declared themselves not-available (canon flags
 *                     these as discipline hazards)
 *   window_declared — whether an availability window was declared at
 *                     all (a session with no declaration is honest
 *                     UNDECLARED, not zero-availability)
 *
 * Rejection guarantees:
 *  - No declared window → all trades classify as UNDECLARED
 *  - Empty trade set → zero counts + UNDECLARED / DECLARED reflects
 *    whether a window existed
 *  - Overlapping windows are unioned (any window containing the
 *    trade time = inside)
 *  - Timezone: all timestamps and window bounds are compared as
 *    millisecond epoch numbers; the caller owns TZ normalization
 */

export interface AvailabilityWindow {
  /** Millisecond epoch start (inclusive). */
  startMs: number;
  /** Millisecond epoch end (exclusive). */
  endMs: number;
}

export interface AvailabilityTrade {
  /** Millisecond epoch of the trade entry (or fill). */
  atMs: number;
}

export interface AvailabilityInput {
  windows: readonly AvailabilityWindow[];
  trades: readonly AvailabilityTrade[];
}

export type AvailabilityStatus =
  | "UNDECLARED"
  | "ALL_INSIDE"
  | "ALL_OUTSIDE"
  | "PARTIAL_OUTSIDE";

export interface AvailabilityContractResult {
  window_declared: boolean;
  inside_window: number;
  outside_window: number;
  sample_size: number;
  adherence_rate: number | undefined;
  status: AvailabilityStatus;
}

function insideAnyWindow(t: AvailabilityTrade, windows: readonly AvailabilityWindow[]): boolean {
  for (const w of windows) {
    if (t.atMs >= w.startMs && t.atMs < w.endMs) return true;
  }
  return false;
}

export function selectAvailabilityContract(
  input: AvailabilityInput,
): AvailabilityContractResult {
  const window_declared = input.windows.length > 0;
  const sample_size = input.trades.length;

  if (!window_declared) {
    return {
      window_declared: false,
      inside_window: 0,
      outside_window: 0,
      sample_size,
      adherence_rate: undefined,
      status: "UNDECLARED",
    };
  }

  let inside = 0;
  for (const t of input.trades) {
    if (insideAnyWindow(t, input.windows)) inside++;
  }
  const outside = sample_size - inside;
  const adherence_rate = sample_size === 0 ? undefined : inside / sample_size;

  let status: AvailabilityStatus;
  if (sample_size === 0 || inside === sample_size) status = "ALL_INSIDE";
  else if (outside === sample_size) status = "ALL_OUTSIDE";
  else status = "PARTIAL_OUTSIDE";

  return {
    window_declared,
    inside_window: inside,
    outside_window: outside,
    sample_size,
    adherence_rate,
    status,
  };
}
