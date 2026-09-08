"use client";

/**
 * "IS THIS ON MY OTHER DEVICES?" — the trader asks, the account answers.
 *
 * `projectDecision` shipped in 8ab142d as an ORPHANED INTERNAL WIRE: a reader
 * with no consumer, declared as such in the screen-reach ledger rather than
 * discovered later. This is the consumer. Wiring it is what deletes that
 * ledger line, and the ledger's reciprocal Sentinel fails the suite until it
 * is deleted.
 *
 * ── WHY THE TRADER ASKS INSTEAD OF WM POLLING ────────────────────────────────
 *
 * The blotter renders N orders. If every row projected on mount, opening the
 * tab would fire N requests at the shared authority, and this path does not go
 * through `quoteRequestCoalescer` — the exact duplicate-subscription shape
 * this repo has already fixed three times elsewhere. One question, asked by a
 * human who wants the answer, is both cheaper and more honest: WM is not
 * claiming continuous knowledge it does not maintain.
 *
 * ── THE FOUR ANSWERS ARE NOT THREE ───────────────────────────────────────────
 *
 * NOT_RECORDED and UNVERIFIED look similar and mean opposite things. The first
 * says WM looked and there was nothing — act on it. The second says WM could
 * not look — do not act on it either way. §9 gives them different colours and
 * both get a WORD, never a bare tint: watch/amber for a real finding about
 * absence, warn/red for unverified.
 *
 * IDLE CLAIMS NOTHING. Before the trader asks, this renders a question, not a
 * status. A surface that showed "—" or a grey dot before asking would be
 * reporting a state it has not observed (§14.1).
 *
 * NO GREEN SHIELD ON SUCCESS (§9). A projected decision is stated in plain
 * text. Certainty that goes up when nothing was verified is the failure mode
 * this whole subsystem exists to prevent.
 */

import { useState } from "react";
import { WM } from "@/lib/design/wmTokens";
import { projectDecision, type DecisionProjection } from "@/lib/traderMemory/projectDecision";

/** Asking, or the answer. `null` means the trader has not asked yet. */
type ReachState = { phase: "IDLE" } | { phase: "ASKING" } | { phase: "ANSWERED"; answer: DecisionProjection };

export interface DecisionReachCheckProps {
  /**
   * Absent for orders placed before decision identity existed, and for orders
   * whose mint failed. Both are disclosed rather than hidden — a row with no
   * control at all would read as "nothing to ask here".
   */
  readonly decisionId?: string;
  /** Injected in tests so no Sentinel touches the network. */
  readonly project?: typeof projectDecision;
}

export function DecisionReachCheck({ decisionId, project = projectDecision }: DecisionReachCheckProps) {
  const [state, setState] = useState<ReachState>({ phase: "IDLE" });

  if (decisionId === undefined || decisionId.trim() === "") {
    return (
      <p role="note" className="px-3 pb-2 text-[10px] leading-relaxed"
        style={{ color: WM.state.neutral }}>
        This order has no shared identity, so there is nothing your other
        devices can be asked about.
      </p>
    );
  }

  if (state.phase === "IDLE") {
    return (
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => {
            setState({ phase: "ASKING" });
            void project(decisionId).then((answer) => setState({ phase: "ANSWERED", answer }));
          }}
          className="text-[10px] underline underline-offset-2 hover:opacity-80 transition-opacity"
          style={{ color: WM.state.neutral }}
        >
          Is this on my other devices?
        </button>
      </div>
    );
  }

  if (state.phase === "ASKING") {
    // "Asking" is not an answer and must not be dressed as one.
    return (
      <p role="status" className="px-3 pb-2 text-[10px]" style={{ color: WM.state.neutral }}>
        Asking your account…
      </p>
    );
  }

  const { answer } = state;
  return (
    <p role="status" className="px-3 pb-2 text-[10px] leading-relaxed"
      style={{ color: toneFor(answer.status) }}>
      <span className="font-black uppercase tracking-wider mr-1.5">
        {WORD[answer.status]}
      </span>
      {answer.note}
    </p>
  );
}

/**
 * §9: every state carries a WORD. Colour alone may never be the message —
 * a trader who cannot distinguish these two ambers is entitled to the same
 * information as one who can.
 */
export const WORD: Record<DecisionProjection["status"], string> = {
  PROJECTED: "On your account",
  NOT_RECORDED: "Not on your account",
  UNVERIFIED: "Could not check",
  SIGNED_OUT: "Not signed in",
};

/**
 * Exported, with `WORD`, so the Sentinels can assert the real mapping rather
 * than grep for it. These two are the trader-facing contract of this file —
 * what he reads and what colour it is — so they are not private detail.
 */
export function toneFor(status: DecisionProjection["status"]): string {
  // NO GREEN on success (§9). A projected decision reads as ordinary text.
  if (status === "PROJECTED") return WM.state.neutral;
  // A real finding about absence — the trader can act on this.
  if (status === "NOT_RECORDED") return WM.state.watch;
  // Unverified. §9 gives this red-plus-word, and it must NOT share a colour
  // with NOT_RECORDED: "I looked and it is not there" and "I could not look"
  // lead to opposite actions.
  if (status === "UNVERIFIED") return WM.state.warn;
  return WM.state.neutral;
}
