/**
 * THE FOUNDER'S BROKER ACCOUNTS HAVE ONE NAMED OWNER — Garden 16 §35 /
 * Garden 18 §LXXIII, every broker, not only Webull.
 *
 * tastytrade's routes were `requireAuth` only: the moment its refresh token
 * landed, any signed-in WM user could have read the Founder's tastytrade
 * accounts, positions and data. One gate, fail closed: an explicit
 * TASTYTRADE_OWNER_USER_ID if ever set, else the Founder's WEBULL_OWNER_USER_ID
 * (the same person owns both connections on this deployment).
 */
export type BrokerOwnerGate = { readonly allowed: true; readonly state: "OWNER" } | { readonly allowed: false; readonly state: "NOT_CONFIGURED" | "NOT_OWNER" };

export function tastytradeOwnerGate(userId: string, env: Readonly<Record<string, string | undefined>>): BrokerOwnerGate {
  const owner = (env.TASTYTRADE_OWNER_USER_ID ?? env.WEBULL_OWNER_USER_ID)?.trim();
  if (!owner) return { allowed: false, state: "NOT_CONFIGURED" };
  return userId === owner ? { allowed: true, state: "OWNER" } : { allowed: false, state: "NOT_OWNER" };
}

export function brokerOwnerRefusal(gate: BrokerOwnerGate) {
  return {
    error: gate.state === "NOT_CONFIGURED"
      ? "These broker accounts have no named owner on this deployment, so no one may reach them."
      : "These broker accounts belong to another user.",
    code: gate.state === "NOT_CONFIGURED" ? "BROKER_OWNER_NOT_CONFIGURED" : "BROKER_ACCOUNT_NOT_AUTHORIZED",
  } as const;
}
