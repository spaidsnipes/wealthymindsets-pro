/**
 * webullTicksWireStatus — turn the Webull tick snapshot's OWN state into the
 * receipt shape the Founder-visible provider strip reads.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE MEASURED ASYMMETRY (2026-09-11)
 *
 * `ProviderWireStrip` lists five providers in one visually uniform row and
 * proves them to two different depths:
 *
 *   moomoo      live /ticks receipt — "am I receiving prints right now?"
 *   longbridge  live /ticks receipt — same question
 *   webull      capability matrix only — "is the config/entitlement plausible?"
 *
 * `readProviderReceipt` was typed `"moomoo" | "longbridge"`. Webull has shipped
 * an authenticated `/api/market-data/webull/ticks` route the whole time; the
 * strip simply never asked it.
 *
 * That is the PROVIDER HEALTH LAW inverted. The law says never collapse
 * "connected" into "healthy"; here the strip collapses "unequal evidence" into
 * "equal presentation". A reader scanning the row has no way to see that one
 * chip means a print arrived and another means a credential name exists.
 *
 * It matters most for THIS provider. `capabilityRegistry` records webull as the
 * only equity trade source with `aggressorMethod: "PROVIDER"` — the one feed
 * that can sign buy/sell, which is what CVD rests on. The provider whose
 * liveness carries the most weight was the one proven the least.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY THIS IS A MAPPING AND NOT A CLASSIFIER
 *
 * `classifyMoomooTicksOutcome` has to INFER an edge, because the moomoo bridge
 * reports failures as HTTP 502 with a prose message and the honest label has to
 * be recovered from that prose. Webull needs none of that: the adapter that
 * made the call already publishes a precise `state` union, and it is the owner
 * of that judgement. So this module translates vocabulary and refuses to
 * second-guess it. Inventing a parallel opinion here would be a second answer
 * to a question that already has one.
 *
 * Two rules it will not break, matching the moomoo spine exactly:
 *   · ENTITLEMENT is only ever claimed when the provider proved entitlement was
 *     the failed edge — never synthesized from a missing var or a silent feed.
 *   · `receiving` is true ONLY with at least one real print. An OBSERVED state
 *     carrying an empty tick array is NO EVENTS RECEIVED, not success.
 *
 * PURE / DETERMINISTIC. No I/O.
 */

import type { WebullTickSnapshotResult } from "./webullMarketData";

/**
 * Scoped to the webull tick spine, deliberately not a shared global enum — the
 * same containment decision `MoomooTicksWireLabel` documents, for the same
 * reason: one provider's vocabulary must not fragment another's canon.
 */
export type WebullTicksWireLabel =
  | "NOT CONFIGURED"
  | "AUTH BLOCKED"
  | "ENTITLEMENT BLOCKED"
  | "ACCESS UNPROVEN"
  | "RATE LIMITED"
  | "PROVIDER ERROR"
  | "NO EVENTS RECEIVED"
  | "STALE"
  | "RECEIVING"
  | "UNKNOWN";

export interface WebullTicksWireStatus {
  readonly label: WebullTicksWireLabel;
  readonly detail: string;
  /** True ONLY when at least one real executed print was observed. */
  readonly receiving: boolean;
  readonly eventCount: number;
}

/**
 * Every state the adapter can report, mapped to the visible vocabulary.
 *
 * Written as a total record rather than a switch with a default, so adding a
 * state to `WebullTickSnapshotResult["state"]` fails the typecheck HERE instead
 * of silently arriving on the Founder's screen as "UNKNOWN". A default arm
 * would have made a new provider edge indistinguishable from an unclassified
 * one — the same "absent looks decided" shape this file exists to remove.
 */
const STATE_LABELS: Record<WebullTickSnapshotResult["state"], WebullTicksWireLabel> = {
  OBSERVED: "RECEIVING",
  UNCONFIGURED: "NOT CONFIGURED",
  BLOCKED_AUTH: "AUTH BLOCKED",
  BLOCKED_ENTITLEMENT: "ENTITLEMENT BLOCKED",
  ACCESS_UNPROVEN: "ACCESS UNPROVEN",
  RATE_LIMITED: "RATE LIMITED",
  PROVIDER_ERROR: "PROVIDER ERROR",
  NO_EVENTS: "NO EVENTS RECEIVED",
  STALE: "STALE",
  CLOCK_INVALID: "UNKNOWN",
  TIMEOUT: "PROVIDER ERROR",
  UNAVAILABLE: "UNKNOWN",
};

export function classifyWebullTickSnapshot(
  snapshot: WebullTickSnapshotResult,
): WebullTicksWireStatus {
  const eventCount = snapshot.ticks.length;
  const detail = snapshot.note?.trim() || `Webull reported ${snapshot.state}.`;
  const label = STATE_LABELS[snapshot.state] ?? "UNKNOWN";

  // OBSERVED with nothing observed is the one state that must not pass through
  // its own name. The adapter reports what the CALL did; a call that succeeded
  // and returned an empty tape has not proven a wire, and a strip that shows
  // RECEIVING beside a zero would be the exact beautiful lie this spine bans.
  if (label === "RECEIVING" && eventCount === 0) {
    return {
      label: "NO EVENTS RECEIVED",
      detail: "Webull answered the bounded tick request but returned no usable executed prints.",
      receiving: false,
      eventCount: 0,
    };
  }

  if (label !== "RECEIVING") {
    return { label, detail, receiving: false, eventCount: 0 };
  }

  return {
    label: "RECEIVING",
    detail: `${eventCount} symbol-matched Webull executed print${eventCount === 1 ? "" : "s"} observed · bounded snapshot, streaming continuity not certified.`,
    receiving: true,
    eventCount,
  };
}
