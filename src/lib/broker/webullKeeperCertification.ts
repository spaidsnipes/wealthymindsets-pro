/**
 * WEBULL CERTIFICATION READS THE KEEPER'S RECORD — IT DOES NOT GUESS.
 *
 * `/api/broker/certification` derived every stage from `adapter.health()`,
 * which is synchronous and never probes, so `connected` was always false and
 * Webull read "NONE · 0/12 stages passed" — on 2026-09-29 00:02Z, minutes
 * after the per-request probes proved auth, 3 accounts, the entitlement
 * ladder, balances and positions. A PENDING that is actually a PASS is an
 * unknown dressed as a fact.
 *
 * The session keeper (cron, every 15 min) already signs those reads and
 * writes a durable record with `atMs` on each part. This maps that one record
 * to stages. No new prober, no new store. Perishable: a part older than
 * KEEPER_FRESH_MS is PENDING with its age named, never PASS.
 *
 * Order stages are BLOCKED, not PENDING: execution is gated by design (no
 * order is placed by WM on Webull), which is a decision, not missing work.
 *
 * PURE. DETERMINISTIC.
 */
import type { CertStageReport } from "./certification";
import type { KeeperResult } from "../marketData/webullSessionKeeper";

/** Three missed 15-minute runs plus slack. */
export const KEEPER_FRESH_MS = 35 * 60_000;

const ORDER_STAGES = ["submit_order", "acknowledgement", "partial_full_fill", "cancel_order", "journal_receipt"] as const;
const ORDER_BLOCK = "Execution is gated by design: WM places no Webull order (owner gate; order preview only).";

export function webullStagesFromKeeper(record: KeeperResult | null, nowMs: number): CertStageReport[] {
  const out: CertStageReport[] = [];
  const iso = (ms: number) => new Date(ms).toISOString();
  const age = (ms: number) => `${Math.round((nowMs - ms) / 60_000)} min old`;
  const fresh = (ms: number | undefined): ms is number => typeof ms === "number" && nowMs - ms >= 0 && nowMs - ms <= KEEPER_FRESH_MS;

  if (!record) {
    out.push({ stage: "auth", status: "PENDING", note: "No keeper record readable on this runtime — nothing observed, nothing claimed." });
  } else if (!fresh(record.atMs)) {
    out.push({ stage: "auth", status: "PENDING", note: `Keeper record is ${age(record.atMs)} — too old to certify.`, observedAt: iso(record.atMs) });
  } else if (record.outcome === "TOKEN_NOT_REQUIRED" || record.outcome === "STILL_FRESH" || record.outcome === "REFRESHED" || record.outcome === "APPROVAL_OBSERVED") {
    out.push({ stage: "auth", status: "PASS", note: `Keeper ${record.outcome}${record.authMode ? ` (${record.authMode})` : ""}.`, observedAt: iso(record.atMs) });
    // With 2FA off there is no token to refresh; a refresh that happened is a pass.
    if (record.outcome === "TOKEN_NOT_REQUIRED") out.push({ stage: "auth_refresh", status: "SKIP", note: "2FA is off: requests are signed with the key pair; there is no session to refresh.", observedAt: iso(record.atMs) });
    else if (record.outcome === "REFRESHED") out.push({ stage: "auth_refresh", status: "PASS", note: "Keeper extended the session.", observedAt: iso(record.atMs) });
  } else if (record.outcome === "NOT_CONFIGURED") {
    out.push({ stage: "auth", status: "BLOCKED", note: "App Key / App Secret are not configured on this deployment.", observedAt: iso(record.atMs) });
  } else {
    out.push({ stage: "auth", status: "FAIL", note: `Keeper ${record.outcome}.`, observedAt: iso(record.atMs) });
  }

  const b = record?.broker;
  if (b && fresh(b.atMs)) {
    out.push(b.state === "CONNECTED" && b.accountCount > 0
      ? { stage: "account_discovery", status: "PASS", note: `${b.accountCount} account(s) listed by a signed read.`, observedAt: iso(b.atMs) }
      : { stage: "account_discovery", status: "FAIL", note: `Broker lane ${b.state}, ${b.accountCount} account(s).`, observedAt: iso(b.atMs) });
  } else if (b) out.push({ stage: "account_discovery", status: "PENDING", note: `Broker read is ${age(b.atMs)}.`, observedAt: iso(b.atMs) });

  const c = record?.capabilities;
  if (c && fresh(c.atMs)) {
    // The ladder MEASURED every rung; a denied rung is a correct denial, so the stage passes.
    out.push({ stage: "capabilities", status: "PASS", note: `Entitlement ladder ${c.verdict} · stocks ${c.stocks} · crypto ${c.crypto}${c.futures ? ` · futures ${c.futures}` : ""}.`, observedAt: iso(c.atMs) });
    out.push(/OK/.test(c.stocks) || /OK/.test(c.crypto)
      ? { stage: "read_market_data", status: "PASS", note: `Signed market-data read answered (stocks ${c.stocks} · crypto ${c.crypto}).`, observedAt: iso(c.atMs) }
      : { stage: "read_market_data", status: "FAIL", note: `No market-data read answered (stocks ${c.stocks} · crypto ${c.crypto}).`, observedAt: iso(c.atMs) });
  } else if (c) out.push({ stage: "capabilities", status: "PENDING", note: `Entitlement ladder is ${age(c.atMs)}.`, observedAt: iso(c.atMs) });

  const r = record?.reconciliation;
  if (r && fresh(r.atMs)) {
    out.push(r.state === "OK"
      ? { stage: "read_account_state", status: "PASS", note: `Open orders read on ${r.accounts} account(s) (${r.openOrders} open, ${r.external} external, ${r.unresolved} unresolved; ledger ${r.ledger}).`, observedAt: iso(r.atMs) }
      : { stage: "read_account_state", status: r.state === "PARTIAL" ? "PENDING" : "FAIL", note: `Reconciliation ${r.state}${r.unreadable?.length ? ` (unread: ${r.unreadable.join(", ")})` : ""}.`, observedAt: iso(r.atMs) });
  } else if (r) out.push({ stage: "read_account_state", status: "PENDING", note: `Reconciliation is ${age(r.atMs)}.`, observedAt: iso(r.atMs) });

  for (const stage of ORDER_STAGES) out.push({ stage, status: "BLOCKED", note: ORDER_BLOCK });
  return out;
}

/** True only when the keeper's broker read is fresh and CONNECTED. */
export function webullConnectedFromKeeper(record: KeeperResult | null, nowMs: number): boolean | null {
  const b = record?.broker;
  if (!b || !(nowMs - b.atMs >= 0 && nowMs - b.atMs <= KEEPER_FRESH_MS)) return null;
  return b.state === "CONNECTED" && b.accountCount > 0;
}
