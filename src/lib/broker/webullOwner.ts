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
 * Two postures, chosen per route by the caller:
 *   - "STRICT"      — no owner configured → nobody. Used for anything that can
 *                     reach an order path (preview, place, cancel).
 *   - "TRANSITIONAL" — no owner configured → allowed, but the verdict SAYS
 *                     NOT_CONFIGURED so the surface can state the gap. Used only
 *                     for the read routes that were live before this gate
 *                     existed, so adding it does not blank the Founder's glass
 *                     before he has set the owner. Once the owner is set, both
 *                     postures are identical.
 */

export type WebullOwnerGate =
  | { readonly allowed: true; readonly state: "OWNER" | "NOT_CONFIGURED" }
  | { readonly allowed: false; readonly state: "NOT_OWNER" | "NOT_CONFIGURED" };

export function webullOwnerGate(
  userId: string,
  env: Readonly<Record<string, string | undefined>>,
  posture: "STRICT" | "TRANSITIONAL",
): WebullOwnerGate {
  const owner = env.WEBULL_OWNER_USER_ID?.trim();
  if (!owner) {
    return posture === "STRICT"
      ? { allowed: false, state: "NOT_CONFIGURED" }
      : { allowed: true, state: "NOT_CONFIGURED" };
  }
  return userId === owner ? { allowed: true, state: "OWNER" } : { allowed: false, state: "NOT_OWNER" };
}

export function webullOwnerRefusal(gate: WebullOwnerGate) {
  return {
    error:
      gate.state === "NOT_CONFIGURED"
        ? "The Webull accounts on this deployment have no named owner (WEBULL_OWNER_USER_ID), so no one may reach them through this route."
        : "These Webull accounts belong to another user.",
    code: gate.state === "NOT_CONFIGURED" ? "BROKER_OWNER_NOT_CONFIGURED" : "BROKER_ACCOUNT_NOT_AUTHORIZED",
  } as const;
}
