/**
 * Broker Certification Harness — canon §W3.
 *
 * Founder canon (Breakthrough Night Full Helicopter Audit) §Weakness
 * Exploitation W3 verbatim:
 *   "BROKER KEYS WITHOUT COMPLETE PRODUCT LOOP → BROKER CERTIFICATION
 *    HARNESS. Certification requires auth, account discovery,
 *    capabilities, market-data/account reads, submit/cancel/replace
 *    where authorized, acknowledgement, partial/full fill, reject,
 *    disconnect, reconnect, reconciliation, idempotency, auth refresh,
 *    kill switch, journal/portfolio receipt and cross-device behavior."
 *
 * This module defines the durable 12-stage cert taxonomy, the pure
 * `computeCertificationLevel` selector that maps a per-stage pass/fail
 * report onto a certification level, and the rejection guarantees a
 * broker MUST clear before WM can display it as WRITE-eligible.
 *
 * No I/O. No real broker calls. The BrokerAdapter registry supplies
 * the health() report; a future harness runner exercises each stage
 * against a live paper account and records pass/fail here.
 */

import type { BrokerId } from "./BrokerAdapter";

/**
 * The 12 stages every broker must clear. Ordered so a failure at
 * stage N implies stages N+1..12 are BLOCKED (not FAILED — they were
 * never reachable). Canon §W3 order.
 */
export const CERT_STAGES = [
  "auth",                 // OAuth / token acquire + persist
  "account_discovery",    // listAccounts returns ≥1 canonical account
  "capabilities",         // capabilities(accountId) matches provider truth
  "read_market_data",     // per-symbol quote read succeeds
  "read_account_state",   // balance / positions / open orders read succeeds
  "submit_order",         // paper submit succeeds with canonical ack
  "acknowledgement",      // brokerOrderId present, acknowledgedAt set
  "partial_full_fill",    // fill lifecycle observed (partial OR full)
  "cancel_order",         // cancel succeeds when authorized
  "reconnect_reconcile",  // disconnect → reconnect → state matches recorded
  "auth_refresh",         // token refresh succeeds before expiry
  "journal_receipt",      // journal / portfolio pipeline receives the trade
] as const;

export type CertStage = typeof CERT_STAGES[number];

export type CertStageStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIP" | "PENDING";

export interface CertStageReport {
  stage: CertStage;
  status: CertStageStatus;
  /** Freeform diagnostic string — evidence path, error message, etc. */
  note?: string;
  /** Timestamp of the pass/fail observation (ISO string). */
  observedAt?: string;
}

/**
 * Certification level derived from the stage report set.
 * NONE          → not even auth passes; can't display connection at all.
 * READ_ONLY     → auth + account_discovery + capabilities + reads pass;
 *                 no write / no ack yet. Safe to show account state.
 * WRITE_PAPER   → submit_order + acknowledgement + fill observed on paper.
 * WRITE_LIVE    → everything through reconnect + auth_refresh + journal.
 */
export type CertLevel = "NONE" | "READ_ONLY" | "WRITE_PAPER" | "WRITE_LIVE";

export interface CertificationResult {
  brokerId: BrokerId;
  level: CertLevel;
  passedStages: readonly CertStage[];
  failedStages: readonly CertStage[];
  blockedStages: readonly CertStage[];
  pendingStages: readonly CertStage[];
  /** True when EVERY canon-required stage passed. */
  fullyCertified: boolean;
}

const READ_STAGES: readonly CertStage[] = ["auth", "account_discovery", "capabilities", "read_market_data", "read_account_state"];
const WRITE_PAPER_STAGES: readonly CertStage[] = [...READ_STAGES, "submit_order", "acknowledgement", "partial_full_fill", "cancel_order"];
const WRITE_LIVE_STAGES: readonly CertStage[] = [...WRITE_PAPER_STAGES, "reconnect_reconcile", "auth_refresh", "journal_receipt"];

function passed(reports: readonly CertStageReport[], stage: CertStage): boolean {
  return reports.find(r => r.stage === stage)?.status === "PASS";
}

/**
 * Compute the certification level from a per-stage report set. Pure.
 *
 * Canon rejection guarantee: WRITE_LIVE requires EVERY stage — a
 * broker that passes 11/12 stages is NOT WRITE_LIVE. Never round up.
 */
export function computeCertificationLevel(
  brokerId: BrokerId,
  reports: readonly CertStageReport[],
): CertificationResult {
  const passedStages = CERT_STAGES.filter(s => passed(reports, s));
  const failedStages = CERT_STAGES.filter(s => reports.find(r => r.stage === s)?.status === "FAIL");
  const blockedStages = CERT_STAGES.filter(s => reports.find(r => r.stage === s)?.status === "BLOCKED");
  const pendingStages = CERT_STAGES.filter(s => {
    const r = reports.find(x => x.stage === s);
    return !r || r.status === "PENDING";
  });

  const allWriteLive = WRITE_LIVE_STAGES.every(s => passed(reports, s));
  const allWritePaper = WRITE_PAPER_STAGES.every(s => passed(reports, s));
  const allRead = READ_STAGES.every(s => passed(reports, s));

  let level: CertLevel;
  if (allWriteLive) level = "WRITE_LIVE";
  else if (allWritePaper) level = "WRITE_PAPER";
  else if (allRead) level = "READ_ONLY";
  else level = "NONE";

  return {
    brokerId,
    level,
    passedStages,
    failedStages,
    blockedStages,
    pendingStages,
    fullyCertified: level === "WRITE_LIVE",
  };
}

/**
 * Human-readable summary of a certification result — for the /api/broker/status
 * aggregate + the future broker cert dashboard.
 */
export function certificationSummary(result: CertificationResult): string {
  const total = CERT_STAGES.length;
  const passed = result.passedStages.length;
  return `${result.level} · ${passed}/${total} stages passed`;
}
