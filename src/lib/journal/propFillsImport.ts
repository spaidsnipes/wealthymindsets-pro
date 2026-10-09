/**
 * PROP-ACCOUNT FILLS, FROM A FILE THE TRADER EXPORTED (Garden 19 Supermax §8).
 *
 * TradeDay-type evaluation accounts trade through Tradovate / NinjaTrader /
 * Rithmic-class platforms. WM has no authorised connection to those accounts
 * and makes none here: nothing is scraped, no credential is asked for, and the
 * file never leaves the browser. The one supported path is the platform's own
 * export — Tradovate's Account Reports panel (Orders · Fills · Cash History ·
 * Performance, each with "Download CSV") — which the trader saves and opens
 * here. This module is the PURE owner that reads such a file.
 *
 * WHAT IS AND IS NOT KNOWN ABOUT THE FILE (public documentation only,
 * 2026-10-09). The export path above is documented. The exact column NAMES of
 * the Fills file are not published, and guides disagree on whether a fills /
 * orders export carries commissions (several say fees are only in Cash
 * History). So this reader assumes NO fixed layout: it finds each column by
 * name from a stated alias list, says which required column is missing when
 * one is, and treats a missing commission column as "commissions UNREPORTED",
 * never as zero. It is certified against synthetic files; a real export from
 * the Founder is still owed to confirm the names (Founder list).
 *
 * WHAT COMES OUT
 *   · fills in the Journal's broker-fill shape (`TtFill`), each with its
 *     provenance "imported file · <filename> · as of <time>";
 *   · a partial-sync disclosure whenever a row was skipped — how many, and why;
 *   · daily net results `{ date (ET), netCents }` for the prop-evaluation desk
 *     (`PropDay`), from FIFO round trips priced by the one contract-economics
 *     owner. A day's net is after commissions only when the file reported
 *     them; otherwise the result says it is BEFORE commissions.
 *
 * It never invents: an unreadable time, a contract with no point value on
 * file, a fill still open at the end of the file — each is counted and said.
 */
import type { TtFill } from "@/lib/broker/tastytradeFills";
import type { PropDay } from "@/lib/journal/propEvaluation";
import { instrumentEconomics } from "@/lib/marketData/contractEconomics";

/* ── CSV ──────────────────────────────────────────────────────────────── */

/** RFC 4180 rows: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF, a leading BOM. */
export function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== "")) rows.push(row);
  return rows;
}

/* ── columns ──────────────────────────────────────────────────────────── */

export type PropFillColumn = "time" | "date" | "contract" | "side" | "qty" | "price" | "commission" | "fillId" | "orderId" | "account";

/** Header names each column answers to (compared lower-case, punctuation and spaces removed). First match wins. */
export const PROP_FILL_COLUMN_ALIASES: Readonly<Record<PropFillColumn, readonly string[]>> = {
  time: ["timestamp", "filltime", "datetime", "time", "exectime", "executiontime", "filledtime", "tradetime"],
  date: ["date", "tradedate"],
  contract: ["contract", "symbol", "instrument"],
  side: ["bs", "side", "action", "buysell"],
  qty: ["quantity", "qty", "filledqty", "fillqty", "size"],
  price: ["price", "fillprice", "avgfillprice", "avgprice", "execprice"],
  commission: ["commission", "commissions", "fees", "fee", "comm"],
  fillId: ["fillid", "executionid", "execid", "tradeid", "id"],
  orderId: ["orderid"],
  account: ["account", "accountname", "accountid"],
};
export const PROP_FILL_REQUIRED: readonly PropFillColumn[] = ["time", "contract", "side", "qty", "price"];
const COLUMN_WORDS: Readonly<Record<PropFillColumn, string>> = {
  time: "the fill time", date: "the date", contract: "the contract", side: "buy or sell", qty: "the quantity", price: "the fill price",
  commission: "commission", fillId: "the fill id", orderId: "the order id", account: "the account",
};

const norm = (h: string) => h.toLowerCase().replace(/^_+/, "").replace(/[^a-z0-9]/g, "");

export type PropFillColumns = Readonly<Partial<Record<PropFillColumn, number>>>;

export function detectPropFillColumns(header: readonly string[]): { readonly ok: true; readonly columns: PropFillColumns } | { readonly ok: false; readonly missing: readonly PropFillColumn[]; readonly reason: string } {
  const names = header.map(norm);
  const columns: Partial<Record<PropFillColumn, number>> = {};
  for (const col of Object.keys(PROP_FILL_COLUMN_ALIASES) as PropFillColumn[]) {
    for (const alias of PROP_FILL_COLUMN_ALIASES[col]) {
      const at = names.indexOf(alias);
      if (at >= 0) { columns[col] = at; break; }
    }
  }
  const missing = PROP_FILL_REQUIRED.filter(c => columns[c] === undefined);
  if (missing.length) {
    return { ok: false, missing, reason: `This file has no column for ${missing.map(c => COLUMN_WORDS[c]).join(", ")}. Export the Fills report (Account Reports › Fills › Download CSV) and open that file.` };
  }
  return { ok: true, columns };
}

/* ── cells ────────────────────────────────────────────────────────────── */

const num = (raw: string | undefined): number | null => {
  const s = (raw ?? "").trim().replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (s === "" || !/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function readPropSide(raw: string | undefined): "Buy" | "Sell" | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "b" || s === "buy" || s === "bot" || s === "bought" || s === "long") return "Buy";
  if (s === "s" || s === "sell" || s === "sld" || s === "sold" || s === "short") return "Sell";
  return null;
}

/** Offset (ms) of `zone` from UTC at `utcMs`, from the platform's own tz data. */
function zoneOffsetMs(utcMs: number, zone: string): number | null {
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
    const g = (t: string) => Number(p.find(x => x.type === t)?.value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(utcMs / 1000) * 1000;
  } catch { return null; }
}

/**
 * A fill time → epoch ms. A time that names its own zone (ISO with Z or an
 * offset) is read as written. A wall-clock time ("10/09/2026 09:31:05",
 * "2026-10-09 09:31:05") is read in `wallClockZone` — the zone the export was
 * made in, which only the trader knows. No zone given → null (never guessed).
 */
export function readPropFillTime(raw: string, wallClockZone: string | null): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})$/i.test(s)) { const t = Date.parse(s); return Number.isFinite(t) ? t : null; }
  let y: number, mo: number, d: number, rest: string;
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T]?(.*)$/.exec(s);
  if (m) { y = +m[1]!; mo = +m[2]!; d = +m[3]!; rest = m[4]!; }
  else {
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]*(.*)$/.exec(s);
    if (!m) return null;
    mo = +m[1]!; d = +m[2]!; y = +m[3]!; rest = m[4]!;
  }
  const tm = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*([AaPp][Mm])?$/.exec(rest.trim());
  if (!tm) return null;
  let h = +tm[1]!;
  const mi = +tm[2]!, sec = tm[3] ? +tm[3] : 0, ap = tm[4]?.toLowerCase();
  if (ap) { if (h < 1 || h > 12) return null; h = (h % 12) + (ap === "pm" ? 12 : 0); }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || sec > 59) return null;
  if (!wallClockZone) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi, sec);
  if (new Date(wall).getUTCDate() !== d) return null;                      // 02/31 and the like
  let utc = wall;
  for (let i = 0; i < 3; i++) { const off = zoneOffsetMs(utc, wallClockZone); if (off === null) return null; utc = wall - off; }
  return utc;
}

/* ── the import ───────────────────────────────────────────────────────── */

export type PropSkipReason = "NO_TIME" | "NO_CONTRACT" | "NO_SIDE" | "NO_QUANTITY" | "NO_PRICE" | "DUPLICATE";
const SKIP_WORDS: Readonly<Record<PropSkipReason, string>> = {
  NO_TIME: "a time that could not be read",
  NO_CONTRACT: "no contract",
  NO_SIDE: "no buy / sell",
  NO_QUANTITY: "no quantity",
  NO_PRICE: "no fill price",
  DUPLICATE: "the same fill id as an earlier row",
};

export interface PropImportedFill extends TtFill {
  readonly source: "IMPORTED_FILE";
  readonly action: "Buy" | "Sell";
  readonly symbol: string;
  readonly quantity: number;
  readonly price: number;
  readonly executedAt: string;
  /** The account column's value, when the file has one (shown, never used as a credential). */
  readonly account: string | null;
  /** "imported file · <filename> · as of <time>". */
  readonly provenance: string;
}

export interface PropFillsImport {
  readonly ok: true;
  readonly fileName: string;
  /** "imported file · <filename> · as of <time>" — the same line every fill carries. */
  readonly provenance: string;
  readonly fills: readonly PropImportedFill[];
  readonly rowsInFile: number;
  readonly skipped: readonly { readonly line: number; readonly reason: PropSkipReason }[];
  /** Null when every row was read; otherwise how many were skipped and why (partial sync, said). */
  readonly disclosure: string | null;
  /** False when the file has no commission column: commissions are UNREPORTED, never zero. */
  readonly commissionsReported: boolean;
  readonly accounts: readonly string[];
}
export type PropFillsImportResult = PropFillsImport | { readonly ok: false; readonly reason: string };

const cleanName = (n: string) => (n.split(/[\\/]/).pop() ?? n).replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80) || "unnamed file";
const asOfWords = (ms: number, zone: string) => {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(ms)); }
  catch { return new Date(ms).toISOString(); }
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface PropImportOptions {
  readonly fileName: string;
  /** When the file was opened here (the "as of" of the provenance line). */
  readonly nowMs: number;
  /** IANA zone the export's wall-clock times are in (e.g. "America/Chicago"). Needed only when times carry no zone. */
  readonly wallClockZone?: string | null;
  /** Zone the "as of" time is worded in (default America/New_York). */
  readonly displayZone?: string;
}

export function importPropFills(text: string, opts: PropImportOptions): PropFillsImportResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { ok: false, reason: "This file has no rows to read." };
  const det = detectPropFillColumns(rows[0]!);
  if (!det.ok) return { ok: false, reason: det.reason };
  const c = det.columns;
  const fileName = cleanName(opts.fileName);
  const provenance = `imported file · ${fileName} · as of ${asOfWords(opts.nowMs, opts.displayZone ?? "America/New_York")}`;
  const zone = opts.wallClockZone ?? null;

  const fills: PropImportedFill[] = [];
  const skipped: { line: number; reason: PropSkipReason }[] = [];
  const seen = new Set<string>();
  let zonelessUnread = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const cell = (k: PropFillColumn) => (c[k] === undefined ? undefined : row[c[k]!]);
    const line = r + 1;
    const skip = (reason: PropSkipReason) => { skipped.push({ line, reason }); };
    const timeRaw = (cell("time") ?? "").trim();
    // A time-only cell beside a separate date column is joined; a full timestamp stands alone.
    const stamp = timeRaw && !/\d[/-]\d/.test(timeRaw) && cell("date") ? `${(cell("date") ?? "").trim()} ${timeRaw}` : timeRaw;
    const at = readPropFillTime(stamp, zone);
    if (at === null) { if (stamp && zone === null && readPropFillTime(stamp, "UTC") !== null) zonelessUnread += 1; skip("NO_TIME"); continue; }
    const symbol = (cell("contract") ?? "").trim().toUpperCase();
    if (!symbol) { skip("NO_CONTRACT"); continue; }
    const action = readPropSide(cell("side"));
    if (!action) { skip("NO_SIDE"); continue; }
    const qty = num(cell("qty"));
    if (qty === null || qty <= 0) { skip("NO_QUANTITY"); continue; }
    const price = num(cell("price"));
    if (price === null || price <= 0) { skip("NO_PRICE"); continue; }
    const fillId = (cell("fillId") ?? "").trim();
    const id = fillId ? `import:${fillId}` : `import:${fileName}:${line}`;
    if (seen.has(id)) { skip("DUPLICATE"); continue; }
    seen.add(id);
    const comm = c.commission === undefined ? null : num(cell("commission"));
    fills.push({
      id, orderId: (cell("orderId") ?? "").trim() || null, symbol, instrumentType: "Future", action, quantity: qty, price,
      value: null, fees: comm === null ? 0 : Math.abs(comm), feesReported: comm !== null,
      executedAt: new Date(at).toISOString(), source: "IMPORTED_FILE", account: (cell("account") ?? "").trim() || null, provenance,
    });
  }
  // Every row unreadable for the same reason — no zone — is one plain refusal, not a file of skips.
  if (fills.length === 0 && zonelessUnread > 0) {
    return { ok: false, reason: "This file's times carry no time zone. Say which zone the export was made in (the platform's display zone) and open it again." };
  }
  if (fills.length === 0) return { ok: false, reason: `None of the ${plural(rows.length - 1, "row", "rows")} in this file could be read as a fill.` };
  fills.sort((a, b) => (a.executedAt < b.executedAt ? -1 : a.executedAt > b.executedAt ? 1 : 0));

  const by = new Map<PropSkipReason, number>();
  for (const s of skipped) by.set(s.reason, (by.get(s.reason) ?? 0) + 1);
  const total = rows.length - 1;
  const disclosure = skipped.length === 0 ? null
    : `PARTIAL: read ${fills.length} of ${plural(total, "row", "rows")}. Skipped ${skipped.length}: ${[...by.entries()].map(([k, n]) => `${n} with ${SKIP_WORDS[k]}`).join(", ")}.`;
  return {
    ok: true, fileName, provenance, fills, rowsInFile: total, skipped, disclosure,
    commissionsReported: c.commission !== undefined && fills.some(f => f.feesReported === true),
    accounts: [...new Set(fills.map(f => f.account).filter((a): a is string => !!a))],
  };
}

/* ── daily net results for the prop-evaluation desk ───────────────────── */

export type PropDayRule = "ET_CALENDAR_DAY" | "CME_TRADING_DAY";
export const PROP_DAY_RULE_WORDS: Readonly<Record<PropDayRule, string>> = {
  ET_CALENDAR_DAY: "each round trip is counted on the Eastern calendar date it closed",
  CME_TRADING_DAY: "each round trip is counted on the CME trading day it closed in (a new day starts at 6:00 PM ET)",
};

const etParts = (ms: number) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit" }).formatToParts(new Date(ms));
  const g = (t: string) => p.find(x => x.type === t)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")) };
};
/** The day a fill belongs to, as YYYY-MM-DD in Eastern time, under the stated rule. */
export function propDayOf(executedAt: string, rule: PropDayRule): string {
  const ms = Date.parse(executedAt);
  const et = etParts(ms);
  if (rule === "ET_CALENDAR_DAY" || et.hour < 18) return et.date;
  return etParts(ms + 12 * 3_600_000).date;                                 // 6 PM ET or later → the next trading day
}

const pointValueOf = (symbol: string): number | null => {
  for (const s of [symbol.startsWith("/") ? symbol : `/${symbol}`, symbol]) {
    const e = instrumentEconomics(s, null);
    if (e.status === "PRICED" && e.unit === "contract") return e.pointValue;
  }
  return null;
};

export interface PropDailyResults {
  /** `{ date (ET, YYYY-MM-DD), netCents }`, oldest first — the prop-evaluation desk's `PropDay`. */
  readonly days: readonly PropDay[];
  readonly dayRule: PropDayRule;
  /** "AFTER_COMMISSIONS" only when every counted fill reported its commission. */
  readonly basis: "AFTER_COMMISSIONS" | "BEFORE_COMMISSIONS";
  readonly roundTrips: number;
  /** Contracts still open at the end of the file, per contract — in no day's result. */
  readonly openAtEnd: readonly { readonly symbol: string; readonly account: string | null; readonly quantity: number; readonly side: "LONG" | "SHORT" }[];
  /** Contracts with no point value on file — their fills are in no day's result. */
  readonly unpriced: readonly string[];
  /** Everything a reader must know before trusting the list; empty = nothing to add. */
  readonly notes: readonly string[];
  readonly provenance: string;
}

/**
 * FIFO round trips per account and contract → net per day. Money is in whole
 * cents from the start (price × point value is rounded once per matched lot).
 */
export function propDailyResults(imp: PropFillsImport, rule: PropDayRule = "ET_CALENDAR_DAY"): PropDailyResults {
  const cents = new Map<string, number>();
  const add = (day: string, c: number) => cents.set(day, (cents.get(day) ?? 0) + c);
  const lots = new Map<string, { qty: number; price: number; side: "Buy" | "Sell" }[]>();
  const unpriced = new Set<string>();
  let roundTrips = 0;
  let allFeesReported = true;
  for (const f of imp.fills) {
    const pv = pointValueOf(f.symbol);
    if (pv === null) { unpriced.add(f.symbol); continue; }
    if (f.feesReported !== true) allFeesReported = false;
    const day = propDayOf(f.executedAt, rule);
    if (f.feesReported === true && f.fees > 0) add(day, -Math.round(f.fees * 100));
    else if (!cents.has(day)) cents.set(day, cents.get(day) ?? 0);
    const key = `${f.account ?? ""}|${f.symbol}`;
    const book = lots.get(key) ?? [];
    lots.set(key, book);
    let left = f.quantity;
    while (left > 0 && book.length && book[0]!.side !== f.action) {
      const open = book[0]!;
      const q = Math.min(left, open.qty);
      const perUnit = f.action === "Sell" ? f.price - open.price : open.price - f.price;
      add(day, Math.round(perUnit * pv * q * 100));
      roundTrips += 1;
      open.qty -= q; left -= q;
      if (open.qty <= 0) book.shift();
    }
    if (left > 0) book.push({ qty: left, price: f.price, side: f.action });
  }
  const openAtEnd = [...lots.entries()].flatMap(([key, book]) => {
    const q = book.reduce((n, l) => n + l.qty, 0);
    if (q <= 0) return [];
    const [account, symbol] = key.split("|") as [string, string];
    return [{ symbol, account: account || null, quantity: q, side: book[0]!.side === "Buy" ? ("LONG" as const) : ("SHORT" as const) }];
  });
  const basis = allFeesReported && imp.commissionsReported ? "AFTER_COMMISSIONS" : "BEFORE_COMMISSIONS";
  const notes: string[] = [`Day rule: ${PROP_DAY_RULE_WORDS[rule]}.`];
  if (basis === "BEFORE_COMMISSIONS") notes.push("Commissions are UNREPORTED in this file, so each day is BEFORE commissions — the firm's own figure will be lower. (Tradovate's Cash History export carries fees.)");
  if (imp.disclosure) notes.push(imp.disclosure);
  if (openAtEnd.length) notes.push(`Still open at the end of the file, in no day's result: ${openAtEnd.map(o => `${o.quantity} ${o.symbol} ${o.side.toLowerCase()}`).join(", ")}.`);
  if (unpriced.size) notes.push(`No point value on file for ${[...unpriced].join(", ")} — those fills are in no day's result.`);
  notes.push("Computed from the file's fills by first-in-first-out matching. It is not the firm's statement — read the result back against the firm's dashboard.");
  return {
    days: [...cents.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([date, netCents]) => ({ date, netCents })),
    dayRule: rule, basis, roundTrips, openAtEnd, unpriced: [...unpriced], notes, provenance: imp.provenance,
  };
}
