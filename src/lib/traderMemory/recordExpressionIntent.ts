import { projectDecision } from "./projectDecision";
import { recordDecisionIntent, type RecordIntentInput } from "./recordDecisionIntent";

/** Retry the existing authority, never create a second decision after a lost ACK. */
export async function recordExpressionIntent(input: RecordIntentInput, fetchImpl: typeof fetch, signal: AbortSignal, expectedOwnerId: string) {
  if (!expectedOwnerId.trim()) return { recorded: false, note: "Sign in before recording this intent." };
  const transport: typeof fetch = (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set("x-wm-intent-owner", expectedOwnerId);
    return fetchImpl(url, { ...init, headers, signal });
  };
  const before = await projectDecision(input.decisionId, transport, signal);
  if (signal.aborted) return { recorded: false, note: "Intent check interrupted. No confirmation is available." };
  if (before.status === "PROJECTED") {
    const matches = before.position?.intent === input.intent;
    return { recorded: matches, note: matches
      ? "Intent confirmed on the shared record. No order was sent."
      : "This decision has different intent. Review the shared record before changing it." };
  }
  if (before.status !== "NOT_RECORDED") return { recorded: false, note: before.note };
  const result = await recordDecisionIntent(input, transport);
  return { recorded: !signal.aborted && result.status === "RECORDED", note:
    !signal.aborted && result.status === "RECORDED"
      ? "Intent recorded. No order sent; no fill or protection claimed."
      : "Receipt unconfirmed. Retry checks the same decision before writing again." };
}
