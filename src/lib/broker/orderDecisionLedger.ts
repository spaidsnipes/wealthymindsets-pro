/**
 * ORDER → DECISION, for orders WM sent (Garden 18 §XC: the Journal tells one
 * story per Decision_ID). Written by the server when a broker acknowledges (or
 * may have received) a WM order; read by the journal feed to group broker
 * orders and fills under the decision they expressed. Lives in the deployment's
 * KV namespace (the WEBULL_SESSION binding, the same store as the Webull order
 * ledger). An order placed outside WM has no row and is shown as such.
 */

import type { WebullKvNamespace } from "@/lib/marketData/webullKvTokenStore";
import { WEBULL_SESSION_KV_BINDING } from "@/lib/marketData/webullSessionStore";

export interface OrderDecisionRow {
  readonly broker: "tastytrade" | "webull";
  readonly clientOrderId: string;
  readonly decisionId: string;
  readonly instrumentType: string;
  readonly symbol: string;
  readonly action: string;
  readonly qty: number;
  readonly limitPx: number | null;
  readonly accountTail: string;
  readonly sentAtMs: number;
}

const TTL_SEC = 400 * 86_400;
export const orderDecisionKey = (broker: string, clientOrderId: string) => `wm:order-decision:v1:${broker}:${clientOrderId}`;

export function orderDecisionKv(env: unknown): WebullKvNamespace | null {
  if (!env || typeof env !== "object") return null;
  const c = (env as Record<string, unknown>)[WEBULL_SESSION_KV_BINDING] as Partial<WebullKvNamespace> | undefined;
  return c && typeof c.get === "function" && typeof c.put === "function" ? (c as WebullKvNamespace) : null;
}

export async function putOrderDecision(kv: WebullKvNamespace, row: OrderDecisionRow): Promise<void> {
  await kv.put(orderDecisionKey(row.broker, row.clientOrderId), JSON.stringify(row), { expirationTtl: TTL_SEC });
}

export async function getOrderDecision(kv: WebullKvNamespace, broker: string, clientOrderId: string): Promise<OrderDecisionRow | null> {
  const raw = await kv.get(orderDecisionKey(broker, clientOrderId));
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as OrderDecisionRow;
    return typeof r?.decisionId === "string" && r.clientOrderId === clientOrderId ? r : null;
  } catch { return null; }
}
