/**
 * WHOSE tastytrade a market-data request speaks for (MEMBER-BROKER-CONNECT.md §3.6):
 *
 *   owner                → the deployment's env credentials (unchanged)
 *   member with a grant  → that member's OWN decrypted grant, read scope
 *   anyone else          → the same owner refusal as before (403), and the
 *                          browser keeps its public fallback feeds
 *
 * The user id is always the server-verified session subject. The Founder's
 * credentials never serve a member: the member branch builds its lane from the
 * member's grant only and never reads TASTYTRADE_* env.
 */
import { tastytradeOwnerGate, type BrokerOwnerGate } from "./brokerOwner";
import {
  grantStoreAvailability,
  memberGrantKvFrom,
  readMemberGrant,
  type GrantStoreAvailability,
  type MemberGrantKv,
} from "./memberGrants";
import { memberTastyLane, type TastyLane } from "@/lib/tastytrade";

export type TastyLaneResolution =
  | { readonly kind: "OWNER" }
  | { readonly kind: "MEMBER"; readonly lane: TastyLane }
  | { readonly kind: "REFUSED"; readonly gate: Extract<BrokerOwnerGate, { allowed: false }> };

export async function workerKv(): Promise<MemberGrantKv | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return memberGrantKvFrom(getCloudflareContext().env);
  } catch {
    return null;
  }
}

/** The grant store for this runtime: the env secret + the Worker's KV binding. */
export async function memberGrantStore(
  env: Readonly<Record<string, string | undefined>> = process.env,
  loadKv: () => Promise<MemberGrantKv | null> = workerKv,
): Promise<GrantStoreAvailability> {
  return grantStoreAvailability(env, await loadKv());
}

export async function resolveTastyLane(
  userId: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
  loadKv: () => Promise<MemberGrantKv | null> = workerKv,
): Promise<TastyLaneResolution> {
  const owner = tastytradeOwnerGate(userId, env);
  if (owner.allowed) return { kind: "OWNER" };
  const store = await memberGrantStore(env, loadKv);
  if (!store.enabled) return { kind: "REFUSED", gate: owner };
  const grant = await readMemberGrant(store, "tastytrade", userId);
  if (grant.state !== "OK") return { kind: "REFUSED", gate: owner };
  return { kind: "MEMBER", lane: memberTastyLane(userId, grant.secrets) };
}
