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
  readonly capabilities?: { readonly verdict: string; readonly stocks: string; readonly crypto: string; readonly atMs: number };
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
