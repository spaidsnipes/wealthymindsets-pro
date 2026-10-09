/**
 * WEBULL — ONE HISTORY (Sheriff P1-3, 2026-10-09).
 *
 * Three surfaces spoke about one broker from two observations: the readiness
 * board read the CERTIFICATE (the keeper's last durable record), while the
 * Connect card and the wire chip read a LIVE probe made on every page load —
 * so one page could say "FAILED at account_discovery" beside "BROKER
 * CONNECTED · 3 accounts", each true of a different minute, neither dated.
 *
 * The certificate's observation is the headline on all three, with its own
 * time. The live probe is kept as what it is — a check made just now — on its
 * own line, and when it disagrees with the record both times are said. No
 * surface writes anything to make them agree: the record updates on the
 * keeper's next run.
 *
 * PURE. No IO, no clock (the caller passes `nowMs`).
 */
import type { CertStageReport } from "./certification";
import type { KeeperResult } from "../marketData/webullSessionKeeper";
import { webullConnectedFromKeeper, webullStagesFromKeeper } from "./webullKeeperCertification";

export interface WebullCertificateBlock {
  /** The record's verdict: true / false, or null when there is no fresh record (UNKNOWN). */
  readonly connected: boolean | null;
  /** Accounts the record listed; null when it holds no broker read. */
  readonly accountCount: number | null;
  readonly passedStages: readonly string[];
  readonly failedStages: readonly string[];
  readonly blockedStages: readonly string[];
  /** When the newest stage behind this block was observed (ISO); null when nothing was. */
  readonly observedAt: string | null;
}

/** The certificate block from the keeper record — the SAME two functions /api/broker/certification reads. */
export function webullCertificateBlock(record: KeeperResult | null, nowMs: number): WebullCertificateBlock {
  const reports: CertStageReport[] = webullStagesFromKeeper(record, nowMs);
  let newest: number | null = null;
  for (const r of reports) {
    const t = r.observedAt ? Date.parse(r.observedAt) : NaN;
    if (Number.isFinite(t) && (newest === null || t > newest)) newest = t;
  }
  const by = (s: CertStageReport["status"]) => reports.filter(r => r.status === s).map(r => r.stage);
  return {
    connected: webullConnectedFromKeeper(record, nowMs),
    accountCount: typeof record?.broker?.accountCount === "number" ? record.broker.accountCount : null,
    passedStages: by("PASS"),
    failedStages: by("FAIL"),
    blockedStages: by("BLOCKED"),
    observedAt: newest === null ? null : new Date(newest).toISOString(),
  };
}

export interface WebullLiveCheck {
  readonly connected?: boolean;
  readonly accountCount?: number;
  readonly checkedAt?: string;
}

export interface WebullOneHistory {
  /** Whose observation the headline is. LIVE_ONLY: no certificate block was supplied (older payload). */
  readonly basis: "CERTIFICATE" | "CERTIFICATE_UNKNOWN" | "LIVE_ONLY";
  /** The headline's verdict (null = unknown). */
  readonly connected: boolean | null;
  readonly accountCount: number | null;
  readonly headline: string;
  /** The observation's own time, in words. */
  readonly asOf: string;
  /** The live check, said separately — null when there is none. */
  readonly liveLine: string | null;
  /** True when the live check and the record disagree. */
  readonly disagrees: boolean;
}

const accts = (n: number | null | undefined) => (typeof n === "number" && n > 0 ? ` · ${n} account${n === 1 ? "" : "s"}` : "");

/**
 * One headline for every surface. `clock` formats an ISO time for the reader
 * (the surfaces pass the house clock); the default prints HH:MM:SS UTC.
 */
export function webullOneHistory(
  certificate: WebullCertificateBlock | null | undefined,
  live: WebullLiveCheck | null | undefined,
  clock: (iso: string) => string = iso => `${iso.slice(11, 19)} UTC`,
): WebullOneHistory {
  const liveKnown = !!live && typeof live.connected === "boolean";
  const liveWords = liveKnown
    ? `live check${live!.checkedAt ? ` ${clock(live!.checkedAt)}` : " just now"}: ${live!.connected ? `connected${accts(live!.accountCount)}` : "not connected"}`
    : null;
  if (!certificate) {
    return {
      basis: "LIVE_ONLY",
      connected: liveKnown ? live!.connected! : null,
      accountCount: liveKnown && typeof live!.accountCount === "number" ? live!.accountCount : null,
      headline: liveKnown ? (live!.connected ? `Connected${accts(live!.accountCount)}` : "Connection not proven") : "Not measured",
      asOf: live?.checkedAt ? `checked ${clock(live.checkedAt)} (live check — no certificate record on this response)` : "no observation time",
      liveLine: null,
      disagrees: false,
    };
  }
  const when = certificate.observedAt ? `observed ${clock(certificate.observedAt)}` : "no observation time";
  if (certificate.connected === null) {
    return {
      basis: "CERTIFICATE_UNKNOWN",
      connected: null,
      accountCount: null,
      headline: certificate.observedAt ? "Record too old to certify" : "No certificate record",
      asOf: `certificate record ${when} — it updates on the keeper's next run`,
      liveLine: liveWords,
      disagrees: false,
    };
  }
  const disagrees = liveKnown && live!.connected !== certificate.connected;
  return {
    basis: "CERTIFICATE",
    connected: certificate.connected,
    accountCount: certificate.accountCount,
    headline: certificate.connected ? `Account proved${accts(certificate.accountCount)}` : "Account not proved",
    asOf: `certificate record ${when}`,
    liveLine: liveWords === null ? null : disagrees
      ? `${liveWords} — differs from the certificate's record, which updates on the keeper's next run`
      : liveWords,
    disagrees,
  };
}
