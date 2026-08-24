/**
 * webullMarketData — Webull as an INTERNAL MARKET-DATA PROVIDER (honest stub).
 *
 * Founder War-Room §6 names Webull co-equal with moomoo for DATA capability
 * certification. Discovery truth (2026-08-21, docs/operations/
 * EVIDENCE_2026-08-21_WEBULL_MCP_VERIFIED.md): Webull's provider identity and
 * read path were VERIFIED in-session via the Webull OpenAPI MCP — but that was
 * a developer-session observation, NOT a runtime-reachable feed. No `WEBULL_*`
 * env is read by any server code; there is no deployed Webull read bridge.
 *
 * Therefore the ONLY honest runtime certification is NOT_IMPLEMENTED across
 * every capability. We deliberately do NOT upgrade a single row to ACTIVE just
 * because an MCP returned data once in a dev session — "Never call something
 * wired if it is only configured," and an out-of-band MCP probe is not even
 * configured runtime transport.
 *
 * This probe is env-driven and future-proof: when a real Webull read path is
 * deployed (a bridge URL like the moomoo pattern), this module gains a live
 * branch — but until that transport + its envelope are VERIFIED, it refuses to
 * claim anything. PURE: no I/O in the un-configured path.
 */

import {
  certifySource,
  type SourceCertification,
} from "../sourceCapabilityCertification";

export interface WebullDataConfig {
  /**
   * Optional deployed Webull read-bridge URL. Absent today (no runtime feed).
   * When a real bridge lands, wiring its VERIFIED envelope here flips the
   * relevant rows — never before.
   */
  readonly dataUrl?: string;
}

/**
 * Certify Webull's DATA capabilities honestly. With no deployed runtime read
 * path (today's reality), every capability is NOT_IMPLEMENTED and CVD is
 * UNAVAILABLE — the truthful "verified at provider, not wired in runtime" state.
 */
export async function probeWebullMarketData(
  _fetchImpl: typeof fetch,
  config: WebullDataConfig = {},
): Promise<SourceCertification> {
  void _fetchImpl;
  const source = "webull";
  const dataUrl = (config.dataUrl ?? "").replace(/\/+$/, "");

  if (!dataUrl) {
    // No runtime transport. Honest: nothing certified. A single PRICE row
    // carries the note so the fleet surface explains WHY it is not-implemented
    // (provider verified in-session via MCP, runtime read path is a future atom).
    return certifySource(source, [
      {
        capability: "PRICE",
        status: "NOT_IMPLEMENTED",
        fidelity: "NONE",
        note:
          "Webull provider identity + read path verified in-session via OpenAPI MCP " +
          "(EVIDENCE_2026-08-21_WEBULL_MCP_VERIFIED.md), but NO runtime feed is deployed. " +
          "Runtime market-data wiring is a future atom — not claimed until a real bridge + envelope are verified.",
        observedAt: new Date().toISOString(),
      },
    ]);
  }

  // A deployed bridge URL is present but its envelope is not yet verified in
  // code. Refuse to fabricate certified rows from an unverified transport.
  return certifySource(source, [
    {
      capability: "PRICE",
      status: "NOT_IMPLEMENTED",
      fidelity: "NONE",
      note:
        `Webull data bridge configured (${dataUrl}) but its response envelope is not yet ` +
        "verified in this adapter — refusing to claim capabilities from an unproven transport.",
      observedAt: new Date().toISOString(),
    },
  ]);
}
