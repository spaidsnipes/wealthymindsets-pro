"use client";

import * as React from "react";
import Link from "next/link";
import type { SourceCertification } from "@/lib/marketData/sourceCapabilityCertification";
import type { AthosCapabilityMatrix } from "@/lib/marketData/canonicalCapabilityResolver";
import { readClassifiedJsonReceipt, readJsonReceipt } from "@/lib/marketData/readJsonReceipt";
import { WIRE_PROOF_SYMBOL, withWireProofScope } from "@/lib/marketData/wireProofScope";
import {
  selectReadinessWireboard,
  type ReadinessPayload,
} from "@/lib/broker/selectReadinessWireboard";

type WireTone = "LIVE" | "LIMITED" | "BLOCKED" | "OFFLINE" | "CHECKING" | "SUSPENDED";

export interface ProviderWireView {
  readonly source: string;
  readonly tone: WireTone;
  readonly label: string;
  readonly detail: string;
  /**
   * TRUE only where the producing branch KNOWS it obtained no measurement at
   * all — no accepted row, no rejected row, nothing returned. This is the
   * §14.1 distinction made machine-readable: an absence that is a DEFAULT
   * (nothing was measured) versus an absence that is a FINDING (something was
   * measured and refused). Only the former may be contradicted by a witness.
   *
   * It is a FIELD rather than a label test because labels are display strings
   * and reusing a display string as control flow is the exact defect this file
   * already records at `receiptAffirmsTicks` — renaming a chip would silently
   * change which claims a witness is allowed to overrule.
   */
  readonly evidenceless?: boolean;
}

type BrokerStatus = {
  configured?: boolean;
  connected?: boolean;
  quotes?: boolean;
  realTime?: boolean | null;
  note?: string;
  sourceName?: string;
};

export type MoomooTickReceipt = {
  readonly label?: string;
  readonly detail?: string;
  readonly receiving?: boolean;
  readonly eventCount?: number;
};

/**
 * Does this receipt affirm that prints arrived?
 *
 * Derived from the RECEIPT, not from a display string. `longbridgeTickWireView`
 * and `webullTickWireView` used to re-detect this by comparing the composed
 * view's label to the literal `"Ticks receiving"`, so the rendered chip text
 * was load-bearing control flow — renaming the chip would have silently
 * switched both providers onto their fallback detail.
 */
function receiptIsReceiving(receipt: MoomooTickReceipt): boolean {
  return (
    (receipt.label?.trim().toUpperCase() || "UNKNOWN") === "RECEIVING" &&
    receipt.receiving === true &&
    (receipt.eventCount ?? 0) > 0
  );
}

export function moomooTickWireView(receipt: MoomooTickReceipt): ProviderWireView {
  const label = receipt.label?.trim().toUpperCase() || "UNKNOWN";
  const detail = receipt.detail?.trim() || "The tick receipt did not identify a provider state.";
  if (receiptIsReceiving(receipt)) {
    return {
      source: "moomoo",
      tone: "LIMITED",
      // The chip names the instrument it proved. "Ticks receiving" alone is a
      // claim about the WIRE; the probe only ever asked about one US equity.
      label: `Ticks receiving (${WIRE_PROOF_SYMBOL})`,
      detail: withWireProofScope(
        `${receipt.eventCount} accepted provider ${receipt.eventCount === 1 ? "event" : "events"} · real-time entitlement not certified`,
      ),
    };
  }
  if (label === "NOT CONFIGURED") {
    return { source: "moomoo", tone: "OFFLINE", label: "Not configured", detail };
  }
  if (label === "AUTH BLOCKED" || label === "ACCESS UNPROVEN" || label === "BRIDGE UNREACHABLE" || label === "SUBSCRIPTION FAILED") {
    return { source: "moomoo", tone: "BLOCKED", label, detail };
  }
  if (label === "PROVIDER ERROR") {
    return { source: "moomoo", tone: "OFFLINE", label: "Provider error", detail };
  }
  if (label === "NO EVENTS RECEIVED" || label === "STALE" || label === "RECONNECTING") {
    return { source: "moomoo", tone: "LIMITED", label, detail };
  }
  if (label === "RATE LIMITED") {
    return { source: "moomoo", tone: "LIMITED", label: "Rate limited", detail };
  }
  return { source: "moomoo", tone: "OFFLINE", label: "Unknown", detail };
}

/**
 * Providers proven by a LIVE tick receipt rather than by the capability matrix
 * alone. Named here so the set is one declaration the Sentinel can read,
 * instead of a union repeated at each call site — which is how webull came to
 * have a shipping `/ticks` route that this strip never asked.
 */
export type TickReceiptSource = "moomoo" | "longbridge" | "webull";

export const TICK_RECEIPT_SOURCES: readonly TickReceiptSource[] = ["moomoo", "longbridge", "webull"];

const PROVIDER_DISPLAY_NAMES: Record<TickReceiptSource, string> = {
  moomoo: "Moomoo",
  longbridge: "Longbridge",
  webull: "Webull",
};

export function classifyProviderReceiptFailure(
  status: number,
  source: TickReceiptSource,
): MoomooTickReceipt {
  const name = PROVIDER_DISPLAY_NAMES[source];
  if (status === 401) {
    return {
      label: "AUTH BLOCKED",
      detail: `The authenticated ${name} tick route returned HTTP 401.`,
      receiving: false,
      eventCount: 0,
    };
  }
  if (status === 403) {
    return {
      label: "ACCESS UNPROVEN",
      detail: `${name} denied the tick request with HTTP 403, but the failed edge (authorization, subscription, entitlement, or policy) was not proven.`,
      receiving: false,
      eventCount: 0,
    };
  }
  if (status === 429) {
    return {
      label: "RATE LIMITED",
      detail: `The authenticated ${name} tick route returned HTTP 429. The provider did not return a tick receipt.`,
      receiving: false,
      eventCount: 0,
    };
  }
  if (status >= 500) {
    return {
      label: "PROVIDER ERROR",
      detail: `The authenticated ${name} tick route returned HTTP ${status} before a tick receipt was returned.`,
      receiving: false,
      eventCount: 0,
    };
  }
  return {
    label: "UNKNOWN",
    detail: `The ${name} tick route returned HTTP ${status}.`,
    receiving: false,
    eventCount: 0,
  };
}

export function longbridgeTickWireView(receipt: MoomooTickReceipt): ProviderWireView {
  const view = moomooTickWireView(receipt);
  return {
    ...view,
    source: "longbridge",
    detail: receiptIsReceiving(receipt)
      ? withWireProofScope(
          `${receipt.eventCount} accepted Longbridge executed prints · realtime entitlement not certified`,
        )
      : receipt.detail?.trim() || "The Longbridge receipt did not identify a provider state.",
  };
}

/**
 * Webull's tick wire, at the same depth as moomoo's and longbridge's.
 *
 * Until this existed the strip proved webull from the capability matrix alone —
 * a config/entitlement plausibility read — while showing it in the same
 * uniform row as two providers backed by a live "a print arrived" receipt. See
 * `webullTicksWireStatus` for why that asymmetry mattered most for THIS
 * provider specifically.
 *
 * ENTITLEMENT BLOCKED gets its own arm rather than falling through to Unknown.
 * `classifyWebullTickSnapshot` only ever emits it when the PROVIDER proved
 * entitlement was the failed edge, so it is the one place the strip is
 * permitted to say that word — and silently degrading a proven entitlement
 * refusal into "Unknown" would discard the most actionable answer the wire can
 * give.
 */
export function webullTickWireView(receipt: MoomooTickReceipt): ProviderWireView {
  const label = receipt.label?.trim().toUpperCase() || "UNKNOWN";
  const detail = receipt.detail?.trim() || "The Webull receipt did not identify a provider state.";
  if (label === "ENTITLEMENT BLOCKED") {
    return { source: "webull", tone: "BLOCKED", label: "Entitlement blocked", detail };
  }
  const view = moomooTickWireView(receipt);
  return {
    ...view,
    source: "webull",
    detail: receiptIsReceiving(receipt)
      ? withWireProofScope(
          `${receipt.eventCount} accepted Webull executed prints · provider-signed side · streaming continuity not certified`,
        )
      : detail,
  };
}

export function alpacaReadinessWireView(payload: ReadinessPayload | null | undefined): ProviderWireView {
  const alpacaRows = selectReadinessWireboard(payload).rows.filter((row) => row.provider.startsWith("alpaca-"));
  const ready = alpacaRows.filter((row) => row.status === "CONFIGURED");
  if (ready.length > 0) {
    return {
      source: "alpaca",
      tone: "LIMITED",
      label: "Configured to attempt",
      detail: `${ready.map((row) => row.provider.replace("alpaca-", "")).join(" + ")} credentials present · no accepted live event receipt yet.`,
    };
  }
  if (alpacaRows.length > 0) {
    const missing = [...new Set(alpacaRows.flatMap((row) => row.missing))];
    return {
      source: "alpaca",
      tone: "OFFLINE",
      label: "Not configured",
      detail: missing.length > 0 ? `Missing required variables: ${missing.join(", ")}.` : "No Alpaca runtime readiness receipt returned.",
    };
  }
  return { source: "alpaca", tone: "OFFLINE", label: "Status unavailable", detail: "The readiness endpoint returned no Alpaca lanes.", evidenceless: true };
}

export function providerConfigReadinessWireView(
  payload: ReadinessPayload | null | undefined,
  source: string,
  providerIds: readonly string[],
): ProviderWireView | null {
  const rows = selectReadinessWireboard(payload).rows.filter((row) => providerIds.includes(row.provider));
  if (rows.length === 0) return null;
  const ready = rows.filter((row) => row.status === "CONFIGURED");
  if (ready.length > 0) {
    return {
      source,
      tone: "LIMITED",
      label: "Configured to attempt",
      detail: "Required credential names are present · no accepted provider event receipt yet.",
    };
  }
  const missing = [...new Set(rows.flatMap((row) => row.missing))];
  return {
    source,
    tone: "OFFLINE",
    label: "Not configured",
    detail: missing.length > 0
      ? `Missing required variables: ${missing.join(", ")}.`
      : "The runtime readiness receipt did not prove required configuration.",
  };
}

/**
 * Tastytrade's wire claim, capped at the depth a config read can reach.
 *
 * Every input here — `configured`, `connected`, `quotes`, `realTime` — is a
 * field of a BrokerStatus: an account probe and an entitlement flag. None of
 * them is a market event. Tastytrade ships no `/api/market-data/<id>/ticks`
 * route, so there is no print for this view to have seen.
 *
 * This arm used to return tone LIVE / "Real-time verified" on
 * `realTime === true`. In the strip's one visually uniform row that would have
 * made tastytrade the ONLY provider showing the strongest chip, earned from
 * the weakest evidence, while moomoo, longbridge and webull cap at LIMITED on
 * actual executed prints. That is the PROVIDER HEALTH LAW run backwards.
 *
 * `getTastytradeCapabilities` — the single writer of this fact — already
 * refuses the claim, pinning `realTime: null` with "we do not claim real-time
 * without proof". The owner refused and the view accepted anyway. The cap is
 * restored here so the view cannot outrun its own owner.
 */
export function tastytradeWireView(status: BrokerStatus): ProviderWireView {
  if (status.connected && status.quotes && status.realTime === true) {
    // Entitlement is a PERMISSION to receive real-time data, not evidence that
    // any arrived. Named precisely, and capped, rather than promoted.
    return {
      source: "tastytrade",
      tone: "LIMITED",
      label: "Real-time entitled",
      detail: status.note || "Account is entitled to real-time quotes · no market event has been received on this wire, which ships no tick route.",
    };
  }
  if (status.connected && status.quotes) {
    return { source: "tastytrade", tone: "LIMITED", label: "Quote token ready", detail: status.note || "Quote access is available; real-time entitlement is not yet verified." };
  }
  if (status.connected) {
    return { source: "tastytrade", tone: "LIMITED", label: "Account connected", detail: status.note || "Account access passed; streaming quote access is unavailable." };
  }
  if (status.configured) {
    return { source: "tastytrade", tone: "BLOCKED", label: "Connection failed", detail: status.note || "Credentials are configured, but the authenticated read probe failed." };
  }
  return { source: "tastytrade", tone: "OFFLINE", label: "Not runtime-wired", detail: status.note || "Required server credentials are incomplete." };
}

export function providerWireView(source: SourceCertification): ProviderWireView {
  const active = source.rows.filter((row) => row.status === "ACTIVE_CERTIFIED");
  const degraded = source.rows.filter((row) => row.status === "ACTIVE_DEGRADED");
  const blockedEntitlement = source.rows.find((row) => row.status === "BLOCKED_ENTITLEMENT");
  const blockedAuth = source.rows.find((row) => row.status === "BLOCKED_AUTH");
  if (active.length > 0) {
    return { source: source.source, tone: "LIVE", label: `${active.length} certified`, detail: active.map((row) => row.capability).join(" · ") };
  }
  if (degraded.length > 0) {
    return { source: source.source, tone: "LIMITED", label: `${degraded.length} observed`, detail: degraded.map((row) => `${row.capability} ${row.fidelity.toLowerCase()}`).join(" · ") };
  }
  if (blockedEntitlement) {
    return { source: source.source, tone: "BLOCKED", label: "Entitlement blocked", detail: blockedEntitlement.note || blockedEntitlement.capability };
  }
  if (blockedAuth) {
    return { source: source.source, tone: "BLOCKED", label: "Authentication blocked", detail: blockedAuth.note || blockedAuth.capability };
  }
  // A note on a row IS a measurement — the provider said something about why.
  // Only the no-note arm is evidenceless, and it says so in its own detail.
  const noted = source.rows.find((row) => row.note)?.note;
  if (noted) return { source: source.source, tone: "OFFLINE", label: "Not runtime-wired", detail: noted };
  return { source: source.source, tone: "OFFLINE", label: "Not runtime-wired", detail: "No capability evidence returned.", evidenceless: true };
}

/**
 * A withdrawn receipt has TWO causes and they are not the same claim.
 *
 * A probe that is genuinely in flight is CHECKING. A probe this surface
 * deliberately declined to issue — because the document is hidden and polling
 * a backgrounded tab burns a phone's battery and a provider's rate limit — is
 * SUSPENDED. Rendering the second as "Canonical capability receipt in
 * progress." states that work is happening when no request exists.
 *
 * This is not a rare edge on a phone. iOS marks the tab hidden on every app
 * switch, screen lock and notification-shade pull, and `visibilitychange`
 * invalidates the previous receipt on the way out. So the trader who comes
 * back to WM Pro is told his wires are being checked at the exact moment
 * nothing is being checked.
 *
 * SUSPENDED must therefore also carry its own recovery: the reason it stopped
 * and the action that restarts it.
 */
export function suspendedProviderWireView(source: string): ProviderWireView {
  return {
    source,
    tone: "SUSPENDED",
    label: "Paused",
    detail: "Not checked while this surface is in the background. Reopen it to re-probe the wire.",
  };
}

export function matrixProviderWireView(
  matrix: AthosCapabilityMatrix | null | undefined,
  source: string,
): ProviderWireView {
  if (!matrix) return { source, tone: "CHECKING", label: "Checking", detail: "Canonical capability receipt in progress." };
  const selected = matrix.capabilities.filter((row) => row.provider === source);
  if (selected.length > 0) {
    const certifiedCount = selected.filter((row) => row.status === "ACTIVE_CERTIFIED" && row.fidelity === "REALTIME").length;
    const observedCount = selected.length - certifiedCount;
    return {
      source,
      tone: certifiedCount > 0 ? "LIVE" : "LIMITED",
      label: certifiedCount > 0
        ? `${certifiedCount} certified${observedCount > 0 ? ` · ${observedCount} observed` : ""}`
        : `${observedCount} observed`,
      detail: selected.map((row) => `${row.capability} ${row.fidelity.toLowerCase()}`).join(" · "),
    };
  }
  const rejected = matrix.capabilities.flatMap((row) => row.rejectedSources).filter((row) => row.source === source);
  const auth = rejected.find((row) => row.reason.includes("BLOCKED_AUTH"));
  if (auth) return { source, tone: "BLOCKED", label: "Authentication blocked", detail: auth.note || auth.reason };
  const entitlement = rejected.find((row) => row.reason.includes("BLOCKED_ENTITLEMENT"));
  if (entitlement) return { source, tone: "BLOCKED", label: "Entitlement blocked", detail: entitlement.note || entitlement.reason };
  const detail = rejected.find((row) => row.note)?.note || rejected[0]?.reason || "No canonical capability evidence returned.";
  // A negative runtime receipt is more useful than the internal default
  // NOT_IMPLEMENTED classification used for capability rows with no accepted
  // observation. Preserve the witnessed edge on the compact wireboard: a
  // provider failure, deadline, rate limit, stale print, or empty response is
  // not the same claim as an unwired adapter.
  if (/\bHTTP 5\d\d\b|provider (?:failed|error)|unrecognized .*envelope/i.test(detail)) {
    return { source, tone: "OFFLINE", label: "Provider error", detail };
  }
  if (/\b(?:timed? out|deadline exceeded|did not respond within)\b/i.test(detail)) {
    return { source, tone: "OFFLINE", label: "Timed out", detail };
  }
  if (/\b(?:HTTP 429|rate limit)/i.test(detail)) {
    return { source, tone: "LIMITED", label: "Rate limited", detail };
  }
  if (/\bno (?:valid,? )?(?:symbol-matched )?(?:tick )?(?:observations|events|prints)\b/i.test(detail)
    || /\bdid not contain a valid\b|\bempty (?:quote|tick|trade) set\b|\breturned an empty\b/i.test(detail)) {
    return { source, tone: "LIMITED", label: "No events", detail };
  }
  // FOUND BY TRACING THE ROUND-TRIP, not by another live reading. The notes
  // this classifier reads are AUTHORED IN THIS REPO — `zeroState(...)` in
  // `src/lib/marketData/adapters/*` writes an English sentence and this
  // function parses it back with a regex. Three more of those sentences still
  // fell through to the generic arm below for exactly the reason the staleness
  // note did: no arm spoke their wording.
  if (/\b(?:not configured|credentials are not configured|is missing in this runtime)\b/i.test(detail)) {
    return { source, tone: "OFFLINE", label: "Not configured", detail };
  }
  if (/\b(?:transport was unreachable|unreachable|could not connect|connection refused)\b/i.test(detail)) {
    return { source, tone: "OFFLINE", label: "Unreachable", detail };
  }
  // SURFACED BY THE PROSE ROUND-TRIP SENTINEL, not by a human re-reading the
  // adapters. Webull's bridge note says the bridge IS configured and DID answer,
  // but this adapter refuses to read its envelope. "Not receiving" would have
  // been false twice over — it is configured, and something came back. The
  // refusal is the adapter's own caution, and the row should say so.
  if (/\bunproven transport\b|\bnot yet verified in this adapter\b|\bresponse envelope is not\b/i.test(detail)) {
    return { source, tone: "OFFLINE", label: "Transport unproven", detail };
  }
  // MEASURED LIVE 2026-09-18, /command-deck TSLA. Alpaca's rejection note read:
  //
  //   "Alpaca returned a valid TSLA IEX trade, but its provider timestamp was
  //    43549376 ms old; stale evidence was not exposed as current."
  //
  // 43,549,376 ms is 12.1 HOURS. That is a staleness refusal, measured and
  // worded precisely — and this classifier did not recognise it, because the
  // pattern demanded the literal words "stale prints"/"stale data" or the word
  // "print" next to "old". The synonym "stale evidence" and the unit-carrying
  // "ms old" both fell through, and a SPECIFIC finding was flattened into the
  // generic "Not receiving" below. Matching on PHRASING rather than on MEANING
  // means any rewording of an upstream note silently downgrades its verdict.
  if (/\bstale\b|\b\d+\s*(?:ms|s|m|h)\s+old\b|prints? .* old\b/i.test(detail)) {
    return { source, tone: "LIMITED", label: "Stale data", detail };
  }
  // A provider-denied request is more specific than the generic absence of
  // observations, even when the provider did not identify whether policy,
  // permission, or subscription caused the denial. Keep that uncertainty
  // explicit instead of flattening a witnessed HTTP 403 into "Not receiving".
  if (/HTTP 403/i.test(detail) && /not proven/i.test(detail)) {
    return { source, tone: "BLOCKED", label: "Access unproven", detail };
  }
  // LAST RESORT BEFORE THE GENERIC ARM. A provider that answered with an HTTP
  // status told us something specific, and the arms above only speak for the
  // codes anyone has met so far (401/403/429/5xx). An unmet code — 404, 409,
  // 451 — would otherwise be flattened into "Not receiving", which is a claim
  // about DELIVERY that a status line disproves: the transport plainly worked.
  // Name the code rather than invent a silence.
  //
  // CAUGHT BY THIS COMMIT'S OWN OVER-CORRECTION GUARD, which is the point of
  // having one. The "Authentication blocked" verdict above is reached through
  // `reason.includes("BLOCKED_AUTH")` — a STATUS, not the note text. A 401 that
  // arrives without that status would have been demoted from a named auth
  // failure to a bare code by the arm below. 401 and 403 mean something
  // specific in every HTTP deployment; say it before falling back to the code.
  if (/\bHTTP 401\b/i.test(detail)) {
    return { source, tone: "BLOCKED", label: "Authentication blocked", detail };
  }
  const http = /\bHTTP (\d{3})\b/i.exec(detail);
  if (http) return { source, tone: "OFFLINE", label: `HTTP ${http[1]}`, detail };
  // `rejected.length > 0` means the provider WAS measured and its observation
  // was refused for a reason no branch above recognised. That is a finding.
  // `rejected.length === 0` means nothing came back at all — that, and only
  // that, is the evidenceless default a witness may contradict.
  if (rejected.length > 0) return { source, tone: "OFFLINE", label: "Not receiving", detail };
  return { source, tone: "OFFLINE", label: "Status unavailable", detail, evidenceless: true };
}

export const PROVIDER_SOURCES = ["moomoo", "longbridge", "webull", "tastytrade", "alpaca"] as const;

/**
 * THE WITNESS — what the SAME PAGE is currently attributing a drawn observation
 * to. Evidence, never a verdict: no grade is computed here, and nothing in this
 * shape can make a wire look better than the page itself looks.
 */
export interface SourcedObservation {
  /** The provider the rendered observation is sourced from. */
  readonly source: string;
  /** A finite, positive price arrived. */
  readonly quotePresent: boolean;
  /** Bars are drawn, which a closed session serves when no quote does. */
  readonly barsPresent: boolean;
}

/**
 * §14.1 — AN ABSENCE MUST BE A FINDING, NOT A DEFAULT.
 *
 * MEASURED LIVE 2026-09-18, https://wealthymindsetspro.com/command-deck, TSLA:
 *
 *   Connections strip   alpaca   Not receiving
 *   hero truth          source alpaca · coverage 1 channel · 365.65 · 120 bars
 *
 * One screen, one instant, one provider, two answers to the question "is alpaca
 * delivering?" — and the panel claiming NOTHING ARRIVED sat inches above the
 * panel rendering what arrived.
 *
 * ROOT CAUSE, identical in species to the masthead FEED UNKNOWN repaired at
 * `command-deck/page.tsx` the day before: `matrixProviderWireView` answers only
 * "does this provider hold an ACCEPTED row in the canonical capability matrix?"
 * When the answer is no it falls through to "Not receiving" — a claim about
 * DELIVERY that the matrix never measured. The absence was a DEFAULT reached by
 * exhausting a ladder, not a FINDING about the wire.
 *
 * ── CORRECTION, 2026-09-18, LATER THE SAME DAY, AND IT MATTERS ──────────────
 *
 * The paragraph above is kept because it is the reasoning that shipped, and it
 * was WRONG IN ITS DECISIVE DETAIL. Going back to production to observe the fix
 * — rather than trusting that it worked — turned up alpaca's actual rejection
 * note, which had never been read:
 *
 *   "Alpaca returned a valid TSLA IEX trade, but its provider timestamp was
 *    43549376 ms old; stale evidence was not exposed as current."
 *
 * That is 12.1 HOURS, and it is a MEASUREMENT. `Not receiving` was never the
 * evidenceless default I described; it is only ever produced when a rejected
 * capability row exists, so it always rests on something the system measured.
 * Two distinct defects were hiding under one label:
 *
 *   1. the staleness classifier above matched PHRASING ("stale prints/data",
 *      "print … old") rather than MEANING, so "stale evidence … ms old" fell
 *      through and a specific verdict was flattened into a generic one;
 *   2. this witness, gated on a set of LABEL STRINGS, would then have promoted
 *      that flattened staleness refusal to "Observed · not certified" — the
 *      precise over-correction its own guards were written to prevent. The
 *      guards covered BLOCKED and LIVE. They did not cover an OFFLINE verdict
 *      that had been EARNED.
 *
 * So the gate is no longer a label set. It is `wire.evidenceless`, set only by
 * the branches that know nothing came back at all. A witness may contradict an
 * absence that was assumed. It may never contradict an absence that was found.
 *
 * The repair is NOT to soften the label into optimism. It is to let the owner
 * see the evidence already on its own page: a provider that is sourcing a drawn
 * observation is receiving, whatever the matrix can certify about it. The
 * witnessed reason is kept in `detail`, because "we cannot certify this wire"
 * remains true and remains worth reading.
 */
export function witnessedProviderWireView(
  wire: ProviderWireView,
  observation: SourcedObservation | null | undefined,
): ProviderWireView {
  if (!observation || observation.source !== wire.source) return wire;
  if (!observation.quotePresent && !observation.barsPresent) return wire;
  // THE WHOLE CORRECTION IS THIS LINE. Not "does the label sound like nothing
  // arrived", but "does the producing branch know it measured nothing".
  if (wire.evidenceless !== true) return wire;
  const arrived = observation.quotePresent
    ? observation.barsPresent ? "a quote and drawn bars" : "a quote"
    : "drawn bars";
  return {
    source: wire.source,
    // Amber, not green. Data is arriving and the capability is still uncertified
    // — that is precisely LIMITED, and it must not read as a certified wire.
    tone: "LIMITED",
    label: "Observed · not certified",
    detail:
      `This surface is rendering ${arrived} sourced from ${wire.source}, so it is receiving. ` +
      `No canonical capability row certifies it: ${wire.detail}`,
  };
}

export interface ProviderWireInputs {
  readonly matrix: AthosCapabilityMatrix | null;
  readonly readiness: ReadinessPayload | null;
  readonly moomooTicks: MoomooTickReceipt | null;
  readonly longbridgeTicks: MoomooTickReceipt | null;
  readonly webullTicks: MoomooTickReceipt | null;
  readonly failures: ReadonlySet<string>;
  readonly suspended: boolean;
  /** Optional: the page's own witness. Absent on surfaces that render no tape. */
  readonly sourcedObservation?: SourcedObservation | null;
}

/**
 * The single owner of which claim a wire is allowed to make.
 *
 * This lived inline in the render body, which meant the precedence between
 * "paused", "failed" and "observed" could only be checked by reading JSX. It
 * is the rule most likely to produce a beautiful lie, so it gets to be a
 * function with a name and a test.
 */
export function selectProviderWires(inputs: ProviderWireInputs): ProviderWireView[] {
  const { matrix, readiness, moomooTicks, longbridgeTicks, webullTicks, failures, suspended, sourcedObservation } = inputs;

  // A pause may only speak for a strip holding NO verdict at all — no receipt
  // and no observed failure. "We stopped checking" must never erase "we
  // checked, and it was blocked". Those were earned; a pause is the absence
  // of work, and absence of work outranks nothing.
  const holdsNoVerdict = !matrix && !readiness && !moomooTicks && !longbridgeTicks && !webullTicks && failures.size === 0;
  if (suspended && holdsNoVerdict) {
    return PROVIDER_SOURCES.map((source) => suspendedProviderWireView(source));
  }

  const marketWires: ProviderWireView[] = failures.has("market") && !matrix
    ? PROVIDER_SOURCES.map((source) => ({ source, tone: "OFFLINE" as const, label: "Status unavailable", detail: "The canonical capability probe did not return.", evidenceless: true }))
    : PROVIDER_SOURCES.map((source) => matrixProviderWireView(matrix, source));
  const moomooWire = failures.has("moomoo") && !moomooTicks
    ? { source: "moomoo", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The authenticated tick receipt did not return.", evidenceless: true }
    : moomooTicks ? moomooTickWireView(moomooTicks) : null;
  const longbridgeWire = failures.has("longbridge") && !longbridgeTicks
    ? { source: "longbridge", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The authenticated Longbridge tick receipt did not return.", evidenceless: true }
    : longbridgeTicks ? longbridgeTickWireView(longbridgeTicks) : null;
  const webullWire = failures.has("webull") && !webullTicks
    ? { source: "webull", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The authenticated Webull tick receipt did not return.", evidenceless: true }
    : webullTicks ? webullTickWireView(webullTicks) : null;
  const readinessOverrides = {
    tastytrade: providerConfigReadinessWireView(readiness, "tastytrade", ["tastytrade"]),
    alpaca: providerConfigReadinessWireView(readiness, "alpaca", ["alpaca-paper", "alpaca-live"]),
  } as const;

  const resolved = marketWires.map((wire) => {
    if (wire.source === "moomoo" && moomooWire) return moomooWire;
    if (wire.source === "longbridge" && longbridgeWire) return longbridgeWire;
    if (wire.source === "webull" && webullWire) return webullWire;
    if (wire.source === "tastytrade" || wire.source === "alpaca") {
      const override = readinessOverrides[wire.source];
      // Missing required configuration is a more exact cause than a generic
      // no-receipt result. Never replace an observed/auth/entitlement probe,
      // and never promote configured-to-attempt over a failed live probe.
      if (override && override.tone === "OFFLINE" && wire.tone === "OFFLINE") return override;
      if (override && (wire.label === "Status unavailable" || wire.label === "Not runtime-wired")) return override;
    }
    return wire;
  });

  // LAST, deliberately. The witness may only contradict the claim this function
  // finally settled on — running it earlier would let a readiness override
  // reinstate an absence the page had already disproved.
  return resolved.map((wire) => witnessedProviderWireView(wire, sourcedObservation));
}

const TONE_COLOR: Record<WireTone, string> = {
  LIVE: "#46d39a",
  LIMITED: "#f0b429",
  BLOCKED: "#ff6b6b",
  OFFLINE: "#8b92ac",
  CHECKING: "#8b92ac",
  // Deliberately dimmer than CHECKING. A paused wire is not a wire being
  // worked on, and the colour must not imply motion that is not happening.
  SUSPENDED: "#6b7189",
};

export default function ProviderWireStrip({
  compact = false,
  sourcedObservation = null,
}: {
  readonly compact?: boolean;
  /** The host surface's own witness — see `witnessedProviderWireView`. */
  readonly sourcedObservation?: SourcedObservation | null;
}) {
  const [matrix, setMatrix] = React.useState<AthosCapabilityMatrix | null>(null);
  const [readiness, setReadiness] = React.useState<ReadinessPayload | null>(null);
  const [moomooTicks, setMoomooTicks] = React.useState<MoomooTickReceipt | null>(null);
  const [longbridgeTicks, setLongbridgeTicks] = React.useState<MoomooTickReceipt | null>(null);
  const [webullTicks, setWebullTicks] = React.useState<MoomooTickReceipt | null>(null);
  const [failures, setFailures] = React.useState<ReadonlySet<string>>(() => new Set());
  // Declared LAST on purpose: the refresh lifecycle tests address this
  // component's state positionally, so a new hook inserted above would
  // silently renumber the receipts they assert on.
  const [suspended, setSuspended] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let refreshing = false;
    let visibilityRevision = 0;
    const isHidden = () => document.visibilityState === "hidden";
    const invalidateReceipts = () => {
      setMatrix(null);
      setReadiness(null);
      setMoomooTicks(null);
      setLongbridgeTicks(null);
      setWebullTicks(null);
    };

    const recordFailure = (source: string, error: unknown) => {
      if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
      // A failed refresh invalidates the previous receipt. Retaining it here
      // would keep an earlier receiving/certified claim on screen indefinitely.
      if (source === "market") setMatrix(null);
      if (source === "readiness") setReadiness(null);
      if (source === "moomoo") setMoomooTicks(null);
      if (source === "longbridge") setLongbridgeTicks(null);
      if (source === "webull") setWebullTicks(null);
      setFailures((current) => new Set(current).add(source));
    };
    const clearFailure = (source: string) => {
      if (!active) return;
      setFailures((current) => {
        if (!current.has(source)) return current;
        const next = new Set(current);
        next.delete(source);
        return next;
      });
    };
    const readJson = <T,>(url: string): Promise<T> =>
      readJsonReceipt<T>(fetch, url, controller.signal);
    const readProviderReceipt = async (source: TickReceiptSource): Promise<MoomooTickReceipt> => {
      const response = await readClassifiedJsonReceipt<MoomooTickReceipt>(
        fetch,
        `/api/market-data/${source}/ticks?symbol=${WIRE_PROOF_SYMBOL}`,
        controller.signal,
      );
      const body = response.body;
      if (body?.label) return body;
      if (!response.ok) return classifyProviderReceiptFailure(response.status, source);
      return { label: "UNKNOWN", detail: `The ${PROVIDER_DISPLAY_NAMES[source]} tick route returned no classified receipt.`, receiving: false, eventCount: 0 };
    };
    const refresh = async () => {
      // Report the suspension at the exact point it is decided. Setting this
      // anywhere else lets the flag and the actual probing behaviour drift.
      if (active) setSuspended(isHidden());
      if (!active || refreshing || isHidden()) return;
      refreshing = true;
      const revision = visibilityRevision;
      const acceptsReceipt = () => active && revision === visibilityRevision && !isHidden();
      invalidateReceipts();
      // Interval and foreground events share one bounded request batch so an
      // older response cannot overwrite a newer failure or recovery receipt.
      await Promise.allSettled([
      readJson<AthosCapabilityMatrix>("/api/athos/market-data/capabilities")
        .then((body) => { if (acceptsReceipt()) { setMatrix(body); clearFailure("market"); } })
        .catch((error: unknown) => recordFailure("market", error)),
      readJson<ReadinessPayload>("/api/broker/readiness")
        .then((body) => { if (acceptsReceipt()) { setReadiness(body); clearFailure("readiness"); } })
        .catch((error: unknown) => recordFailure("readiness", error)),
      readProviderReceipt("moomoo")
        .then((body) => { if (acceptsReceipt()) { setMoomooTicks(body); clearFailure("moomoo"); } })
        .catch((error: unknown) => recordFailure("moomoo", error)),
      readProviderReceipt("longbridge")
        .then((body) => { if (acceptsReceipt()) { setLongbridgeTicks(body); clearFailure("longbridge"); } })
        .catch((error: unknown) => recordFailure("longbridge", error)),
      readProviderReceipt("webull")
        .then((body) => { if (acceptsReceipt()) { setWebullTicks(body); clearFailure("webull"); } })
        .catch((error: unknown) => recordFailure("webull", error)),
      ]);
      // A background response must not leave a current-looking receipt ready
      // for the next foreground render. Recheck on return to the app.
      if (active && isHidden()) { invalidateReceipts(); setSuspended(true); }
      refreshing = false;
      if (active && revision !== visibilityRevision && !isHidden()) void refresh();
    };

    const visibilityChanged = () => {
      visibilityRevision += 1;
      invalidateReceipts();
      void refresh();
    };

    refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibilityChanged);
      controller.abort();
    };
  }, []);

  const wires = selectProviderWires({ matrix, readiness, moomooTicks, longbridgeTicks, webullTicks, failures, suspended, sourcedObservation });

  return (
    <section aria-label="Market data provider wires" style={{ marginTop: compact ? 0 : 8, border: "1px solid rgba(240,180,41,0.18)", borderRadius: compact ? 8 : 10, background: "rgba(5,5,6,0.76)", padding: compact ? "6px 8px" : "9px 10px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: compact ? 5 : 7 }}>
        <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{compact ? "Connections" : "Market data wires"}</span>
        <Link href="/readiness" style={{ color: "#8b92ac", fontSize: 9, textDecoration: "none", whiteSpace: "nowrap" }}>{compact ? "View details →" : "read-only · capability truth"}</Link>
      </div>
      <div style={compact
        ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 7 }
        : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 7 }}>
        {wires.map((wire) => (
          <Link
            key={wire.source}
            href="/readiness"
            title={wire.detail}
            aria-label={`${wire.source}: ${wire.label}. ${wire.detail} Open provider readiness wireboard.`}
            data-provider={wire.source}
            data-provider-tone={wire.tone}
            style={{ minWidth: 0, border: "1px solid rgba(240,180,41,0.18)", borderRadius: 8, padding: compact ? "6px 8px" : "7px 8px", background: "linear-gradient(145deg, rgba(240,180,41,0.045), rgba(255,255,255,0.012))", textDecoration: "none" }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#d9dce7", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{wire.source}</span>
              <span style={{ color: TONE_COLOR[wire.tone], fontSize: 9, fontWeight: 800, overflowWrap: "anywhere" }}>{wire.label}</span>
            </div>
            {!compact && (
              <>
                <div style={{ color: "#8b92ac", fontSize: 9, lineHeight: 1.35, marginTop: 4, overflow: "hidden", overflowWrap: "anywhere", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3 }}>{wire.detail}</div>
                <div style={{ color: "rgba(240,180,41,0.74)", fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", marginTop: 5, textTransform: "uppercase" }}>Inspect wire →</div>
              </>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
