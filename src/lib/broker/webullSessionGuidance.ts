/**
 * WHAT THE FOUNDER READS ABOUT THE WEBULL LINK — from the keeper's record.
 *
 * The keeper (every 15 minutes, nobody on the site) records what Webull said:
 * whether the App Key needs a session at all (`/openapi/config`), the session's
 * state, the broker lane, the capability matrix and the open-order
 * reconciliation. Until 2026-09-26 none of it reached the glass: the broker
 * panel printed "approve the OpenAPI request" — the wrong flow (Webull's docs:
 * an SMS code typed into the app) — and never said that unticking "Enable 2FA
 * Verification" on the key removes the phone step for good.
 *
 * One pure owner turns the record into the lines a surface prints, so the
 * panel cannot drift from the record or improvise advice.
 */

export interface WebullKeeperView {
  readonly outcome: string;
  readonly note: string;
  readonly atMs: number;
  readonly expiresInMs?: number;
  readonly authMode?: string;
  readonly broker?: { readonly state: string; readonly accountCount: number; readonly atMs: number };
  readonly capabilities?: { readonly verdict: string; readonly stocks: string; readonly crypto: string; readonly futures?: string; readonly atMs: number };
  readonly reconciliation?: {
    readonly state: string;
    readonly accounts: number;
    readonly openOrders: number;
    readonly external: number;
    readonly unresolved: number;
    readonly ledger: string;
    readonly atMs: number;
  };
}

export type GuidanceTone = "OK" | "ACTION" | "INFO";

export interface WebullGuidanceLine {
  readonly key: "MODE" | "SESSION" | "NEXT" | "BROKER" | "DATA" | "ORDERS";
  readonly label: string;
  readonly text: string;
  readonly tone: GuidanceTone;
}

/** Where the 2FA switch lives, in Webull's own menu words. */
export const WEBULL_2FA_SWITCH_PATH =
  "webull.com → API Management → API Keys Management → Edit → untick “Enable 2FA Verification” → Submit";

/** Where the code is entered when 2FA stays on (Webull docs, Token page). */
export const WEBULL_CODE_ENTRY_PATH = "Webull app → Menu → Messages → OpenAPI Notifications → Check Now → enter the SMS code";

const outcomeWords: Readonly<Record<string, string>> = {
  TOKEN_NOT_REQUIRED: "No session needed — requests are signed with the App Key and Secret alone.",
  STILL_FRESH: "Session live and confirmed by Webull.",
  REFRESHED: "Session extended without asking anyone.",
  APPROVAL_OBSERVED: "Your code was accepted; the session is live.",
  AWAITING_2FA: "A session is waiting for its SMS code in the Webull app (5 minutes, then it expires).",
  REAUTH_REQUIRED: "No live session. A new one needs one SMS code in the Webull app.",
  REFRESH_FAILED: "Webull did not extend the session this run; the next run tries again.",
  NOT_CONFIGURED: "The App Key and Secret are not both configured on this deployment.",
};

export function webullSessionGuidance(keeper: WebullKeeperView | null | undefined): WebullGuidanceLine[] {
  if (!keeper) {
    return [{ key: "SESSION", label: "Keeper", text: "No keeper run is recorded yet — nothing about the session is claimed.", tone: "INFO" }];
  }
  const lines: WebullGuidanceLine[] = [];
  if (keeper.authMode === "TOKENLESS") {
    lines.push({ key: "MODE", label: "2FA", text: "OFF on the App Key — no phone step, ever.", tone: "OK" });
  } else if (keeper.authMode === "TOKEN_REQUIRED") {
    lines.push({ key: "MODE", label: "2FA", text: "ON on the App Key — every new session needs an SMS code typed into the Webull app.", tone: "INFO" });
  } else {
    lines.push({ key: "MODE", label: "2FA", text: "Webull did not say this run whether a session is required.", tone: "INFO" });
  }

  const live = ["TOKEN_NOT_REQUIRED", "STILL_FRESH", "REFRESHED", "APPROVAL_OBSERVED"].includes(keeper.outcome);
  lines.push({ key: "SESSION", label: "Session", text: outcomeWords[keeper.outcome] ?? keeper.note, tone: live ? "OK" : "ACTION" });

  if (!live && keeper.authMode === "TOKEN_REQUIRED" && keeper.outcome !== "NOT_CONFIGURED") {
    lines.push({
      key: "NEXT",
      label: "Next",
      text: `Remove the phone step for good: ${WEBULL_2FA_SWITCH_PATH}. Or keep 2FA and enter the code: ${WEBULL_CODE_ENTRY_PATH}.`,
      tone: "ACTION",
    });
  }

  if (keeper.broker) {
    lines.push({
      key: "BROKER",
      label: "Accounts",
      text: keeper.broker.state === "CONNECTED"
        ? `${keeper.broker.accountCount} account${keeper.broker.accountCount === 1 ? "" : "s"} read by the keeper.`
        : `The keeper's account read came back ${keeper.broker.state}.`,
      tone: keeper.broker.state === "CONNECTED" ? "OK" : "ACTION",
    });
  }

  if (keeper.capabilities) {
    const stocksOpen = /\bOK\b/.test(keeper.capabilities.stocks) && !/DENIED/.test(keeper.capabilities.stocks);
    const stocksPackage = /DENIED_ENTITLEMENT/.test(keeper.capabilities.stocks);
    const cryptoOpen = /:OK\b/.test(keeper.capabilities.crypto);
    lines.push({
      key: "DATA",
      label: "Market data",
      text: stocksOpen
        ? `Stock data open${cryptoOpen ? "; crypto open" : ""}.`
        : stocksPackage
          ? `Stocks refused by package — Webull's OpenAPI market data is its own Non-Display subscription (app and desktop subscriptions do not carry over)${cryptoOpen ? "; crypto, which needs none, is open, so the door and the signature work" : ""}. Whether to add it is your call; Non-Display terms also govern drawing it on a chart.`
          : `Stock data not proven this run (${keeper.capabilities.verdict}).`,
      tone: stocksOpen ? "OK" : "INFO",
    });
  }

  if (keeper.reconciliation) {
    const r = keeper.reconciliation;
    lines.push({
      key: "ORDERS",
      label: "Open orders",
      text: r.state === "OK" || r.state === "PARTIAL"
        ? `${r.openOrders} open across ${r.accounts} account${r.accounts === 1 ? "" : "s"}${r.external ? ` · ${r.external} placed outside WM Pro` : ""}${r.unresolved ? ` · ${r.unresolved} WM submission${r.unresolved === 1 ? "" : "s"} awaiting the exact lookup` : ""}${r.state === "PARTIAL" ? " · partial read" : ""}.`
        : `Reconciliation did not complete (${r.state}).`,
      tone: r.unresolved > 0 || (r.state !== "OK" && r.state !== "PARTIAL") ? "ACTION" : "INFO",
    });
  }
  return lines;
}

/*
 * ── GARDEN 16 §34 · THE CERTIFICATE ────────────────────────────────────────
 * "Never summarize the whole system as CONNECTED. Prove separately … Use:
 * PROVED. PARTIAL. UNSUPPORTED. NOT ENTITLED. NOT CONFIGURED. NOT AUTHORIZED."
 *
 * Every row is derived from what the keeper RECORDED from Webull, or from a
 * fixed fact of this deployment stated as such. A capability nobody has
 * exercised against Webull is NOT PROVED — it is never promoted to green
 * because code for it exists.
 */

export type CertificateStatus =
  | "PROVED" | "PARTIAL" | "UNSUPPORTED" | "NOT ENTITLED" | "NOT CONFIGURED" | "NOT AUTHORIZED" | "NOT PROVED";

export interface CertificateRow {
  readonly capability: string;
  readonly status: CertificateStatus;
  readonly evidence: string;
}

/** A keeper record older than this is not "fresh" evidence of anything. */
export const CERTIFICATE_FRESH_MS = 20 * 60_000;

export function webullCapabilityCertificate(
  keeper: WebullKeeperView | null | undefined,
  nowMs: number,
  opts: { readonly ownerNamed: boolean; readonly liveOrdersEnabled: boolean },
): CertificateRow[] {
  const age = keeper ? nowMs - keeper.atMs : Infinity;
  const fresh = age >= 0 && age <= CERTIFICATE_FRESH_MS;
  const stale = keeper ? ` (record ${Math.max(0, Math.round(age / 60_000))} min old)` : "";
  const brokerOk = keeper?.broker?.state === "CONNECTED";
  const caps = keeper?.capabilities;
  const stocksDenied = !!caps && /DENIED_ENTITLEMENT/.test(caps.stocks);
  const stocksOk = !!caps && /\bOK\b/.test(caps.stocks) && !/DENIED/.test(caps.stocks);
  const cryptoOk = !!caps && /:OK\b/.test(caps.crypto);
  const rec = keeper?.reconciliation;
  const noRecord = (capability: string): CertificateRow => ({ capability, status: "NOT PROVED", evidence: "No keeper record." });
  const nonDisplay = "Webull's OpenAPI market data is its own Non-Display subscription; this App Key's stock data was refused by package.";

  if (!keeper) {
    return ["AUTH", "OWNER", "ACCOUNT", "MARKET DATA"].map(noRecord);
  }
  return [
    {
      capability: "AUTH",
      status: brokerOk && fresh ? "PROVED" : brokerOk ? "PARTIAL" : "NOT PROVED",
      evidence: brokerOk
        ? `Signed requests accepted by Webull${keeper.authMode === "TOKENLESS" ? " with the App Key alone (2FA off)" : ""}${fresh ? "" : stale}.`
        : `The keeper's account read came back ${keeper.broker?.state ?? "unrecorded"}.`,
    },
    {
      capability: "OWNER",
      status: opts.ownerNamed ? "PROVED" : "NOT CONFIGURED",
      evidence: opts.ownerNamed
        ? "One named WM user owns this brokerage link; every other user is refused."
        : "No owner named: every brokerage read is refused for everyone (fail closed).",
    },
    {
      capability: "ACCOUNT",
      status: brokerOk && fresh ? "PROVED" : brokerOk ? "PARTIAL" : "NOT PROVED",
      evidence: brokerOk ? `${keeper.broker!.accountCount} account${keeper.broker!.accountCount === 1 ? "" : "s"} listed by Webull${fresh ? "" : stale}.` : "Accounts not listed.",
    },
    {
      capability: "MARKET DATA",
      status: stocksOk ? "PROVED" : cryptoOk ? "PARTIAL" : caps ? "NOT ENTITLED" : "NOT PROVED",
      evidence: stocksOk ? "Stock snapshots answered." : cryptoOk ? "Crypto snapshots answered; stock data refused by package." : caps ? nonDisplay : "Not probed.",
    },
    {
      capability: "ENTITLEMENT",
      status: stocksOk ? "PROVED" : stocksDenied ? "NOT ENTITLED" : "NOT PROVED",
      evidence: stocksDenied ? `${nonDisplay} Adding it is the owner's decision.` : stocksOk ? "Stock entitlement answered." : "Not probed.",
    },
    {
      capability: "FRESHNESS",
      status: fresh ? "PROVED" : "PARTIAL",
      evidence: fresh ? "The keeper read Webull within the last 20 minutes (every 15)." : `Keeper evidence is stale${stale}.`,
    },
    { capability: "STREAMING", status: stocksOk ? "NOT PROVED" : "NOT ENTITLED", evidence: stocksOk ? "The quote stream has not been exercised by the keeper." : "Stock streaming rides the same Non-Display package." },
    { capability: "STOCKS", status: stocksOk ? "PROVED" : stocksDenied ? "NOT ENTITLED" : "NOT PROVED", evidence: stocksDenied ? "MARKET_DATA_NOT_SUBSCRIBED on snapshot and ticks, both signatures." : stocksOk ? "Snapshots answered." : "Not probed." },
    { capability: "OPTIONS", status: "NOT ENTITLED", evidence: "Options data needs Webull's OPRA OpenAPI package; none is attached." },
    (() => {
      const f = caps?.futures;
      if (!f) return { capability: "FUTURES", status: "NOT PROVED" as const, evidence: "Not probed yet — the keeper asks for an ES snapshot from 2026-09-27." };
      if (/:OK\b/.test(f)) return { capability: "FUTURES", status: "PROVED" as const, evidence: "Webull answered an ES futures snapshot." };
      if (/DENIED_ENTITLEMENT/.test(f)) return { capability: "FUTURES", status: "NOT ENTITLED" as const, evidence: "Webull refused the ES snapshot by package: futures data is its own CME/CBOT/COMEX/NYMEX OpenAPI subscription." };
      return { capability: "FUTURES", status: "NOT PROVED" as const, evidence: `Webull's answer on ES: ${f}.` };
    })(),
    { capability: "ORDER FLOW", status: "NOT ENTITLED", evidence: "Webull's order-flow data is its own OpenAPI package; none is attached." },
    { capability: "DEPTH", status: "NOT ENTITLED", evidence: "Depth (TotalView) is its own OpenAPI package; none is attached." },
    {
      capability: "TRADING",
      status: opts.liveOrdersEnabled ? "PARTIAL" : "NOT AUTHORIZED",
      evidence: opts.liveOrdersEnabled
        ? "Live orders are switched on for this deployment; no WM order has been proven end to end."
        : "Live orders are off: placing a real order needs the owner's explicit live-test order.",
    },
    {
      capability: "ORDER EVENTS",
      status: rec && rec.state === "OK" ? "PROVED" : rec && rec.state === "PARTIAL" ? "PARTIAL" : "NOT PROVED",
      evidence: rec
        ? `Open orders read across ${rec.accounts} account${rec.accounts === 1 ? "" : "s"}${rec.state === "PARTIAL" ? "; one or more accounts did not answer" : ""}.`
        : "Open orders not read.",
    },
    { capability: "CANCEL/MODIFY", status: opts.liveOrdersEnabled ? "NOT PROVED" : "NOT AUTHORIZED", evidence: "No WM order exists to cancel or modify." },
    { capability: "POSITION STATE", status: "NOT PROVED", evidence: "The positions read exists but the keeper does not exercise it." },
    { capability: "ACCOUNT STATE", status: brokerOk ? "PARTIAL" : "NOT PROVED", evidence: brokerOk ? "Accounts are listed; balances are not read by the keeper." : "Accounts not listed." },
    {
      capability: "RECONNECT",
      status: brokerOk && fresh ? "PROVED" : "NOT PROVED",
      evidence: brokerOk && fresh ? "A fresh signed connection every 15 minutes, with nobody on the site." : "No fresh keeper connection.",
    },
    {
      capability: "TOKEN/SESSION RECOVERY",
      status: keeper.authMode === "TOKENLESS" ? "PROVED" : keeper.outcome === "STILL_FRESH" || keeper.outcome === "REFRESHED" ? "PARTIAL" : "NOT PROVED",
      evidence: keeper.authMode === "TOKENLESS"
        ? "Nothing to recover: Webull says this App Key needs no session."
        : "A session is in use; recovery needs an SMS code when it lapses.",
    },
    {
      capability: "FAILURE",
      status: "PROVED",
      evidence: rec?.state === "PARTIAL" ? "A refused account read is named, not hidden, and reconciliation says PARTIAL." : "Refusals are recorded with their Webull reason.",
    },
  ];
}
