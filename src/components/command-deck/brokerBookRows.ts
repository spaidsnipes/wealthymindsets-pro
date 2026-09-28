/**
 * THE COMMAND DECK BINDS THE BROKER — Garden 16 five-hour order (2026-09-27):
 * "COMMAND DECK MUST RECEIVE THE WHOLE DECISION ORGANISM … It binds: thesis,
 * risk, account, broker, orders, position …". This supersedes the earlier
 * "the drawer makes no fetch" spec (verifier round 4): the Founder now names
 * the deck as the place the broker is read.
 *
 * Every state is what was READ, never a default:
 *   BROKER    /api/broker/webull/status — CONNECTED with its account count and
 *             types, or the route's own refusal code; not read yet → NOT READ
 *   POSITION  /api/broker/webull/positions — for THIS chart's symbol: FLAT only
 *             when the read succeeded and held no position for it (a finding);
 *             otherwise the position, or the read's own state word
 *   ORDERS    no Webull open-order reader exists → UNOBSERVED, said plainly
 * Execution stays separately gated; nothing here can place or change an order.
 */

export interface BookRowVM {
  readonly key: string;
  readonly label: string;
  readonly state: string;
  readonly detail: string;
  readonly tone: "set" | "quiet" | "refused";
}

export interface WebullStatusRead {
  readonly httpStatus: number;
  readonly body: {
    readonly connected?: boolean;
    readonly accountCount?: number;
    readonly accountTypes?: readonly string[];
    readonly state?: string;
    readonly code?: string;
    readonly error?: string;
    /** The keeper's last open-order reconciliation (status route, whitelisted counts only). */
    readonly sessionKeeper?: {
      readonly reconciliation?: {
        readonly state: string;
        readonly accounts: number;
        readonly openOrders: number;
        readonly external: number;
        readonly unresolved: number;
        readonly unreadable?: readonly string[];
        readonly atMs: number;
      };
    } | null;
  } | null;
}

export interface WebullPositionsRead {
  readonly httpStatus: number;
  readonly body: {
    readonly state?: string;
    readonly accountsQueried?: number;
    readonly checkedAt?: string;
    readonly positions?: readonly { readonly symbol: string; readonly quantity: number; readonly costPrice: number; readonly instrumentType: string; readonly option?: { readonly type: string; readonly strike: number; readonly expireDate: string } }[];
    readonly code?: string;
  } | null;
}

export function brokerRowFromRead(read: WebullStatusRead | null): BookRowVM | null {
  if (!read) return null;
  const b = read.body;
  if (read.httpStatus === 200 && b?.connected) {
    const types = b.accountTypes?.length ? ` (${b.accountTypes.join(", ")})` : "";
    return {
      key: "broker", label: "Broker", state: "CONNECTED",
      detail: `Webull · ${b.accountCount ?? "?"} account${b.accountCount === 1 ? "" : "s"}${types} · read access proven · execution separately gated`,
      tone: "set",
    };
  }
  const code = b?.code ?? b?.state ?? `HTTP ${read.httpStatus}`;
  return {
    key: "broker", label: "Broker", state: read.httpStatus === 403 ? "REFUSED" : "NOT CONNECTED",
    detail: `Webull · ${code}${b?.error ? ` — ${b.error}` : ""}`,
    tone: "refused",
  };
}

/** ETH-USD, ETHUSD, eth/usd → ETHUSD. */
export function bookSymbolKey(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function positionRowFromRead(read: WebullPositionsRead | null, symbol: string): BookRowVM | null {
  if (!read) return null;
  const b = read.body;
  if (read.httpStatus !== 200 || !b) {
    return { key: "position", label: "Position", state: "UNOBSERVED", detail: `The Webull position read was refused (${b?.code ?? `HTTP ${read.httpStatus}`}) — flat is never assumed.`, tone: "refused" };
  }
  if (b.state !== "OBSERVED" && b.state !== "NO_POSITIONS") {
    return { key: "position", label: "Position", state: "UNOBSERVED", detail: `Webull positions read ${b.state ?? "UNKNOWN"} — flat is never assumed.`, tone: "quiet" };
  }
  const sym = symbol.trim().toUpperCase();
  // Webull names crypto ETHUSD where the chart says ETH-USD: compare the
  // letters and digits only, or a real holding would read as a false FLAT.
  const key = bookSymbolKey(sym);
  const mine = (b.positions ?? []).filter(p => bookSymbolKey(p.symbol) === key);
  if (mine.length === 0) {
    return { key: "position", label: "Position", state: "FLAT", detail: `Webull · ${b.accountsQueried ?? "?"} account(s) read at ${b.checkedAt ?? "—"}: no ${sym} position.`, tone: "set" };
  }
  const words = mine.map(p => p.option
    ? `${p.quantity} ${p.option.type} ${p.option.strike} ${p.option.expireDate}`
    : `${p.quantity > 0 ? "LONG" : "SHORT"} ${Math.abs(p.quantity)} @ ${p.costPrice}`);
  return { key: "position", label: "Position", state: mine.some(p => p.quantity < 0) ? "SHORT" : "LONG", detail: `Webull · ${words.join(" · ")} (as reported by the broker)`, tone: "set" };
}

export const ORDERS_ROW_WEBULL: BookRowVM = {
  key: "orders", label: "Orders", state: "UNOBSERVED",
  detail: "No Webull open-order read has been recorded yet — this deck cannot see working orders. Order preview exists; placement stays gated.",
  tone: "quiet",
};

/** An open-order read older than this is history, not the book. */
export const ORDERS_READ_FRESH_MS = 30 * 60_000;

const ageWords = (ms: number) => ms < 90_000 ? `${Math.max(1, Math.round(ms / 1000))}s` : `${Math.round(ms / 60_000)} min`;

/**
 * ORDERS from the keeper's reconciliation of every account's Webull open-order
 * list. NONE WORKING only when EVERY account answered and the read is fresh;
 * a partial read names the accounts that did not answer and never says none.
 * Open lists lag (GP12 §33) — the detail says so.
 */
export function ordersRowFromStatus(read: WebullStatusRead | null, nowMs: number = Date.now()): BookRowVM | null {
  const rec = read?.body?.sessionKeeper?.reconciliation;
  if (!read || !rec) return null;
  const age = nowMs - rec.atMs;
  if (!(age >= 0) || age > ORDERS_READ_FRESH_MS) {
    return { key: "orders", label: "Orders", state: "UNOBSERVED", detail: `The last Webull open-order read is ${ageWords(Math.max(0, age))} old — too old to stand for the book.`, tone: "quiet" };
  }
  if (rec.state === "OK") {
    const ext = rec.external > 0 ? ` · ${rec.external} placed outside WM` : "";
    const unres = rec.unresolved > 0 ? ` · ${rec.unresolved} WM submission(s) need an exact lookup` : "";
    return rec.openOrders === 0
      ? { key: "orders", label: "Orders", state: "NONE WORKING", detail: `Webull · all ${rec.accounts} accounts' open-order lists read ${ageWords(age)} ago: nothing working${unres}. Lists lag; placement stays gated.`, tone: "set" }
      : { key: "orders", label: "Orders", state: `${rec.openOrders} WORKING`, detail: `Webull · ${rec.openOrders} open order(s) across ${rec.accounts} accounts, read ${ageWords(age)} ago${ext}${unres}. Lists lag; placement stays gated.`, tone: "set" };
  }
  if (rec.state === "PARTIAL") {
    const missing = rec.unreadable?.length ? rec.unreadable.join(", ") : "some accounts";
    return { key: "orders", label: "Orders", state: "PARTIAL", detail: `Webull · ${rec.openOrders} open in the accounts that answered, ${ageWords(age)} ago; ${missing} did not answer — "none" is never concluded from a partial read.`, tone: "quiet" };
  }
  return { key: "orders", label: "Orders", state: "UNOBSERVED", detail: `The Webull open-order read ${rec.state}${rec.unreadable?.length ? ` (${rec.unreadable.join(", ")})` : ""} — working orders are not known.`, tone: "refused" };
}
