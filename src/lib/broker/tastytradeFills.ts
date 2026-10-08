/**
 * tastytrade TRADE TRANSACTIONS → fills the Journal can tell a story with
 * (Garden 18 §XC/§XCI). Field names are tastytrade's own transaction fields;
 * a fill keeps its broker id so a reload or replay can never count it twice.
 * PURE.
 */

export interface TtFill {
  readonly id: string;
  readonly orderId: string | null;
  readonly symbol: string | null;
  readonly instrumentType: string | null;
  readonly action: string | null;
  readonly quantity: number | null;
  readonly price: number | null;
  /** Net cash effect as tastytrade states it (value + value-effect). */
  readonly value: number | null;
  readonly fees: number;
  /** tastytrade's own after-fee cash effect ("net-value", signed by net-value-effect), when sent. */
  readonly netValue?: number | null;
  readonly executedAt: string | null;
  /** tastytrade sent at least one fee field on this transaction. False = fees UNREPORTED, not zero. */
  readonly feesReported?: boolean;
}

const n = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};
const s = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export function readTastytradeFill(raw: unknown): TtFill | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id || s(o["transaction-type"]) !== "Trade") return null;
  const effect = s(o["value-effect"]);
  const value = n(o.value);
  const fee = (k: string) => Math.abs(n(o[k]) ?? 0);
  return {
    id,
    orderId: o["order-id"] != null ? String(o["order-id"]) : null,
    symbol: s(o.symbol),
    instrumentType: s(o["instrument-type"]),
    action: s(o.action) ?? s(o["transaction-sub-type"]),
    quantity: n(o.quantity),
    price: n(o.price),
    value: value == null ? null : effect === "Debit" ? -Math.abs(value) : Math.abs(value),
    fees: fee("commission") + fee("clearing-fees") + fee("regulatory-fees") + fee("proprietary-index-option-fees"),
    netValue: (() => { const nv = n(o["net-value"]); if (nv == null) return null; return s(o["net-value-effect"]) === "Debit" ? -Math.abs(nv) : Math.abs(nv); })(),
    executedAt: s(o["executed-at"]),
    feesReported: ["commission", "clearing-fees", "regulatory-fees", "proprietary-index-option-fees"].some(k => n(o[k]) != null),
  };
}

/** Fills, deduped by broker id, oldest first. */
export function readTastytradeFills(raw: readonly unknown[]): TtFill[] {
  const seen = new Map<string, TtFill>();
  for (const r of raw) { const f = readTastytradeFill(r); if (f) seen.set(f.id, f); }
  return [...seen.values()].sort((a, b) => (a.executedAt ?? "").localeCompare(b.executedAt ?? ""));
}
