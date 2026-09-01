/**
 * selectReadinessWireboard — pure presentation selector that turns the
 * /api/broker/readiness receipt into founder-visible wireboard rows.
 *
 * Monday Test 2 (2026-08-31) LOCAL WIREBOARD target: "one truthful
 * development readiness projection where an authorized developer can
 * inspect, without seeing secret values … This is observability, not a
 * second authority source."
 *
 * Honesty guarantees encoded here:
 *  - The visible blocker names the ACTUAL proven edge — the exact missing
 *    config NAME(s) — never "DELAYED BY ENTITLEMENT". Presence-only truth:
 *    a missing var is `NOT CONFIGURED`, never an entitlement claim.
 *  - READY means "credentials to ATTEMPT a connection are present" — it is
 *    strictly weaker than connected/certified and is labelled as such.
 *  - No secret VALUE ever flows through here; the input is presence booleans
 *    and variable NAMES only.
 *
 * Pure/deterministic: no clock, no I/O. The API payload is passed in so the
 * selector is totally testable.
 */

import type { ProviderReadiness, ReadinessStatus } from "./providerReadiness";

/** Shape of the JSON returned by GET /api/broker/readiness. */
export interface ReadinessPayload {
  readonly surface?: string;
  readonly summary?: string;
  readonly providers?: readonly ProviderReadiness[];
  readonly envPresence?: readonly { readonly name: string; readonly present: boolean }[];
  readonly note?: string;
}

/** A blocker-class label from the Monday Test 2 acceptable set. */
export type WireboardBlockerClass = "READY" | "NOT CONFIGURED";

export interface WireboardRow {
  readonly provider: string;
  readonly label: string;
  readonly lane: string;
  readonly status: ReadinessStatus;
  /**
   * The honest, proven blocker class. Presence-only readiness can only ever
   * prove READY or NOT CONFIGURED (missing required var) — it deliberately
   * never claims AUTH BLOCKED / ENTITLEMENT / BRIDGE UNREACHABLE, which need
   * a live probe the certification harness owns.
   */
  readonly blockerClass: WireboardBlockerClass;
  /** One-line human blocker sentence, naming the missing var(s) exactly. */
  readonly blockerDetail: string;
  readonly missing: readonly string[];
  readonly missingRecommended: readonly string[];
  readonly note: string;
}

export interface ReadinessWireboard {
  readonly rows: readonly WireboardRow[];
  readonly readyCount: number;
  readonly totalCount: number;
  /** "1/6 providers READY" — safe, value-free headline. */
  readonly summary: string;
  /** Count of env NAMES present across the whole fleet (presence-only). */
  readonly envPresentCount: number;
  readonly envTotalCount: number;
  /** True when the payload had no providers (endpoint empty / not reachable). */
  readonly empty: boolean;
}

function blockerDetailFor(r: ProviderReadiness): string {
  if (r.status === "READY") {
    const gaps = r.missingRecommended.length > 0
      ? ` Fidelity gap — recommended not set: ${r.missingRecommended.join(", ")}.`
      : "";
    return `Credentials present — ready to attempt a connection (not yet connected or certified).${gaps}`;
  }
  const names = r.missing.join(", ");
  return `NOT CONFIGURED — missing required ${r.missing.length === 1 ? "variable" : "variables"}: ${names}.`;
}

/** Build the wireboard view-model from a readiness API payload. */
export function selectReadinessWireboard(payload: ReadinessPayload | null | undefined): ReadinessWireboard {
  const providers = payload?.providers ?? [];
  const rows: WireboardRow[] = providers.map((r) => ({
    provider: r.provider,
    label: r.label,
    lane: r.lane,
    status: r.status,
    blockerClass: r.status === "READY" ? "READY" : "NOT CONFIGURED",
    blockerDetail: blockerDetailFor(r),
    missing: r.missing,
    missingRecommended: r.missingRecommended,
    note: r.note,
  }));
  const readyCount = rows.filter((r) => r.status === "READY").length;
  const envPresence = payload?.envPresence ?? [];
  return {
    rows,
    readyCount,
    totalCount: rows.length,
    summary: `${readyCount}/${rows.length} providers READY`,
    envPresentCount: envPresence.filter((e) => e.present).length,
    envTotalCount: envPresence.length,
    empty: rows.length === 0,
  };
}
