/**
 * WM PRO BILLING — THE OPERATOR'S READINESS LINE (Supermax §11).
 *
 * For the deployment's owner only: which of the six setup names are present
 * (PRESENT / ABSENT — never a value, never a prefix), the standing word and
 * why, the last webhook event whose signature verified, and how many billing
 * records exist by status. A member never reads this (the route is
 * operator-only); nothing here names a member or a customer.
 *
 * PURE.
 */
import type { BillingOps } from "./billingStore";
import { BILLING_ENV_NAMES, billingStanding } from "./standing";
import { billingPriceEnvNames, tiersOnSale, type BillingEnv } from "./tiers";

export interface BillingReadiness {
  readonly mode: "NOT_CONFIGURED" | "TEST" | "LIVE";
  /** Why nothing sells, in operator words; null when selling. */
  readonly reason: string | null;
  readonly names: readonly { readonly name: string; readonly present: boolean }[];
  readonly tiersOnSale: readonly string[];
  readonly store: BillingOps["store"];
  readonly lastWebhook: { readonly at: string; readonly type: string; readonly outcome: string; readonly mode: "TEST" | "LIVE" } | null;
  readonly counts: Readonly<Record<string, number>>;
  /** One line for the glass. */
  readonly line: string;
  readonly asOf: string;
}

const REASON_WORDS: Readonly<Record<string, string>> = {
  NO_KEY: "no Stripe secret key is set",
  KEY_UNRECOGNIZED: "the Stripe secret key is not a secret or restricted key",
  LIVE_KEY_NOT_ARMED: "a LIVE key is set but live billing is not armed",
  NO_WEBHOOK_SECRET: "no webhook signing secret is set",
};

export function billingReadiness(env: BillingEnv, ops: BillingOps, nowMs: number): BillingReadiness {
  const standing = billingStanding(env);
  const names = [...BILLING_ENV_NAMES, ...billingPriceEnvNames()].map(name => ({ name, present: (env[name] ?? "").trim() !== "" }));
  const onSale = standing.mode === "NOT_CONFIGURED" ? [] : tiersOnSale(env);
  const reason = standing.mode === "NOT_CONFIGURED" ? REASON_WORDS[standing.reason] ?? "billing is not configured" : null;
  const lastWebhook = ops.lastWebhook ? { at: new Date(ops.lastWebhook.atMs).toISOString(), type: ops.lastWebhook.type, outcome: ops.lastWebhook.outcome, mode: ops.lastWebhook.livemode ? ("LIVE" as const) : ("TEST" as const) } : null;
  const total = Object.values(ops.counts).reduce((a, b) => a + b, 0);
  const countWords = total === 0 ? "no billing records" : Object.entries(ops.counts).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, n]) => `${n} ${k.replace(":", " ")}`).join(", ");
  const present = names.filter(n => n.present).length;
  const line = [
    `billing: ${standing.mode}${reason ? ` — ${reason}` : ""}`,
    `${present} of ${names.length} setup names present`,
    onSale.length ? `on sale: ${onSale.join(", ")}` : "nothing on sale",
    lastWebhook ? `last verified webhook: ${lastWebhook.type} → ${lastWebhook.outcome}` : "no verified webhook event yet",
    ops.store === "READ" ? countWords : ops.store === "NO_STORE" ? "record store not bound" : "record store unreadable",
  ].join(" · ");
  return { mode: standing.mode, reason, names, tiersOnSale: onSale, store: ops.store, lastWebhook, counts: ops.counts, line, asOf: new Date(nowMs).toISOString() };
}
