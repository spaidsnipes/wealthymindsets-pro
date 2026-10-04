/**
 * guest audit 2026-10-04: the owner-only broker gates (webullOwner.ts,
 * brokerOwner.ts, alpacaSafety.ts) refuse a signed-in non-owner with HTTP 403
 * and one of these codes — and no `state`. Clients read that as "no broker is
 * connected for you", never as a fault to fix or an enum to print.
 */
export const OWNER_REFUSAL_CODES = ["BROKER_ACCOUNT_NOT_AUTHORIZED", "BROKER_OWNER_NOT_CONFIGURED"] as const;

export function isOwnerRefusal(body: unknown, status?: number): boolean {
  if (status !== undefined && status !== 403) return false;
  const code = body && typeof body === "object" ? (body as { code?: unknown }).code : undefined;
  return typeof code === "string" && (OWNER_REFUSAL_CODES as readonly string[]).includes(code);
}

/** guest audit 2026-10-04: the one sentence a guest sees in place of a tastytrade live/dry-run refusal. */
export const TASTYTRADE_NOT_AVAILABLE = "Live tastytrade orders aren't available on your account.";

const PLAIN_ANSWER: Readonly<Record<string, string>> = {
  NOT_CONFIGURED: "This broker isn't connected yet.",
  NOT_AUTHORIZED: "This broker account isn't available on your account.",
  NO_SUCH_ACCOUNT: "That account isn't on this broker connection — choose another.",
  ACCOUNTS_UNAVAILABLE: "The broker didn't list your accounts just now.",
  REFUSED_LOCAL: "WM didn't send this — the order isn't complete yet.",
  BAD_REQUEST: "The order wasn't complete.",
  REJECTED: "The broker declined it.",
  DRY_RUN_FAILED: "The broker declined the dry run.",
  NO_ANSWER: "The broker didn't answer.",
  CONNECTION_FAILED: "WM couldn't reach the broker.",
  NOT_SENT: "Nothing was sent.",
  ALREADY_SENT: "This order was already sent, so it wasn't sent again.",
  ACKNOWLEDGED: "The broker received the order.",
  RECONCILED: "The broker has this order.",
  UNKNOWN: "Not confirmed yet.",
  CANCEL_FAILED: "The cancel didn't go through.",
  AWAITING_2FA: "Waiting for the Webull sign-in code.",
  NO_SESSION: "Webull isn't signed in right now.",
};

/**
 * A broker answer's state as a plain sentence. Unknown states fall back to
 * readable words, never a SHOUTED_ENUM; callers keep the raw state in a
 * data-state attribute for tests and support.
 */
export function plainBrokerAnswer(state: string): string {
  const known = PLAIN_ANSWER[state];
  if (known) return known;
  const words = state.replace(/_/g, " ").toLowerCase();
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}.` : "No answer came back.";
}
