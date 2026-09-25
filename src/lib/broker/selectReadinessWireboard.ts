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
 *  - CONFIGURED means "credentials to ATTEMPT a connection are present" — it is
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

/**
 * A blocker-class label.
 *
 * The first two are all PRESENCE can prove. The rest are only ever reachable
 * when a LIVE measurement for that provider is handed in — see `live` below.
 * Presence never guesses them.
 */
export type WireboardBlockerClass =
  | "SETUP PRESENT"
  | "NOT CONFIGURED"
  | "CONNECTED"
  | "AWAITING 2FA"
  | "AUTH BLOCKED"
  /**
   * 2026-09-25. Reachable ONLY from a live measurement whose own state token is
   * BLOCKED_ENTITLEMENT — i.e. the provider answered with an entitlement code.
   * Presence can never produce it (the "never DELAYED BY ENTITLEMENT" rule for
   * a missing variable still holds, and is still pinned). It exists because
   * without it the one measured entitlement refusal on this runtime fell to
   * NOT CONNECTED, and the Webull market-data row went on reading NOT MEASURED.
   */
  | "ENTITLEMENT BLOCKED"
  | "NOT CONNECTED";

/**
 * One live probe result, for a provider that has one.
 *
 * WHY THIS EXISTS. Presence-only readiness is honest in isolation and
 * MISLEADING in company. On 2026-09-20 this page showed Webull as
 * "SETUP PRESENT" while `/api/broker/webull/status` was live-reporting
 * BLOCKED_AUTH on the same runtime. Both statements were true. Read together
 * by a human, they produce exactly the complaint the Founder has filed for
 * three months: "it says it's connected but I can't see my data."
 *
 * A page that owns the stronger evidence and renders the weaker one is not
 * being careful; it is withholding. So when a measurement exists, it WINS, and
 * the row says which of the two it is showing.
 *
 * This is still not a second authority source — the measurement is made by the
 * provider's own status route and merely passed through here.
 */
export interface WireboardLiveMeasurement {
  /** Must match `ProviderReadiness.provider` for the row it corrects. */
  readonly provider: string;
  readonly connected: boolean;
  /** The provider's own connection-state token, e.g. "AWAITING_2FA". */
  readonly state: string;
  readonly note: string;
  readonly checkedAt: string;
  /**
   * The provider's status and code exactly as its receipt carried them, e.g.
   * "403 MARKET_DATA_NOT_SUBSCRIBED". Optional: only a lane owner that holds
   * them verbatim may pass them (see `selectWebullLanes`).
   */
  readonly evidence?: string | null;
  /** The one human step the lane owner derived from this measurement, if any. */
  readonly founderAction?: string | null;
}

/** What a measured row shows in place of its presence-only class. */
export interface WireboardLiveView {
  readonly blockerClass: WireboardBlockerClass;
  readonly state: string;
  readonly note: string;
  readonly checkedAt: string;
  /**
   * The one sentence that tells the reader what to DO. Kept separate from
   * `note` (the provider's own words) so a surface can render the action
   * prominently without paraphrasing a provider receipt.
   */
  readonly nextAction: string;
  /** Verbatim status + provider code, or null when the measurement carried none. */
  readonly evidence: string | null;
  /** Passed through from the lane owner, never composed here. */
  readonly founderAction: string | null;
}

/**
 * Live state → visible class. Unknown states deliberately fall to
 * NOT CONNECTED rather than to SETUP PRESENT: an unrecognised token is a thing
 * we do not understand, and "setup present" is the reassuring reading of it.
 */
function liveClassFor(m: WireboardLiveMeasurement): WireboardBlockerClass {
  if (m.connected) return "CONNECTED";
  switch (m.state) {
    case "AWAITING_2FA": return "AWAITING 2FA";
    case "BLOCKED_AUTH": return "AUTH BLOCKED";
    // The provider's own token for "I identified you and refused you on an
    // entitlement code". Not inferred from any other state. (2026-09-25)
    case "BLOCKED_ENTITLEMENT": return "ENTITLEMENT BLOCKED";
    case "UNCONFIGURED": return "NOT CONFIGURED";
    default: return "NOT CONNECTED";
  }
}

function nextActionFor(blockerClass: WireboardBlockerClass): string {
  switch (blockerClass) {
    case "CONNECTED":
      return "Nothing to do. This lane answered a signed request on this runtime.";
    case "AWAITING 2FA":
      // The whole point of separating this state. No credential is named,
      // because none is missing.
      return "Open the provider's app and approve the pending request. One tap. Nothing is missing from this deployment.";
    case "AUTH BLOCKED":
      return "The identity WM Pro presented was rejected. Examine the key pair or the signature — this says nothing about a data package or subscription.";
    case "ENTITLEMENT BLOCKED":
      // The mirror of AUTH BLOCKED's sentence, and it must stay its mirror: an
      // entitlement refusal is not an identity rejection, so no credential is
      // named as the thing to fix.
      return "The provider refused this lane on an entitlement code — that is not an identity rejection. No credential needs adding, rotating or re-pasting for this row.";
    case "NOT CONFIGURED":
      return "This runtime does not carry the credential names this provider reads.";
    default:
      return "Measured and not connected. The provider receipt below names the edge; it has not been reduced to a one-word cause.";
  }
}

export interface WireboardRow {
  readonly provider: string;
  readonly label: string;
  readonly lane: string;
  readonly status: ReadinessStatus;
  /**
   * The honest, proven blocker class. Presence-only readiness can only ever
   * prove CONFIGURED or NOT CONFIGURED (missing required var) — it deliberately
   * never claims AUTH BLOCKED / ENTITLEMENT / BRIDGE UNREACHABLE, which need
   * a live probe the certification harness owns.
   */
  readonly blockerClass: WireboardBlockerClass;
  /** One-line human blocker sentence, naming the missing var(s) exactly. */
  readonly blockerDetail: string;
  readonly missing: readonly string[];
  readonly missingRecommended: readonly string[];
  readonly note: string;
  /**
   * The suspected name mismatches that concern THIS row's own missing names.
   *
   * Measured failure (2026-09-05 → 2026-09-11, six days): the finnhub row read
   * `NOT CONFIGURED — missing required variable: FINNHUB_KEY.` while a separate
   * section of the same page reported that the host carried `FINNHUB_KEY_`.
   * Both facts were on screen and neither pointed at the other, so the row a
   * human actually reads to decide what to do stated an absent credential when
   * the credential was present under another name. The reader's correct next
   * action ("declare the alias") and the action the row implied ("go obtain a
   * key") are not the same action.
   *
   * Joining here is the whole point: a blocker sentence must carry its own
   * counter-evidence, not rely on the reader scrolling to find it.
   */
  readonly nameMismatches: readonly WireboardNearMiss[];
  /**
   * Present only when this provider was actually probed. `null` means
   * UNMEASURED — which a surface must say out loud, because "not measured" and
   * "measured fine" are the two readings of a quiet row and only one is true.
   */
  readonly live: WireboardLiveView | null;
  /**
   * True when this page HAS a live probe for this provider, whether or not it
   * answered on this load. (2026-09-25) An unmeasured row whose probe exists
   * and failed must not say "No live probe exists for this provider yet" —
   * that sentence was about to become false for webull-data the moment its
   * probe was wired. Both readings are NOT MEASURED; only one is "no probe".
   */
  readonly probed: boolean;
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

function blockerDetailFor(r: ProviderReadiness, mismatches: readonly WireboardNearMiss[]): string {
  if (r.status === "CONFIGURED") {
    const gaps = r.missingRecommended.length > 0
      ? ` Fidelity gap — recommended not set: ${r.missingRecommended.join(", ")}.`
      : "";
    return `Credentials present — ready to attempt a connection (not yet connected or certified).${gaps}`;
  }
  const names = r.missing.join(", ");
  const base = `NOT CONFIGURED — missing required ${r.missing.length === 1 ? "variable" : "variables"}: ${names}.`;
  if (mismatches.length === 0) return base;

  // Deliberately NOT a verdict: presence-only readiness cannot prove the value
  // behind a lookalike is the right one. It CAN prove the reader is about to
  // draw the wrong conclusion from the sentence above, which is what this says.
  const pairs = mismatches.map((m) => `${m.found} (for ${m.expected}, ${m.strength})`).join("; ");
  return `${base} But this host carries a lookalike for ${mismatches.length === 1 ? "that name" : "those names"}: ${pairs}. ` +
    "Check for a NAME MISMATCH before concluding the credential is absent — the fix may be to declare the host's real name as an alias, not to obtain a new secret.";
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

/**
 * Build the wireboard view-model from a readiness API payload, optionally
 * corrected by live measurements for the providers that have a probe.
 */
export function selectReadinessWireboard(
  payload: ReadinessPayload | null | undefined,
  measurements: readonly WireboardLiveMeasurement[] = [],
  /** Providers this page asked a live probe about — answered or not. */
  probedProviders: readonly string[] = [],
): ReadinessWireboard {
  const providers = payload?.providers ?? [];
  const nearMisses = (payload?.nearMisses ?? []).map(nearMissRow);
  const rows: WireboardRow[] = providers.map((r) => {
    const nameMismatches = nearMisses.filter((h) => r.missing.includes(h.expected));
    const presenceClass: WireboardBlockerClass = r.status === "CONFIGURED" ? "SETUP PRESENT" : "NOT CONFIGURED";
    const measured = measurements.find((m) => m.provider === r.provider) ?? null;
    const live: WireboardLiveView | null = measured
      ? (() => {
          const blockerClass = liveClassFor(measured);
          return {
            blockerClass,
            state: measured.state,
            note: measured.note,
            checkedAt: measured.checkedAt,
            nextAction: nextActionFor(blockerClass),
            evidence: measured.evidence ?? null,
            founderAction: measured.founderAction ?? null,
          };
        })()
      : null;
    return {
      provider: r.provider,
      label: r.label,
      lane: r.lane,
      status: r.status,
      // Measurement outranks presence. See WireboardLiveMeasurement for the
      // six days this page spent showing the weaker of two facts it held.
      blockerClass: live ? live.blockerClass : presenceClass,
      blockerDetail: blockerDetailFor(r, nameMismatches),
      missing: r.missing,
      missingRecommended: r.missingRecommended,
      note: r.note,
      nameMismatches,
      live,
      probed: live !== null || probedProviders.includes(r.provider),
    };
  });
  const readyCount = rows.filter((r) => r.status === "CONFIGURED").length;
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
    nearMisses,
    accountService: {
      blockerClass: accountConfigured ? "SETUP PRESENT" : "NOT CONFIGURED",
      detail: accountConfigured
        ? "Supabase URL and public client key are present on this runtime. Sign-in still requires a successful auth receipt."
        : `Supabase auth is NOT CONFIGURED on this runtime — missing: ${missingAccountConfig.join(", ")}.`,
    },
    empty: rows.length === 0,
  };
}
