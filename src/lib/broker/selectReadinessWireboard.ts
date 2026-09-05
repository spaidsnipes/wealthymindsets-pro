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

import type { EnvNameNearMiss, ProviderReadiness, ReadinessStatus } from "./providerReadiness";

/** Shape of the JSON returned by GET /api/broker/readiness. */
export interface ReadinessPayload {
  readonly surface?: string;
  readonly summary?: string;
  readonly providers?: readonly ProviderReadiness[];
  readonly envPresence?: readonly { readonly name: string; readonly present: boolean }[];
  readonly nearMisses?: readonly EnvNameNearMiss[];
  readonly accountService?: {
    readonly configured: boolean;
    readonly missing: readonly string[];
  };
  readonly note?: string;
}

/** A blocker-class label from the Monday Test 2 acceptable set. */
export type WireboardBlockerClass = "SETUP PRESENT" | "NOT CONFIGURED";

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

/**
 * One suspected name mismatch, phrased for a human reading the wireboard.
 *
 * Deliberately NOT a verdict. The detector proves only that a host name looks
 * like a name the code reads; it cannot prove the value behind it is correct,
 * so the copy says "check", never "fix this and it works".
 */
export interface WireboardNearMiss {
  readonly expected: string;
  readonly found: string;
  /** NEAR-CERTAIN for a punctuation-only difference, LEAD for a token overlap. */
  readonly strength: "NEAR-CERTAIN" | "LEAD";
  readonly detail: string;
}

export interface ReadinessWireboard {
  readonly rows: readonly WireboardRow[];
  readonly readyCount: number;
  readonly totalCount: number;
  /** Configuration count only, not a connection or execution readiness verdict. */
  readonly summary: string;
  /** Count of env NAMES present across the whole fleet (presence-only). */
  readonly envPresentCount: number;
  readonly envTotalCount: number;
  /**
   * Host names that LOOK like a name the code reads but are not it. Empty is
   * the normal case. A non-empty list is the difference between "this needs a
   * secret" and "this secret is installed under the wrong name".
   */
  readonly nearMisses: readonly WireboardNearMiss[];
  readonly accountService: {
    readonly blockerClass: WireboardBlockerClass;
    readonly detail: string;
  };
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

function nearMissRow(h: EnvNameNearMiss): WireboardNearMiss {
  const nearCertain = h.confidence === "EXACT_MODULO_PUNCTUATION";
  return {
    expected: h.expected,
    found: h.found,
    strength: nearCertain ? "NEAR-CERTAIN" : "LEAD",
    detail: nearCertain
      ? `This runtime carries ${h.found}, which differs from ${h.expected} only in punctuation. The code reads ${h.expected} and does not fall back to ${h.found}, so the value behind it is never used.`
      : `This runtime carries ${h.found}, which shares a distinctive name part with the absent ${h.expected}. A lead worth checking, not a diagnosis.`,
  };
}

/** Build the wireboard view-model from a readiness API payload. */
export function selectReadinessWireboard(payload: ReadinessPayload | null | undefined): ReadinessWireboard {
  const providers = payload?.providers ?? [];
  const rows: WireboardRow[] = providers.map((r) => ({
    provider: r.provider,
    label: r.label,
    lane: r.lane,
    status: r.status,
    blockerClass: r.status === "READY" ? "SETUP PRESENT" : "NOT CONFIGURED",
    blockerDetail: blockerDetailFor(r),
    missing: r.missing,
    missingRecommended: r.missingRecommended,
    note: r.note,
  }));
  const readyCount = rows.filter((r) => r.status === "READY").length;
  const envPresence = payload?.envPresence ?? [];
  const accountService = payload?.accountService;
  const accountConfigured = accountService?.configured === true;
  const missingAccountConfig = accountService?.missing ?? [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
  ];
  return {
    rows,
    readyCount,
    totalCount: rows.length,
    summary: `${readyCount}/${rows.length} providers configured`,
    envPresentCount: envPresence.filter((e) => e.present).length,
    envTotalCount: envPresence.length,
    nearMisses: (payload?.nearMisses ?? []).map(nearMissRow),
    accountService: {
      blockerClass: accountConfigured ? "SETUP PRESENT" : "NOT CONFIGURED",
      detail: accountConfigured
        ? "Supabase URL and public client key are present on this runtime. Sign-in still requires a successful auth receipt."
        : `Supabase auth is NOT CONFIGURED on this runtime — missing: ${missingAccountConfig.join(", ")}.`,
    },
    empty: rows.length === 0,
  };
}
