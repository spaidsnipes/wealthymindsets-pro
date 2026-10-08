/**
 * RAIL SEND GATE — may this rail's send control be pressed at all? (Garden 19 Sheriff P0, 2026-10-08). PURE.
 *
 * Found on glass: the Alpaca paper drawer said "Paper account not connected" while an ENABLED green
 * "BUY 1 SPY — MARKET" sat above the only refusal. The law: a rail that is not connected has its send
 * control DISABLED, with the reason AT the control, in member words (never an env file or a key name).
 *
 *   CHECKING            — the account read has not answered yet: nothing is sent on a guess.
 *   NOT_CONNECTED       — the server refused the account for this member, or no account came back.
 *   DISCONNECTED_BY_YOU — the member disconnected this rail on this device.
 *   UNVERIFIED          — connected, but the latest account read failed (timeout, 5xx, bad shape). The
 *                         send gate does not decide this one: §14.6's exit permission does — it may
 *                         withhold ADDING risk, never the exit.
 *   CONNECTED           — the account was read.
 */

export type RailState = "CHECKING" | "NOT_CONNECTED" | "DISCONNECTED_BY_YOU" | "UNVERIFIED" | "CONNECTED";
export const RAIL_STATES: readonly RailState[] = ["CHECKING", "NOT_CONNECTED", "DISCONNECTED_BY_YOU", "UNVERIFIED", "CONNECTED"];

export interface RailSendGate {
  /** False = the send control is disabled, whatever else the ticket says. */
  readonly canSend: boolean;
  /** Said at the control when it is disabled. Member words only. */
  readonly reason: string | null;
}

export function railSendGate(state: RailState, railName: string): RailSendGate {
  switch (state) {
    case "CHECKING": return { canSend: false, reason: `Checking your ${railName} account — nothing can be sent until it answers.` };
    case "NOT_CONNECTED": return { canSend: false, reason: `${railName} account not connected — nothing can be sent or closed here.` };
    case "DISCONNECTED_BY_YOU": return { canSend: false, reason: `You disconnected ${railName} on this device — reconnect it to send.` };
    case "UNVERIFIED": return { canSend: true, reason: null };
    case "CONNECTED": return { canSend: true, reason: null };
  }
}

/** The Alpaca paper drawer's rail state from what its reads produced. */
export function alpacaRailState(x: {
  readonly loading: boolean;
  readonly disconnected: boolean;
  readonly refused: boolean;
  readonly error: boolean;
  readonly accountObserved: boolean;
}): RailState {
  if (x.disconnected) return "DISCONNECTED_BY_YOU";
  if (x.loading) return "CHECKING";
  if (x.refused) return "NOT_CONNECTED";
  if (x.accountObserved) return "CONNECTED";
  if (x.error) return "UNVERIFIED";
  return "NOT_CONNECTED";   // no account, no error: nothing to send to
}
