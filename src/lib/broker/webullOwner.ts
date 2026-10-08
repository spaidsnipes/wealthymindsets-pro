/**
 * WHO MAY USE THE PLATFORM'S WEBULL CREDENTIALS — GP12 §15.
 *
 * The App Key / App Secret on this deployment are bound to ONE person's Webull
 * accounts (the Founder's). Any route that reads those accounts — positions,
 * balances, order preview, order placement — is therefore reading HIS money,
 * and "the caller is signed in to WM Pro" is not the same fact as "the caller
 * owns those accounts". User A must never inherit User B's accounts.
 *
 * The owner is named by `WEBULL_OWNER_USER_ID` (a WM user id, not a
 * credential), the same pattern the Alpaca routes use with
 * `ALPACA_OWNER_USER_ID`.
 *
 * ONE POSTURE: FAIL CLOSED (Garden 16 §35, 2026-09-26). No owner named → no
 * one. The TRANSITIONAL posture that let any signed-in user read positions,
 * status and the 2FA door while the owner was unset is retired: "unknown
 * broker/account owner: FAIL CLOSED. Never expose one user's brokerage truth
 * to another signed-in user. Never hard-code Founder identity as a shortcut."
 * The glass states the gap (BROKER_OWNER_NOT_CONFIGURED); the fix is setting
 * WEBULL_OWNER_USER_ID on the deployment, never a code default.
 */

export type WebullOwnerGate =
  | { readonly allowed: true; readonly state: "OWNER" }
  | { readonly allowed: false; readonly state: "NOT_OWNER" | "NOT_CONFIGURED" };

export function webullOwnerGate(
  userId: string,
  env: Readonly<Record<string, string | undefined>>,
): WebullOwnerGate {
  const owner = env.WEBULL_OWNER_USER_ID?.trim();
  if (!owner) return { allowed: false, state: "NOT_CONFIGURED" };
  return userId === owner ? { allowed: true, state: "OWNER" } : { allowed: false, state: "NOT_OWNER" };
}

export function webullOwnerRefusal(gate: WebullOwnerGate) {
  return {
    error:
      gate.state === "NOT_CONFIGURED"
        ? "The Webull accounts on this deployment have no named owner, so no one may reach them through this route."
        : "These Webull accounts belong to another user.",
    code: gate.state === "NOT_CONFIGURED" ? "BROKER_OWNER_NOT_CONFIGURED" : "BROKER_ACCOUNT_NOT_AUTHORIZED",
  } as const;
}
