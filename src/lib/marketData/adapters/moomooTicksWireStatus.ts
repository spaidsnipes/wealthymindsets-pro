/**
 * moomooTicksWireStatus — classify the OUTCOME of calling the moomoo-bridge
 * `/ticks` route into an HONEST, visible wire-status label.
 *
 *     Worker fetch(/ticks) ──▶ THIS classifier ──▶ Founder-visible blocker label
 *
 * WHY THIS EXISTS
 * ---------------
 * The Monday Test 2 law is explicit: the app must NEVER show "DELAYED BY
 * ENTITLEMENT" merely because a var / host / bridge / subscription / transport /
 * consumer is missing. The visible blocker must name the ACTUAL proven failure
 * class. moomoo's bridge (services/moomoo-bridge/bridge.py) emits precise edges —
 * "OpenD not reachable on …", "TICKER subscribe failed: …", "get_rt_ticker(…)
 * failed: …", HTTP 401 on a bad bearer token — and this classifier maps each of
 * those PROVEN edges onto the canonical honest vocabulary WITHOUT ever guessing
 * entitlement.
 *
 * ENTITLEMENT is the one label this module refuses to synthesize: the moomoo
 * bridge never returns an entitlement proof, so this classifier never claims one.
 * "ENTITLEMENT may be claimed only when the provider itself or an authoritative
 * capability response proves entitlement is the failed edge." (Monday Test 2)
 *
 * PURE / DETERMINISTIC. No I/O — the caller performs the fetch and hands us the
 * shape of what came back (transport outcome + parsed body + normalized count).
 */

import { normalizeMoomooTicksEnvelope, type MoomooTicksEnvelope } from "./moomooTicks";
import type { MarketDataMode } from "../marketEvent";

/**
 * The honest visible-blocker vocabulary for the moomoo tick wire. This is a
 * DISTINCT vocabulary from the frozen 7 canonical FIDELITY labels (which describe
 * the quality of a feed that IS flowing); these name WHY a feed is or isn't
 * flowing. Deliberately NOT exported as a shared/global enum — it is scoped to the
 * moomoo tick spine so it cannot fragment another thread's single-writer canon.
 */
export type MoomooTicksWireLabel =
  | "NOT CONFIGURED" // no bridge base URL / no shared secret set — transport was never attempted
  | "AUTH BLOCKED" // bridge rejected our bearer token (HTTP 401)
  | "BRIDGE UNREACHABLE" // could not reach the bridge process, or bridge could not reach OpenD
  | "SUBSCRIPTION FAILED" // TICKER subscribe / get_rt_ticker failed inside OpenD
  | "NO EVENTS RECEIVED" // bridge answered ok but returned zero usable prints
  | "STALE" // prints exist, but their provider clock is outside the current-use window
  | "RECEIVING" // real executed prints normalized into canonical TRADE events
  | "UNKNOWN"; // an unclassified edge — named honestly, never dressed up as success

/** How the caller's fetch(/ticks) resolved. The caller owns the actual I/O. */
export interface MoomooTicksProbeInput {
  /** false when no base URL / shared secret is configured → transport not attempted. */
  readonly configured: boolean;
  /** true when the HTTPS request reached the bridge at all (any status code). */
  readonly transportReached: boolean;
  /** HTTP status the bridge returned, when the request reached it. */
  readonly httpStatus?: number;
  /** Parsed JSON body from the bridge, when there was one. */
  readonly body?: MoomooTicksEnvelope;
  /** Low-level transport error message (DNS/connect/timeout), when transportReached is false. */
  readonly transportError?: string;
}

export interface MoomooTicksWireStatus {
  readonly label: MoomooTicksWireLabel;
  /** Human-readable precise reason — the bridge's own edge, verbatim where possible. */
  readonly detail: string;
  /** True ONLY when at least one real executed print normalized into a canonical event. */
  readonly receiving: boolean;
  /** Count of canonical TRADE events actually produced (0 unless receiving). */
  readonly eventCount: number;
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Classify a moomoo /ticks probe outcome into an honest wire status. Never emits
 * an entitlement claim; never reports RECEIVING without real normalized prints.
 */
export function classifyMoomooTicksOutcome(
  input: MoomooTicksProbeInput,
  appSymbol: string,
  dataMode: MarketDataMode,
  receivedAtMs: number,
  processedAtMs = Date.now(),
): MoomooTicksWireStatus {
  const none = (label: MoomooTicksWireLabel, detail: string): MoomooTicksWireStatus => ({
    label,
    detail,
    receiving: false,
    eventCount: 0,
  });

  // 1. Transport never attempted — a missing var is NOT an entitlement edge.
  if (!input.configured) {
    return none("NOT CONFIGURED", "moomoo bridge base URL or shared secret is not set");
  }

  // 2. Could not reach the bridge process at all (DNS / connect / TLS / timeout).
  if (!input.transportReached) {
    return none(
      "BRIDGE UNREACHABLE",
      input.transportError?.trim() || "moomoo bridge did not answer the request",
    );
  }

  // 3. Bridge answered — read its own honest edge.
  const status = input.httpStatus ?? 0;
  const body = input.body;
  const bridgeError = asString(body?.error).trim();

  if (status === 401) {
    return none("AUTH BLOCKED", bridgeError || "moomoo bridge rejected the bearer token");
  }

  // The bridge maps every upstream failure to HTTP 502 with a verbatim message.
  if (status === 502 || (body && body.ok !== true)) {
    const lower = bridgeError.toLowerCase();
    if (lower.includes("not reachable")) {
      return none("BRIDGE UNREACHABLE", bridgeError); // OpenD down behind a reachable bridge
    }
    if (lower.includes("subscribe failed") || lower.includes("get_rt_ticker")) {
      return none("SUBSCRIPTION FAILED", bridgeError);
    }
    return none("UNKNOWN", bridgeError || `moomoo bridge returned HTTP ${status || "?"}`);
  }

  // 4. Bridge reported ok — normalize the prints truthfully.
  const events = body
    ? normalizeMoomooTicksEnvelope(body, appSymbol, dataMode, receivedAtMs, processedAtMs)
    : [];

  if (events.length === 0) {
    // ok envelope but nothing usable — an empty tape is NOT a delayed tape.
    return none("NO EVENTS RECEIVED", "bridge returned ok but no usable executed prints");
  }

  const newestProviderTimestamp = Math.max(...events.map((event) => event.timestampProvider ?? 0));
  if (newestProviderTimestamp <= 0 || processedAtMs - newestProviderTimestamp > 30_000) {
    return none("STALE", "executed prints were observed, but the newest provider timestamp is older than 30 seconds");
  }

  return {
    label: "RECEIVING",
    detail: `${events.length} executed print${events.length === 1 ? "" : "s"} normalized from moomoo ticker`,
    receiving: true,
    eventCount: events.length,
  };
}
