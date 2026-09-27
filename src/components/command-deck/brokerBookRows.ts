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
  const mine = (b.positions ?? []).filter(p => p.symbol === sym);
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
  detail: "No Webull open-order reader is wired — this deck cannot see working orders. Order preview exists; placement stays gated.",
  tone: "quiet",
};
